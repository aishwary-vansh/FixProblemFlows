-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('TRIAL', 'MANUAL');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planEndsAt" TIMESTAMP(3),
ADD COLUMN     "planSource" "PlanSource";
