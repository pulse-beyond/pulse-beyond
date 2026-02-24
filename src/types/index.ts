// Generated section content structure for a main article section
export interface MainSectionContent {
  titleOptions: string[]; // 3-5 title variations
  whyItMatters: string;
  myThoughts: string;
  selectedTitle?: string; // User-chosen title from options, or "__custom__" for custom
  customTitle?: string; // User-written custom title
}

// Content structure for the events section
export interface EventsSectionContent {
  events: {
    title: string;
    date: string;
    location: string;
    description: string; // Provocative questions
  }[];
}

// Content structure for the "Read more here" section
export interface ReadMoreContent {
  links: {
    label: string;
    url: string;
    shortUrl?: string;
  }[];
}

// Input for AI generation of a main section
export interface GenerateSectionInput {
  url: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  toneNote?: string | null;
  audioTranscript?: string | null;
  archiveContext?: string | null; // Relevant past editions for context
}

// The full generated draft for one link
export interface GeneratedDraft {
  titleOptions: string[];
  whyItMatters: string;
  myThoughts: string;
}

// Workflow step identifiers
export type WorkflowStep =
  | "links"
  | "select"
  | "generate"
  | "events"
  | "shorten"
  | "export"
  | "image";

export const WORKFLOW_STEPS: { key: WorkflowStep; label: string }[] = [
  { key: "links", label: "Add Links" },
  { key: "select", label: "Select 3" },
  { key: "generate", label: "Generate Draft" },
  { key: "events", label: "Events" },
  { key: "shorten", label: "Shorten Links" },
  { key: "export", label: "Export" },
  { key: "image", label: "Image" },
];

// Analytics — post performance data shape
export interface PostAnalytic {
  date: string;
  title: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  topic?: string;
}
