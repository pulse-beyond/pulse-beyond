import type { AIProvider, UpcomingEvent } from "./provider";
import type { GenerateSectionInput, GeneratedDraft } from "@/types";

/**
 * Mock AI provider calibrated to Roberto's Snapshot newsletter style.
 *
 * Style profile (extracted from past issues):
 * - Titles: short, punchy, often provocative questions or colloquial phrases
 *   e.g. "Sony turns off the TV", "Markets alone will not solve for mosquitoes"
 * - "Why it matters": analytical, macro perspective (geopolitics, economics, tech).
 *   References concrete data. Written for an executive/investor audience.
 *   Connects specific news to broader systemic trends.
 * - "My thoughts on it": deeply personal, first person. References own experiences,
 *   travels, conversations with policymakers. Often ends with provocative questions
 *   to the reader. Slightly opinionated but grounded.
 * - No em dashes (use commas or periods instead).
 * - No bullet lists inside sections.
 * - Conversational but intellectually rigorous.
 */
export class MockAIProvider implements AIProvider {
  async generateSection(input: GenerateSectionInput): Promise<GeneratedDraft> {
    const topic = input.metaTitle || extractDomain(input.url);
    const desc = input.metaDescription || "";
    const domain = extractDomain(input.url);
    const tone = input.toneNote || "";
    const hash = simpleHash(input.url);

    // --- TITLES: short, punchy, provocative ---
    const titleSets: string[][] = [
      [
        `${shorten(topic)} and what it really means`,
        `The signal behind ${shorten(topic)}`,
        `Why ${shorten(topic)} matters more than you think`,
        `${shorten(topic)}: connect the dots`,
        `${shorten(topic)}, a closer look`,
      ],
      [
        `${shorten(topic)}: read between the lines`,
        `Is ${shorten(topic)} the real story?`,
        `What ${shorten(topic)} tells us about the future`,
        `${shorten(topic)} changes the equation`,
        `The bigger picture behind ${shorten(topic)}`,
      ],
      [
        `${shorten(topic)}: who wins, who loses?`,
        `Why everyone is watching ${shorten(topic)}`,
        `${shorten(topic)} is not what you think`,
        `The quiet shift in ${shorten(topic)}`,
        `${shorten(topic)}: what comes next?`,
      ],
    ];
    const titles = titleSets[hash % titleSets.length];

    // --- WHY IT MATTERS: analytical, macro, data-aware ---
    const whyItMattersVariants = [
      desc
        ? `${truncate(desc, 150)}. This is not an isolated event. It reflects a deeper structural shift that has been building for years. When you trace the implications forward, the picture gets both more complex and more consequential. The question is no longer whether this will affect the broader landscape, but how fast and how deep the impact will be.`
        : `${topic} points to a pattern that most people are not yet connecting. At the surface, it looks like a single development. But look at the context: industries are repositioning, capital is moving, and the rules of the game are being rewritten. This is one of those signals that, in hindsight, we will recognize as a turning point. Governments and companies that pay attention now will be better positioned in the years ahead.`,

      desc
        ? `Here is the key context: ${truncate(desc, 120)}. But this goes deeper than the headline suggests. It touches on how decisions are being made at the highest levels, and the ripple effects reach far beyond the obvious stakeholders. In a world where technology, geopolitics, and economics are converging faster than ever, developments like this one reshape entire sectors.`
        : `What makes ${topic} stand out is the timing. This is happening precisely when the global landscape is being reconfigured, from supply chains to regulatory frameworks to capital allocation. The players who read this correctly and move early will have a significant advantage. The rest will be playing catch-up, and in today's world, catching up is harder than ever.`,

      desc
        ? `${truncate(desc, 130)}. That alone is noteworthy. But the real insight is what this tells us about broader trends. We are seeing a convergence of forces, technological, economic, and political, that makes this development far more significant than it might appear at first glance. The implications extend well beyond ${domain} and the immediate sector.`
        : `${topic} is the kind of development that looks contained today but could define how we talk about this space in 12 months. The fundamentals are shifting, and the signals have been building. Countries, companies, and investors who recognize what is happening here early will be the ones shaping the next chapter, not reacting to it.`,
    ];
    const whyItMatters = whyItMattersVariants[hash % whyItMattersVariants.length];

    // --- MY THOUGHTS: personal, 1st person, experiential, ends with questions ---
    let myThoughts: string;

    if (tone && input.audioTranscript) {
      myThoughts = `I have been thinking about this one all week. My initial reaction was: ${tone.toLowerCase()}. After sitting with it longer and recording my thoughts, I landed somewhere more nuanced. This is not a black-and-white situation. What I find most interesting is the second-order effect, the part that is not in the headlines. I have seen similar dynamics play out before in different contexts, and the lesson is almost always the same: the real impact takes longer to materialize than people expect, but when it does, it is bigger than anyone predicted. What do you think? Am I reading this right, or am I missing something?`;
    } else if (tone) {
      myThoughts = `My honest take on this one: ${tone.toLowerCase()}. I know that might sound like a strong position, but look at what is actually happening here. I have had conversations with people close to this space, and the sentiment behind closed doors is quite different from what you read in the press. There is a pattern forming, and once you see it, you cannot unsee it. The question I keep coming back to is not whether this matters, but who is positioned to act on it. And more importantly: are we, in our own contexts, paying enough attention?`;
    } else if (input.audioTranscript) {
      myThoughts = `I recorded a voice note about this one because it stayed on my mind longer than expected. There is something here that feels different from the usual noise. In my experience, the developments that truly matter are often the ones that do not make the biggest headlines. This feels like one of those. I keep asking myself: who benefits most from this, and is the current narrative capturing the real story? I am not sure it is. If you have a different read, I would love to hear it.`;
    } else {
      const thoughtVariants = [
        `I find ${shorten(topic)} genuinely worth paying attention to. Not because of the headline itself, but because of what it reveals about where things are heading. I have seen these dynamics before, in different industries and different geographies, and the playbook is becoming familiar. What changes is the speed. Everything is accelerating, and the gap between those who see the signals early and those who react late is widening. In my view, this is one of those moments where stepping back and connecting the dots matters more than chasing the next update. So the question I would leave you with is: what does this mean for your own context? And are you moving fast enough?`,
        `I have been watching developments around ${shorten(topic)} for a while now. What caught my attention this time is not the announcement itself, but what it tells us about the broader direction. There is a convergence happening between technology, policy, and capital that is reshaping the rules of the game. I have had the chance to discuss this with people in different regions, and the perspectives vary enormously, which tells me we are still in the early stages of understanding what is truly at play. The real question is not what happened, but what comes next. And whether we are prepared for it.`,
        `Here is what I think most people will miss about ${shorten(topic)}: it is not really about the surface-level story. It is about the structural forces underneath. When you look at the data, when you talk to people on the ground, a different picture emerges. I have always believed that the most important developments are the ones that seem small or distant at first but end up reshaping entire industries. This has that quality. I am curious to see how this plays out by the end of the year. What is your read on this?`,
      ];
      myThoughts = thoughtVariants[hash % thoughtVariants.length];
    }

    return {
      titleOptions: titles,
      whyItMatters,
      myThoughts,
    };
  }

  async generateEventDescription(event: {
    title: string;
    date: string;
    location: string;
  }): Promise<string> {
    const hash = simpleHash(event.title);
    const variants = [
      `Will we see any concrete signals emerging from ${event.title}? And if so, who stands to gain the most?`,
      `What conversations are happening behind closed doors at ${event.title} in ${event.location}? This one is worth watching closely.`,
      `${event.title} could set the tone for the months ahead. The real question: will anything genuinely new emerge, or is it more of the same?`,
    ];
    return variants[hash % variants.length];
  }

  async generateUpcomingEvents(input: {
    weekStartDate: string;
    weekEndDate: string;
    calendarContext?: string;
  }): Promise<UpcomingEvent[]> {
    return [
      {
        title: "G20 Finance Ministers Meeting",
        date: input.weekStartDate,
        location: "Brussels, Belgium",
        description: "Will the world's largest economies find common ground on digital taxation? Or are we heading for a fragmented financial landscape?",
      },
      {
        title: "EU-China Trade Summit",
        date: input.weekStartDate,
        location: "Beijing, China",
        description: "Can Europe maintain its balancing act between economic engagement and strategic autonomy?",
      },
      {
        title: "Federal Reserve Interest Rate Decision",
        date: input.weekEndDate,
        location: "Washington, D.C.",
        description: "Will the Fed surprise markets again? The signals are mixed, and the stakes have never been higher.",
      },
    ];
  }
}

/** Extract domain name from URL, capitalized */
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const name = hostname.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "this development";
  }
}

/** Shorten a topic string to keep titles punchy */
function shorten(str: string): string {
  if (str.length <= 50) return str;
  // Try to cut at a natural word boundary
  const cut = str.slice(0, 50).lastIndexOf(" ");
  return cut > 20 ? str.slice(0, cut) : str.slice(0, 50);
}

/** Simple deterministic hash from string */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Truncate text to max length */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + "...";
}
