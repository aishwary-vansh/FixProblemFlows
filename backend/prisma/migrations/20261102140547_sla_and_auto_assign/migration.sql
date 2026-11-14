-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IssueEventType" ADD VALUE 'PRIORITY_CHANGED';
ALTER TYPE "IssueEventType" ADD VALUE 'SLA_BREACHED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ISSUE_OVERDUE';

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "breachedAt" TIMESTAMP(3),
ADD COLUMN     "dueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "autoAssign" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Issue_dueAt_idx" ON "Issue"("dueAt");

-- Backfill: give open issues a deadline counted from when they were created.
UPDATE "Issue" SET "dueAt" = "createdAt" + CASE "priority"
    WHEN 'CRITICAL' THEN INTERVAL '4 hours'
    WHEN 'HIGH' THEN INTERVAL '24 hours'
    WHEN 'MEDIUM' THEN INTERVAL '3 days'
    ELSE INTERVAL '7 days'
END
WHERE "status" IN ('NEW', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'REOPENED');

-- Issues already past their deadline are marked here, so the first overdue check doesn't send an alert for each one.
UPDATE "Issue" SET "breachedAt" = "dueAt" WHERE "dueAt" < CURRENT_TIMESTAMP;
