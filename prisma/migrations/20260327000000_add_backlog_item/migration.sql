-- CreateTable
CREATE TABLE "BacklogItem" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacklogItem_pkey" PRIMARY KEY ("id")
);
