-- CreateEnum
CREATE TYPE "TalentRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CONNECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStatus" ADD VALUE 'REVIEWING';
ALTER TYPE "ApplicationStatus" ADD VALUE 'INTERVIEW';
ALTER TYPE "ApplicationStatus" ADD VALUE 'WITHDRAWN';

-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'UNDER_REVIEW';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TutorRequestStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "TutorRequestStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN     "howToApply" TEXT,
ADD COLUMN     "responsibilities" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "workMode" TEXT NOT NULL DEFAULT 'ONSITE';

-- AlterTable
ALTER TABLE "JobSeeker" ADD COLUMN     "availability" TEXT,
ADD COLUMN     "certifications" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "portfolioUrl" TEXT,
ADD COLUMN     "projects" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "Tutor" ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "monthlyRate" INTEGER,
ADD COLUMN     "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TalentRequest" (
    "id" TEXT NOT NULL,
    "seekerId" TEXT,
    "employerName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "status" "TalentRequestStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorReview" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "requestId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TalentRequest_status_createdAt_idx" ON "TalentRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TalentRequest_seekerId_idx" ON "TalentRequest"("seekerId");

-- CreateIndex
CREATE INDEX "TutorReview_tutorId_status_createdAt_idx" ON "TutorReview"("tutorId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TutorReview_status_createdAt_idx" ON "TutorReview"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TutorReview_tutorId_phone_key" ON "TutorReview"("tutorId", "phone");

-- CreateIndex
CREATE INDEX "JobPost_workMode_status_idx" ON "JobPost"("workMode", "status");

-- CreateIndex
CREATE INDEX "JobPost_skills_idx" ON "JobPost" USING GIN ("skills");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeeker_slug_key" ON "JobSeeker"("slug");

-- CreateIndex
CREATE INDEX "JobSeeker_visibility_status_publishedAt_idx" ON "JobSeeker"("visibility", "status", "publishedAt" DESC);

-- AddForeignKey
ALTER TABLE "TalentRequest" ADD CONSTRAINT "TalentRequest_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "JobSeeker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorReview" ADD CONSTRAINT "TutorReview_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorReview" ADD CONSTRAINT "TutorReview_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TutorRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

