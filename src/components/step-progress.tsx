"use client";

import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/types";

interface Props {
  steps: { key: WorkflowStep; label: string }[];
  currentStep: string;
  completedSteps: string[];
  issueId: string;
  onStepChange: (issueId: string, step: string) => Promise<void>;
}

export function StepProgress({ steps, currentStep, completedSteps, issueId, onStepChange }: Props) {
  const completed = new Set(completedSteps);
  return (
    <nav className="flex flex-col gap-1 w-56 shrink-0">
      {steps.map((step, i) => {
        const isActive = step.key === currentStep;
        const isCompleted = completed.has(step.key) && !isActive;

        return (
          <button
            key={step.key}
            onClick={() => onStepChange(issueId, step.key)}
            className={cn(
              "flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
              isActive && "bg-primary text-primary-foreground",
              isCompleted && "bg-white text-primary hover:bg-gray-50",
              !isActive && !isCompleted && "text-muted-foreground hover:bg-muted"
            )}
          >
            {/* Tick / step number indicator */}
            <span
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0",
                isActive && "bg-primary-foreground/20 text-primary-foreground",
                isCompleted && "bg-green-100 text-green-700",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 text-green-600"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </span>

            {/* Label */}
            <span className="flex flex-col leading-tight">
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">
                Step {i + 1}
              </span>
              <span className="font-medium">{step.label}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
