-- CreateEnum
CREATE TYPE "NoticeLevel" AS ENUM ('INFO', 'WARNING');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "noticeAt" TIMESTAMP(3),
ADD COLUMN     "noticeLevel" "NoticeLevel",
ADD COLUMN     "noticeMessage" TEXT;

-- CreateTable
CREATE TABLE "PlanEvent" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "note" TEXT,
    "sharedWithOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanEvent_orgId_createdAt_idx" ON "PlanEvent"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlanEvent" ADD CONSTRAINT "PlanEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEvent" ADD CONSTRAINT "PlanEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
