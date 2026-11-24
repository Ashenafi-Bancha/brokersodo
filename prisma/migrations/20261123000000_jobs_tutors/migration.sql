-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PUBLISHED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'SHORTLISTED', 'CONTACTED', 'HIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SeekerStatus" AS ENUM ('NEW', 'ACTIVE', 'PLACED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TutorStatus" AS ENUM ('PENDING', 'ACTIVE', 'HIDDEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "TutorRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'MATCHED', 'CLOSED');

-- CreateTable
CREATE TABLE "JobPost" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employerName" TEXT NOT NULL,
    "showEmployer" BOOLEAN NOT NULL DEFAULT true,
    "employerVerified" BOOLEAN NOT NULL DEFAULT false,
    "sector" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'ANY',
    "education" TEXT NOT NULL DEFAULT 'NONE',
    "minExperience" INTEGER NOT NULL DEFAULT 0,
    "vacancies" INTEGER NOT NULL DEFAULT 1,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryPeriod" TEXT NOT NULL DEFAULT 'MONTH',
    "areaId" TEXT,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL DEFAULT '',
    "deadline" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "staffNotes" TEXT,
    "rejectReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "field" TEXT,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "skills" TEXT,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeeker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "seekerType" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "education" TEXT NOT NULL,
    "field" TEXT,
    "graduationYear" INTEGER,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "skills" TEXT,
    "about" TEXT,
    "areaId" TEXT,
    "status" "SeekerStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSeeker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tutor" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "subjects" TEXT[],
    "levels" TEXT[],
    "modes" TEXT[],
    "education" TEXT NOT NULL,
    "field" TEXT,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT NOT NULL,
    "availability" TEXT,
    "hourlyRate" INTEGER,
    "areaId" TEXT,
    "status" "TutorStatus" NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "staffNotes" TEXT,
    "rejectReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorRequest" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "areaId" TEXT,
    "schedule" TEXT,
    "budget" INTEGER,
    "message" TEXT,
    "status" "TutorRequestStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobPost_refCode_key" ON "JobPost"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "JobPost_slug_key" ON "JobPost"("slug");

-- CreateIndex
CREATE INDEX "JobPost_status_publishedAt_idx" ON "JobPost"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "JobPost_status_deadline_idx" ON "JobPost"("status", "deadline");

-- CreateIndex
CREATE INDEX "JobPost_sector_status_idx" ON "JobPost"("sector", "status");

-- CreateIndex
CREATE INDEX "JobPost_audience_status_idx" ON "JobPost"("audience", "status");

-- CreateIndex
CREATE INDEX "JobPost_areaId_status_idx" ON "JobPost"("areaId", "status");

-- CreateIndex
CREATE INDEX "JobApplication_status_createdAt_idx" ON "JobApplication"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_phone_key" ON "JobApplication"("jobId", "phone");

-- CreateIndex
CREATE INDEX "JobSeeker_status_createdAt_idx" ON "JobSeeker"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "JobSeeker_sector_seekerType_idx" ON "JobSeeker"("sector", "seekerType");

-- CreateIndex
CREATE INDEX "JobSeeker_phone_idx" ON "JobSeeker"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_refCode_key" ON "Tutor"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_slug_key" ON "Tutor"("slug");

-- CreateIndex
CREATE INDEX "Tutor_status_featured_publishedAt_idx" ON "Tutor"("status", "featured", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Tutor_areaId_status_idx" ON "Tutor"("areaId", "status");

-- CreateIndex
CREATE INDEX "Tutor_subjects_idx" ON "Tutor" USING GIN ("subjects");

-- CreateIndex
CREATE INDEX "Tutor_levels_idx" ON "Tutor" USING GIN ("levels");

-- CreateIndex
CREATE INDEX "TutorRequest_status_createdAt_idx" ON "TutorRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "TutorRequest_tutorId_idx" ON "TutorRequest"("tutorId");

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSeeker" ADD CONSTRAINT "JobSeeker_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tutor" ADD CONSTRAINT "Tutor_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorRequest" ADD CONSTRAINT "TutorRequest_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Tutor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorRequest" ADD CONSTRAINT "TutorRequest_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

