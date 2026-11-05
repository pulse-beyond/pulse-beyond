-- AlterTable
ALTER TABLE "BacklogItem" ADD COLUMN "issueId" TEXT;
ALTER TABLE "BacklogItem" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BacklogItem_issueId_idx" ON "BacklogItem"("issueId");

-- AddForeignKey
ALTER TABLE "BacklogItem" ADD CONSTRAINT "BacklogItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
