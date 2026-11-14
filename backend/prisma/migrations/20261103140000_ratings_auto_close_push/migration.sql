-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "pushedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Issue_status_resolvedAt_idx" ON "Issue"("status", "resolvedAt");

-- CreateIndex
CREATE INDEX "Notification_pushedAt_createdAt_idx" ON "Notification"("pushedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: when each resolved or closed issue was last resolved, from its timeline.
UPDATE "Issue" i SET "resolvedAt" = COALESCE(
    (SELECT MAX(e."createdAt") FROM "IssueEvent" e WHERE e."issueId" = i."id" AND e."toStatus" = 'RESOLVED'),
    i."updatedAt"
)
WHERE i."status" IN ('RESOLVED', 'CLOSED');

-- Existing notifications are old news; don't push them.
UPDATE "Notification" SET "pushedAt" = CURRENT_TIMESTAMP;
