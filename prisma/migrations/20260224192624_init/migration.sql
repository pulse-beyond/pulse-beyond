-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Issue',
    "publishDate" TIMESTAMP(3),
    "currentStep" TEXT NOT NULL DEFAULT 'links',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkItem" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "toneNote" TEXT,
    "audioPath" TEXT,
    "audioTranscript" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "shortUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventItem" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT false,
    "shortUrl" TEXT,
    "sourceUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedSection" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "linkItemId" TEXT,
    "sectionType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedContent" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Export" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'txt',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageData" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LinkItem" ADD CONSTRAINT "LinkItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventItem" ADD CONSTRAINT "EventItem_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedSection" ADD CONSTRAINT "GeneratedSection_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedSection" ADD CONSTRAINT "GeneratedSection_linkItemId_fkey" FOREIGN KEY ("linkItemId") REFERENCES "LinkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "GeneratedSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
