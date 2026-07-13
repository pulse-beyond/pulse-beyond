-- CreateTable
CREATE TABLE "BrainDumpConfig" (
    "id" TEXT NOT NULL,
    "topics" TEXT NOT NULL,
    "maxPerTopic" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainDumpConfig_pkey" PRIMARY KEY ("id")
);
