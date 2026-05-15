-- AlterTable: add nullable imageDate column
ALTER TABLE "Issue" ADD COLUMN "imageDate" TIMESTAMP(3);

-- Backfill existing rows so the cover image keeps rendering the same date as before
UPDATE "Issue" SET "imageDate" = "publishDate" WHERE "imageDate" IS NULL AND "publishDate" IS NOT NULL;
