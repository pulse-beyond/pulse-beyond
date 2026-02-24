import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { FeedFilters } from "@/components/brain-dump/feed-filters";

export const metadata: Metadata = {
  title: "Brain Dump | Pulse Beyond",
  description: "Curated articles to inspire your next newsletter issue",
};

const PLACEHOLDER_ARTICLES = [
  {
    source: "Financial Times",
    topic: "Finance",
    title: "Global markets brace for Fed pivot as inflation data surprises",
    excerpt:
      "Investors recalibrate portfolios as central bank signals shift stance on interest rates amid cooling price pressures.",
    url: "#",
    publishedAt: "2h ago",
    readingTime: "4 min read",
  },
  {
    source: "Bloomberg",
    topic: "Finance",
    title: "Private equity faces reckoning as exit markets remain frozen",
    excerpt:
      "Buyout firms sitting on record unrealized gains struggle to return capital to LPs in a subdued IPO environment.",
    url: "#",
    publishedAt: "3h ago",
    readingTime: "5 min read",
  },
  {
    source: "The Economist",
    topic: "Business",
    title: "The age of corporate concentration and what comes next",
    excerpt:
      "Winner-take-most dynamics are reshaping industries from cloud to retail. But is the consolidation wave cresting?",
    url: "#",
    publishedAt: "5h ago",
    readingTime: "6 min read",
  },
  {
    source: "Axios",
    topic: "Business",
    title: "Boardrooms double down on AI investments despite uncertain ROI",
    excerpt:
      "C-suite surveys reveal growing pressure to deploy AI tools even as executives admit unclear productivity gains.",
    url: "#",
    publishedAt: "6h ago",
    readingTime: "3 min read",
  },
  {
    source: "HBR",
    topic: "Leadership",
    title: "Why the next generation of leaders is rejecting the corner office",
    excerpt:
      "A new study finds that Gen Z and millennial managers increasingly prioritize autonomy and purpose over traditional status markers.",
    url: "#",
    publishedAt: "4h ago",
    readingTime: "7 min read",
  },
  {
    source: "HBR",
    topic: "Leadership",
    title: "The hidden cost of always-on leadership culture",
    excerpt:
      "Organizations that glorify hustle are paying a steep price in executive burnout and strategic decision-making quality.",
    url: "#",
    publishedAt: "1d ago",
    readingTime: "5 min read",
  },
  {
    source: "MIT Tech Review",
    topic: "Tech",
    title: "AI agents are here — and enterprises aren't ready",
    excerpt:
      "Autonomous AI systems are moving from demos to deployment, exposing gaps in governance frameworks and IT infrastructure.",
    url: "#",
    publishedAt: "1h ago",
    readingTime: "6 min read",
  },
  {
    source: "MIT Tech Review",
    topic: "Tech",
    title: "The geopolitics of semiconductor supply chains",
    excerpt:
      "Nations are treating chip access as a strategic imperative. Here's how the new industrial policy is reshaping the tech landscape.",
    url: "#",
    publishedAt: "8h ago",
    readingTime: "8 min read",
  },
  {
    source: "Bloomberg",
    topic: "Business",
    title: "Supply chain resilience is becoming a competitive moat",
    excerpt:
      "Companies that invested in redundant sourcing networks are now outperforming peers as disruptions become the norm.",
    url: "#",
    publishedAt: "4h ago",
    readingTime: "4 min read",
  },
  {
    source: "Financial Times",
    topic: "Leadership",
    title: "Succession planning in the era of activist investors",
    excerpt:
      "Boards face new pressure to identify and develop internal talent pipelines as external searches draw scrutiny.",
    url: "#",
    publishedAt: "7h ago",
    readingTime: "5 min read",
  },
  {
    source: "Axios",
    topic: "Tech",
    title: "The race to build AI-native enterprise software",
    excerpt:
      "A new wave of startups is rebuilding core business tools from scratch with AI at the center — threatening legacy SaaS incumbents.",
    url: "#",
    publishedAt: "2h ago",
    readingTime: "3 min read",
  },
  {
    source: "The Economist",
    topic: "Finance",
    title: "Central banks and the debt trap they cannot escape",
    excerpt:
      "High government debt levels are constraining monetary policy options, leaving policymakers with few good choices.",
    url: "#",
    publishedAt: "10h ago",
    readingTime: "6 min read",
  },
];

export default function BrainDumpPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mt-0.5">
          <Lightbulb className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Brain Dump</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Curated articles to inspire your next issue. Star the ones that spark ideas.
          </p>
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Coming soon:</strong> This feed will be automatically refreshed with articles from Financial Times, Bloomberg, HBR, MIT Tech Review, The Economist, and Axios. For now, articles below are illustrative examples.
      </div>

      {/* Filters + Feed */}
      <FeedFilters articles={PLACEHOLDER_ARTICLES} />
    </div>
  );
}
