CREATE TYPE "TutorMembershipStatus" AS ENUM ('pending', 'verified', 'rejected');

CREATE TYPE "TutorMembershipOrigin" AS ENUM ('tutor', 'institution');

CREATE TABLE "TutorMembership" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "status" "TutorMembershipStatus" NOT NULL DEFAULT 'pending',
    "origin" "TutorMembershipOrigin" NOT NULL DEFAULT 'tutor',
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "TutorMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TutorMembership_tutorId_institutionId_key"
    ON "TutorMembership"("tutorId", "institutionId");

CREATE INDEX "TutorMembership_institutionId_status_idx"
    ON "TutorMembership"("institutionId", "status");

CREATE INDEX "TutorMembership_tutorId_status_idx"
    ON "TutorMembership"("tutorId", "status");

ALTER TABLE "TutorMembership" ADD CONSTRAINT "TutorMembership_tutorId_fkey"
    FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TutorMembership" ADD CONSTRAINT "TutorMembership_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TutorMembership" ADD CONSTRAINT "TutorMembership_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "TutorMembership" (
    "id", "tutorId", "institutionId", "status", "origin",
    "note", "requestedAt", "reviewedAt", "reviewedById"
)
SELECT
    gen_random_uuid()::text,
    u."id",
    u."institutionId",
    CASE WHEN p."isVerified" THEN 'verified'::"TutorMembershipStatus"
         ELSE 'pending'::"TutorMembershipStatus" END,
    'tutor'::"TutorMembershipOrigin",
    p."verifiedNote",
    u."createdAt",
    p."verifiedAt",
    p."verifiedById"
FROM "User" u
JOIN "TutorProfile" p ON p."userId" = u."id"
WHERE u."role" = 'tutor' AND u."institutionId" IS NOT NULL
ON CONFLICT ("tutorId", "institutionId") DO NOTHING;
