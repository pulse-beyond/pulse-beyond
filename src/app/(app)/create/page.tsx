import {
  getIssues,
  ensureUpcomingIssues,
  countPublishedIssues,
  getUpcomingFridayOptions,
} from "@/lib/actions/issues";

export const dynamic = "force-dynamic";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PenLine } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { DeleteIssueButton } from "@/components/delete-issue-button";
import { MarkAsPublishedButton } from "@/components/mark-as-published-button";
import { NewEditionForm } from "@/components/new-edition-form";

export const metadata: Metadata = {
  title: "Create | Snapshot Builder",
  description: "Build your weekly Snapshot edition",
};

export default async function CreatePage() {
  // Pre-create empty editions for every Friday in the next 2 months
  await ensureUpcomingIssues();
  const [issues, publishedCount, fridayPresets] = await Promise.all([
    getIssues(),
    countPublishedIssues(),
    getUpcomingFridayOptions(8),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mt-0.5">
            <PenLine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Each edition is one issue of the Weekly Snapshot newsletter (default: Friday).
            </p>
          </div>
        </div>
        <NewEditionForm upcomingFridays={fridayPresets} />
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No editions yet. Create your first one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div key={issue.id} className="relative group">
              <Link href={`/issues/${issue.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-lg">{issue.title}</CardTitle>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{issue.currentStep}</Badge>
                        {/* Spacer so action buttons don't overlap badge */}
                        <div className="w-32" />
                      </div>
                    </div>
                    <CardDescription>
                      {issue._count.links} link{issue._count.links !== 1 ? "s" : ""}{" "}
                      · {issue._count.events} event
                      {issue._count.events !== 1 ? "s" : ""} · Created{" "}
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              {/* Action buttons — absolute, outside Link so they don't navigate */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1">
                <MarkAsPublishedButton issueId={issue.id} />
                <DeleteIssueButton issueId={issue.id} issueTitle={issue.title} />
              </div>
            </div>
          ))}
        </div>
      )}

      {publishedCount > 0 && (
        <div className="mt-6 text-center">
          <Link
            href="/past-editions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {publishedCount} past edition{publishedCount !== 1 ? "s" : ""} →
          </Link>
        </div>
      )}
    </div>
  );
}
