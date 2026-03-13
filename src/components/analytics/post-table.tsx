import { ExternalLink } from "lucide-react";

export interface TopPost {
  url: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
  date: string;
}

interface Props {
  posts: TopPost[];
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    // Extract activity ID from LinkedIn URLs like:
    // https://www.linkedin.com/feed/update/urn:li:activity:1234567/
    const match = u.pathname.match(/activity[:/](\d+)/);
    if (match) return `Post #${match[1]}`;
    return u.pathname.replace(/^\/+|\/+$/g, "").slice(0, 40);
  } catch {
    return url.slice(0, 40);
  }
}

export function PostTable({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum post encontrado. Importe o Excel do LinkedIn para ver os dados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-6">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Data
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Post
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Impressões
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Engajamentos
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                Taxa Eng.
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, idx) => (
              <tr
                key={idx}
                className="border-b last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                  {post.date
                    ? new Date(post.date + "T12:00:00Z").toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  {post.url ? (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      title={post.url}
                    >
                      <span className="truncate max-w-[200px] block text-xs">
                        {shortUrl(post.url)}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {post.impressions.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {post.engagements.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      post.engagementRate >= 4
                        ? "font-semibold text-green-600"
                        : post.engagementRate >= 2
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {post.engagementRate.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t bg-muted/20 px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          {posts.length} posts · ordenados por taxa de engajamento
        </p>
      </div>
    </div>
  );
}
