import { getPublishedIssues } from "@/lib/actions/issues";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Archive } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Past Editions | Snapshot Builder",
};

export default async function PastEditionsPage() {
  const issues = await getPublishedIssues();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mt-0.5">
          <Archive className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Past Editions</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Published issues of the Weekly Snapshot newsletter.
          </p>
        </div>
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No published editions yet. Mark an edition as published from the{" "}
            <Link href="/create" className="underline hover:text-foreground">
              Create
            </Link>{" "}
            screen.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => {
            const topicTitles = issue.sections.map((s) => {
              try {
                const parsed = JSON.parse(s.editedContent ?? s.content);
                return (parsed.titleOptions?.[0] as string) ?? null;
              } catch {
                return null;
              }
            }).filter(Boolean) as string[];

            return (
              <Link key={issue.id} href={`/past-editions/${issue.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{issue.title}</CardTitle>
                    {issue.publishDate && (
                      <CardDescription>
                        {new Date(issue.publishDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </CardDescription>
                    )}
                  </CardHeader>
                  {topicTitles.length > 0 && (
                    <CardContent className="pt-0 pb-3">
                      <ul className="space-y-0.5">
                        {topicTitles.map((title, i) => (
                          <li key={i} className="text-xs text-muted-foreground truncate">
                            · {title}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
