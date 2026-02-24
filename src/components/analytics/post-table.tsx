import { PostAnalytic } from "@/types";
import { Badge } from "@/components/ui/badge";

const PLACEHOLDER_DATA: PostAnalytic[] = [
  {
    date: "Feb 16, 2025",
    title: "The Concentration Game: Why markets are betting on fewer, bigger winners",
    impressions: 5240,
    likes: 198,
    comments: 41,
    shares: 22,
    engagementRate: 4.9,
    topic: "Finance",
  },
  {
    date: "Feb 09, 2025",
    title: "The Disruption Dilemma: When innovation threatens the innovators",
    impressions: 4180,
    likes: 162,
    comments: 34,
    shares: 17,
    engagementRate: 4.1,
    topic: "Tech",
  },
  {
    date: "Feb 02, 2025",
    title: "Capital in Retreat: How rising rates are reshaping private equity",
    impressions: 3920,
    likes: 145,
    comments: 28,
    shares: 12,
    engagementRate: 3.7,
    topic: "Finance",
  },
  {
    date: "Jan 26, 2025",
    title: "The Leadership Vacuum: Why organizations struggle to find their next generation",
    impressions: 4610,
    likes: 178,
    comments: 47,
    shares: 19,
    engagementRate: 4.4,
    topic: "Leadership",
  },
  {
    date: "Jan 19, 2025",
    title: "Decoding the AI Premium: Are valuations justified?",
    impressions: 6120,
    likes: 235,
    comments: 58,
    shares: 31,
    engagementRate: 5.3,
    topic: "Tech",
  },
  {
    date: "Jan 12, 2025",
    title: "Geopolitical Risk and the Business Leader's Playbook",
    impressions: 3750,
    likes: 139,
    comments: 26,
    shares: 14,
    engagementRate: 3.5,
    topic: "Business",
  },
];

const TOPIC_COLORS: Record<string, string> = {
  Finance: "bg-blue-100 text-blue-700",
  Tech: "bg-purple-100 text-purple-700",
  Leadership: "bg-amber-100 text-amber-700",
  Business: "bg-green-100 text-green-700",
};

interface PostTableProps {
  data?: PostAnalytic[];
}

export function PostTable({ data = PLACEHOLDER_DATA }: PostTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Post Title
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Topic
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Impressions
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Likes
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Comments
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Shares
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Eng. Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((post, idx) => (
              <tr
                key={idx}
                className="border-b last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {post.date}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <span
                    className="block truncate font-medium text-foreground"
                    title={post.title}
                  >
                    {post.title}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {post.topic && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        TOPIC_COLORS[post.topic] ?? "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {post.topic}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {post.impressions.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {post.likes}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {post.comments}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {post.shares}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      post.engagementRate >= 4
                        ? "font-semibold text-green-600"
                        : "text-muted-foreground"
                    }
                  >
                    {post.engagementRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          Showing {data.length} posts · Placeholder data — upload your CSV to see real metrics
        </p>
      </div>
    </div>
  );
}
