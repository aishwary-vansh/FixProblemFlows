-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "customPriceInr" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
