import { getPublishedIssue } from "@/lib/actions/issues";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const issue = await getPublishedIssue(params.id);
  return { title: issue ? `${issue.title} | Past Editions` : "Not Found" };
}

export default async function PastEditionDetailPage({ params }: Props) {
  const issue = await getPublishedIssue(params.id);
  if (!issue) notFound();

  const latestExport = issue.exports[0] ?? null;
  const latestImage = issue.images[0] ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/past-editions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Past Editions
        </Link>
        <Link href={`/issues/${issue.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Reopen for editing
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">{issue.title}</h1>
      {issue.publishDate && (
        <p className="text-sm text-muted-foreground mb-6">
          {new Date(issue.publishDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}

      {/* Cover image */}
      {latestImage?.imageData && latestImage.mimeType && (
        <div className="mb-8 rounded-lg overflow-hidden border">
          <img
            src={`data:${latestImage.mimeType};base64,${latestImage.imageData}`}
            alt={`Cover image for ${issue.title}`}
            className="w-full object-cover"
          />
        </div>
      )}

      {/* Exported text */}
      {latestExport?.content ? (
        <div className="rounded-lg border bg-muted/30 p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {latestExport.content}
          </pre>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No text export for this edition.{" "}
          <Link href={`/issues/${issue.id}`} className="underline hover:text-foreground">
            Reopen for editing
          </Link>{" "}
          to generate one.
        </div>
      )}
    </div>
  );
}
