"use client";

import { useState } from "react";
import { shortenAllLinks } from "@/lib/actions/shorten";
import { setIssueStep } from "@/lib/actions/issues";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LinkItem, EventItem } from "@prisma/client";

interface Props {
  issueId: string;
  links: LinkItem[];
  events: EventItem[];
}

export function StepShorten({ issueId, links, events }: Props) {
  const [shortening, setShortening] = useState(false);

  const allShortened =
    links.every((l) => l.shortUrl) &&
    events.filter((e) => e.sourceUrl).every((e) => e.shortUrl);

  async function handleShorten() {
    setShortening(true);
    try {
      await shortenAllLinks(issueId);
    } finally {
      setShortening(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          Step E: Read More Here
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Shorten all URLs using TinyURL for the &quot;Read more here&quot; section.
        </p>
      </div>

      <Button onClick={handleShorten} disabled={shortening}>
        {shortening
          ? "Shortening..."
          : allShortened
          ? "Re-shorten All"
          : "Shorten All Links"}
      </Button>

      {/* Link preview */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Article Links
        </h3>
        {links.map((link) => (
          <Card key={link.id}>
            <CardContent className="p-3">
              <p className="text-sm font-medium truncate">
                {link.metaTitle || link.url}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {link.url}
                </span>
                {link.shortUrl && (
                  <span className="text-xs text-green-700 font-mono shrink-0">
                    {link.shortUrl}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {events.filter((e) => e.sourceUrl).length > 0 && (
          <>
            <h3 className="text-sm font-medium text-muted-foreground mt-4">
              Event Links
            </h3>
            {events
              .filter((e) => e.sourceUrl)
              .map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {event.sourceUrl}
                      </span>
                      {event.shortUrl && (
                        <span className="text-xs text-green-700 font-mono shrink-0">
                          {event.shortUrl}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => setIssueStep(issueId, "events")}
        >
          Back
        </Button>
        <Button onClick={() => setIssueStep(issueId, "export")}>
          Next: Export
        </Button>
      </div>
    </div>
  );
}
