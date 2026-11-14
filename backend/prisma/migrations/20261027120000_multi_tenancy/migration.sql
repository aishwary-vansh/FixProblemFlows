-- Multi-tenancy: Organization, Membership, Invite, and orgId on tenant tables.
-- Data-preserving: existing users and issues are moved into one "Default Organization".
-- Old global roles become memberships (USER -> REQUESTER, the first ADMIN -> OWNER).

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'TECHNICIAN', 'REQUESTER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'REQUESTER',
    "specialization" "TechnicianSpecialization",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "email" TEXT,
    "role" "OrgRole" NOT NULL,
    "specialization" "TechnicianSpecialization",
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- Backfill: one default org for pre-existing data (only if there is data to own).
INSERT INTO "Organization" ("name", "slug", "updatedAt")
SELECT 'Default Organization', 'default', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "User") OR EXISTS (SELECT 1 FROM "Issue");

-- Backfill: memberships from the old global roles.
INSERT INTO "Membership" ("orgId", "userId", "role", "specialization", "isActive", "createdAt", "updatedAt")
SELECT
    (SELECT "id" FROM "Organization" WHERE "slug" = 'default'),
    u."id",
    CASE u."role"
        WHEN 'ADMIN' THEN 'ADMIN'::"OrgRole"
        WHEN 'TECHNICIAN' THEN 'TECHNICIAN'::"OrgRole"
        ELSE 'REQUESTER'::"OrgRole"
    END,
    u."specialization",
    u."isActive",
    u."createdAt",
    CURRENT_TIMESTAMP
FROM "User" u;

-- Every org needs an owner: promote the earliest admin (or earliest user if there is no admin).
UPDATE "Membership" SET "role" = 'OWNER'
WHERE "id" = (
    SELECT "id" FROM "Membership"
    ORDER BY ("role" = 'ADMIN') DESC, "createdAt" ASC, "id" ASC
    LIMIT 1
);

-- AlterTable: Issue.orgId
ALTER TABLE "Issue" ADD COLUMN "orgId" INTEGER;
UPDATE "Issue" SET "orgId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'default');
ALTER TABLE "Issue" ALTER COLUMN "orgId" SET NOT NULL;

-- AlterTable: Attachment.orgId, storageKey (was fileUrl "/uploads/<key>"), uploaderId
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_issueId_fkey";
ALTER TABLE "Attachment"
ADD COLUMN "orgId" INTEGER,
ADD COLUMN "storageKey" TEXT,
ADD COLUMN "uploaderId" INTEGER;
UPDATE "Attachment" a SET
    "orgId" = i."orgId",
    "storageKey" = regexp_replace(a."fileUrl", '^/?uploads/', '')
FROM "Issue" i WHERE i."id" = a."issueId";
ALTER TABLE "Attachment" ALTER COLUMN "orgId" SET NOT NULL;
ALTER TABLE "Attachment" ALTER COLUMN "storageKey" SET NOT NULL;
ALTER TABLE "Attachment" DROP COLUMN "fileUrl";

-- AlterTable: roles now live on Membership
ALTER TABLE "User" DROP COLUMN "role",
DROP COLUMN "specialization";

-- DropEnum
DROP TYPE "Role";

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");
CREATE INDEX "Membership_orgId_role_idx" ON "Membership"("orgId", "role");
CREATE UNIQUE INDEX "Membership_orgId_userId_key" ON "Membership"("orgId", "userId");
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");
CREATE INDEX "Invite_orgId_createdAt_idx" ON "Invite"("orgId", "createdAt");
CREATE INDEX "Attachment_orgId_issueId_idx" ON "Attachment"("orgId", "issueId");
CREATE INDEX "Issue_orgId_status_idx" ON "Issue"("orgId", "status");
CREATE INDEX "Issue_orgId_createdAt_idx" ON "Issue"("orgId", "createdAt");
CREATE INDEX "Issue_orgId_reporterId_idx" ON "Issue"("orgId", "reporterId");
CREATE INDEX "Issue_orgId_assigneeId_idx" ON "Issue"("orgId", "assigneeId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
