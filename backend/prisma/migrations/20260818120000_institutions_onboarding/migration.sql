-- CreateEnum
CREATE TYPE "DomainVerificationMethod" AS ENUM ('dns', 'email', 'manual');

-- AlterEnum
ALTER TYPE "InstitutionStatus" ADD VALUE 'rejected';

-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "statusReason" TEXT;

-- AlterTable
ALTER TABLE "InstitutionDomain" ADD COLUMN     "verificationMethod" "DomainVerificationMethod",
ADD COLUMN     "verificationToken" TEXT;

UPDATE "InstitutionDomain"
SET "verifiedAt" = COALESCE("verifiedAt", CURRENT_TIMESTAMP),
    "verificationMethod" = 'manual'
WHERE "verificationMethod" IS NULL;
