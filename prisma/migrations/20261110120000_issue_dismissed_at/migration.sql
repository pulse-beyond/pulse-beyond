-- Tombstone for deleted auto-created Friday editions (see deleteIssue / ensureUpcomingIssues).
ALTER TABLE "Issue" ADD COLUMN IF NOT EXISTS "dismissedAt" TIMESTAMP(3);
