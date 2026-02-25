import { getIssues, createIssue } from "@/lib/actions/issues";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
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

export const metadata: Metadata = {
  title: "Create | Snapshot Builder",
  description: "Build your weekly Snapshot edition",
};

export default async function CreatePage() {
  const issues = await getIssues();

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
              Each edition is one Sunday issue of the Weekly Snapshot newsletter.
            </p>
          </div>
        </div>
        <form action={createIssue}>
          <Button type="submit">New Edition</Button>
        </form>
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
                        {/* Spacer so delete button doesn't overlap badge */}
                        <div className="w-16" />
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
              {/* Delete button — absolute, outside Link so it doesn't navigate */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <DeleteIssueButton issueId={issue.id} issueTitle={issue.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
