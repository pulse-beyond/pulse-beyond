import fs from "fs";
import path from "path";

interface ArchiveSection {
  issueDate: string;
  title: string;
  whyItMatters: string;
  myThoughts: string;
}

interface ArchiveIssue {
  date: string;
  sections: ArchiveSection[];
  events: string;
}

let cachedIssues: ArchiveIssue[] | null = null;

/** Parse the full archive text into structured issues */
function parseArchive(): ArchiveIssue[] {
  if (cachedIssues) return cachedIssues;

  const archivePath = path.join(process.cwd(), "data", "snapshot-archive.txt");
  if (!fs.existsSync(archivePath)) {
    console.warn("Archive file not found at", archivePath);
    return [];
  }

  const text = fs.readFileSync(archivePath, "utf-8");

  // Split by issue headers
  const issueChunks = text.split(/(?=Weekly Snapshot - )/);
  const issues: ArchiveIssue[] = [];

  for (const chunk of issueChunks) {
    const dateMatch = chunk.match(/Weekly Snapshot - (.+?)[\n\r]/);
    if (!dateMatch) continue;

    const issueDate = dateMatch[1].trim();

    // Remove page break markers
    const cleaned = chunk.replace(/----+Page \(\d+\) Break----+/g, "");

    // Extract sections by looking for title patterns followed by "↳ Why it matters"
    const sectionRegex =
      /\s+(.+?)\s*\n↳ Why it matters\s*\n([\s\S]*?)(?=↳ My thoughts on it)/g;
    const thoughtsRegex = /↳ My thoughts on it\s*\n([\s\S]*?)(?=\s+\S+.*\n↳ Why it matters|\s*To Keep An Eye On|You can read more|$)/g;

    // Simpler approach: split by section titles
    const sections: ArchiveSection[] = [];

    // Find all "↳ Why it matters" positions
    const whyPositions: number[] = [];
    const whyRegex = /↳ Why it matters/g;
    let m;
    while ((m = whyRegex.exec(cleaned)) !== null) {
      whyPositions.push(m.index);
    }

    // Find all "↳ My thoughts on it" positions
    const thoughtPositions: number[] = [];
    const thoughtRegex = /↳ My thoughts on it/g;
    while ((m = thoughtRegex.exec(cleaned)) !== null) {
      thoughtPositions.push(m.index);
    }

    // Find "To Keep An Eye On" position
    const eventsPos = cleaned.indexOf("To Keep An Eye On");
    const eventsEnd = cleaned.indexOf("You can read more");

    for (let i = 0; i < whyPositions.length; i++) {
      const whyStart = whyPositions[i];
      const thoughtStart = thoughtPositions[i];

      if (thoughtStart === undefined) continue;

      // Extract title: look backwards from whyStart for the title line
      const beforeWhy = cleaned.substring(
        i === 0 ? 0 : (thoughtPositions[i - 1] || 0),
        whyStart
      );
      const titleLines = beforeWhy.trim().split("\n");
      const title = titleLines[titleLines.length - 1]?.trim() || "Untitled";

      // Extract "Why it matters" content
      const whyEnd = thoughtStart;
      const whyContent = cleaned
        .substring(whyStart + "↳ Why it matters".length, whyEnd)
        .trim();

      // Extract "My thoughts" content
      const nextBoundary =
        whyPositions[i + 1] ||
        (eventsPos > -1 ? eventsPos : cleaned.length);
      const thoughtContent = cleaned
        .substring(thoughtStart + "↳ My thoughts on it".length, nextBoundary)
        .trim();

      sections.push({
        issueDate: issueDate,
        title,
        whyItMatters: whyContent.substring(0, 500), // Keep compact
        myThoughts: thoughtContent.substring(0, 500),
      });
    }

    // Extract events section
    let events = "";
    if (eventsPos > -1) {
      const evEnd = eventsEnd > -1 ? eventsEnd : cleaned.length;
      events = cleaned
        .substring(eventsPos + "To Keep An Eye On".length, evEnd)
        .trim();
    }

    if (sections.length > 0) {
      issues.push({ date: issueDate, sections, events });
    }
  }

  cachedIssues = issues;
  return issues;
}

/**
 * Search the archive for sections related to a given topic.
 * Uses simple keyword matching - extracts keywords from the article title/description
 * and finds past sections that share significant keyword overlap.
 *
 * Returns formatted context string ready to inject into the AI prompt.
 * Max ~3000 chars to keep token usage reasonable.
 */
export function searchArchive(input: {
  metaTitle?: string;
  metaDescription?: string;
  url: string;
}): string {
  const issues = parseArchive();
  if (issues.length === 0) return "";

  // Extract keywords from current article
  const sourceText = [
    input.metaTitle || "",
    input.metaDescription || "",
    input.url,
  ]
    .join(" ")
    .toLowerCase();

  // Build keyword set (filter out common words)
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "but", "and", "or", "if", "that", "this", "these", "those", "what",
    "which", "who", "whom", "it", "its", "they", "them", "their", "we",
    "our", "you", "your", "he", "she", "him", "her", "his",
    "https", "http", "com", "www", "html", "news", "article",
  ]);

  const keywords = sourceText
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const uniqueKeywords = Array.from(new Set(keywords));
  if (uniqueKeywords.length === 0) return "";

  // Score each past section by keyword overlap
  const scored: { section: ArchiveSection; score: number }[] = [];

  for (const issue of issues) {
    for (const section of issue.sections) {
      const sectionText = [
        section.title,
        section.whyItMatters,
        section.myThoughts,
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      for (const kw of uniqueKeywords) {
        if (sectionText.includes(kw)) {
          score++;
          // Bonus for title match
          if (section.title.toLowerCase().includes(kw)) {
            score += 2;
          }
        }
      }

      // Normalize by number of keywords to avoid bias toward long keyword lists
      const normalizedScore = score / uniqueKeywords.length;

      if (normalizedScore > 0.15) {
        scored.push({ section, score: normalizedScore });
      }
    }
  }

  if (scored.length === 0) return "";

  // Sort by score descending, take top 3
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  // Format context
  let context = "RELEVANT PAST SNAPSHOT EDITIONS (for internal context only, do NOT mention these editions explicitly):\n\n";

  for (const { section } of top) {
    context += `--- ${section.issueDate}: "${section.title}" ---\n`;
    context += `Why it matters: ${section.whyItMatters.substring(0, 300)}...\n`;
    context += `My thoughts: ${section.myThoughts.substring(0, 300)}...\n\n`;
  }

  // Cap total length
  if (context.length > 3000) {
    context = context.substring(0, 3000) + "\n[...truncated]";
  }

  return context;
}

/**
 * Get a compact summary of all topics covered across all issues.
 * Useful for the system prompt to give a birds-eye view.
 */
export function getArchiveTopicIndex(): string {
  const issues = parseArchive();
  if (issues.length === 0) return "";

  const lines: string[] = [];
  for (const issue of issues.slice(0, 30)) {
    // Last 30 issues
    const titles = issue.sections.map((s) => `"${s.title}"`).join(", ");
    lines.push(`${issue.date}: ${titles}`);
  }

  return "RECENT SNAPSHOT TOPICS (last 30 issues):\n" + lines.join("\n");
}
