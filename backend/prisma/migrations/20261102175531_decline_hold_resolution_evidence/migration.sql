-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('BEFORE', 'AFTER');

-- AlterEnum
ALTER TYPE "IssueEventType" ADD VALUE 'DECLINED';

-- AlterEnum
ALTER TYPE "IssueStatus" ADD VALUE 'ON_HOLD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ISSUE_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'ISSUE_ON_HOLD';

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "kind" "AttachmentKind" NOT NULL DEFAULT 'BEFORE';

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "heldAt" TIMESTAMP(3),
ADD COLUMN     "repairCost" INTEGER,
ADD COLUMN     "repairMinutes" INTEGER,
ADD COLUMN     "resolutionNote" TEXT;
