-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM ('ELECTRICAL', 'PLUMBING', 'CARPENTRY', 'CIVIL', 'HVAC', 'IT', 'GENERAL');

-- CreateEnum
CREATE TYPE "TechnicianSpecialization" AS ENUM ('ELECTRICAL', 'PLUMBING', 'CARPENTRY', 'CIVIL', 'HVAC', 'IT', 'GENERAL');

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "category" "IssueCategory" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "specialization" "TechnicianSpecialization";
