import { getIssue, setIssueStep } from "@/lib/actions/issues";
import { notFound } from "next/navigation";
import { WORKFLOW_STEPS } from "@/types";
import { StepProgress } from "@/components/step-progress";
import { StepLinks } from "@/components/step-links";
import { StepSelect } from "@/components/step-select";
import { StepGenerate } from "@/components/step-generate";
import { StepEvents } from "@/components/step-events";
import { StepShorten } from "@/components/step-shorten";
import { StepExport } from "@/components/step-export";
import { StepImage } from "@/components/step-image";

interface Props {
  params: { id: string };
}

export default async function IssuePage({ params }: Props) {
  const issue = await getIssue(params.id);
  if (!issue) notFound();

  const currentStep = issue.currentStep;

  // Compute which steps are actually completed based on real data
  const completedSteps = new Set<string>();

  // "links" is complete if at least 1 link was added
  if (issue.links.length > 0) completedSteps.add("links");

  // "select" is complete if at least 1 link is selected
  if (issue.links.some((l) => l.selected)) completedSteps.add("select");

  // "generate" is complete if there are generated main sections
  if (issue.sections.some((s) => s.sectionType === "main")) completedSteps.add("generate");

  // "events" is complete if at least 1 event is included
  if (issue.events.some((e) => e.included)) completedSteps.add("events");

  // "shorten" is complete if all selected links have short URLs
  const selectedLinks = issue.links.filter((l) => l.selected);
  if (selectedLinks.length > 0 && selectedLinks.every((l) => l.shortUrl)) {
    completedSteps.add("shorten");
  }

  // "export" is complete if there is at least 1 export
  if (issue.exports.length > 0) completedSteps.add("export");

  // "image" is complete if there is at least 1 generated image
  if (issue.images.length > 0) completedSteps.add("image");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{issue.title}</h1>
        {issue.publishDate && (
          <p className="text-muted-foreground text-sm mt-1">
            Target: {new Date(issue.publishDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Sidebar navigation */}
        <StepProgress
          steps={WORKFLOW_STEPS}
          currentStep={currentStep}
          completedSteps={Array.from(completedSteps)}
          issueId={issue.id}
          onStepChange={setIssueStep}
        />

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {currentStep === "links" && (
            <StepLinks issueId={issue.id} links={issue.links} />
          )}
          {currentStep === "select" && (
            <StepSelect issueId={issue.id} links={issue.links} />
          )}
          {currentStep === "generate" && (
            <StepGenerate
              issueId={issue.id}
              sections={issue.sections.filter((s) => s.sectionType === "main")}
              links={issue.links.filter((l) => l.selected)}
            />
          )}
          {currentStep === "events" && (
            <StepEvents
              issueId={issue.id}
              events={issue.events}
              publishDate={issue.publishDate ? issue.publishDate.toISOString() : null}
            />
          )}
          {currentStep === "shorten" && (
            <StepShorten
              issueId={issue.id}
              links={issue.links.filter((l) => l.selected)}
              events={issue.events.filter((e) => e.included)}
            />
          )}
          {currentStep === "export" && (
            <StepExport
              issueId={issue.id}
              latestExport={issue.exports[0] || null}
            />
          )}
          {currentStep === "image" && (
            <StepImage
              issueId={issue.id}
              sections={issue.sections.filter((s) => s.sectionType === "main")}
              latestImage={issue.images[0] || null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
