import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  EDUCATION_LEVELS,
  JOB_AUDIENCES,
  JOB_SECTORS,
  JOB_TYPES,
  TUTOR_LEVELS,
  TUTOR_MODES,
  TUTOR_SUBJECTS,
  isOneOf,
} from "@/lib/jobs-catalog";

/* ---------------- Jobs ---------------- */

/** Public fields only. Contact details and staff notes are never selected here. */
const publicJobSelect = {
  id: true,
  refCode: true,
  slug: true,
  title: true,
  employerName: true,
  showEmployer: true,
  employerVerified: true,
  sector: true,
  jobType: true,
  audience: true,
  education: true,
  minExperience: true,
  vacancies: true,
  salaryMin: true,
  salaryMax: true,
  salaryPeriod: true,
  description: true,
  requirements: true,
  deadline: true,
  status: true,
  featured: true,
  publishedAt: true,
  updatedAt: true,
  area: { select: { slug: true, nameEn: true, nameAm: true, city: true } },
} satisfies Prisma.JobPostSelect;

type JobRow = Prisma.JobPostGetPayload<{ select: typeof publicJobSelect }>;

/** Hides a confidential employer's name before it reaches a page. */
function toPublicJob(j: JobRow) {
  return { ...j, employerName: j.showEmployer ? j.employerName : null };
}
export type PublicJob = ReturnType<typeof toPublicJob>;

/** Published and not past its deadline. */
export const openJobWhere = (now = new Date()): Prisma.JobPostWhereInput => ({
  status: "PUBLISHED",
  OR: [{ deadline: null }, { deadline: { gte: now } }],
});

export type JobFilters = { q?: string; sector?: string; type?: string; audience?: string; area?: string; education?: string; page?: number };

export function parseJobFilters(sp: Record<string, string | string[] | undefined>): JobFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined);
  const page = Number(one("page"));
  return {
    q: one("q")?.slice(0, 80) || undefined,
    sector: isOneOf(JOB_SECTORS, one("sector")) ? one("sector") : undefined,
    type: isOneOf(JOB_TYPES, one("type")) ? one("type") : undefined,
    audience: isOneOf(JOB_AUDIENCES, one("for")) && one("for") !== "ANY" ? one("for") : undefined,
    education: isOneOf(EDUCATION_LEVELS, one("education")) ? one("education") : undefined,
    area: one("area")?.slice(0, 60) || undefined,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 500) : 1,
  };
}

export const JOBS_PAGE_SIZE = 20;

export async function searchJobs(f: JobFilters) {
  const and: Prisma.JobPostWhereInput[] = [openJobWhere()];
  if (f.sector) and.push({ sector: f.sector });
  if (f.type) and.push({ jobType: f.type });
  // A graduate job is also open to "any"; same for skilled.
  if (f.audience) and.push({ audience: { in: [f.audience, "ANY"] } });
  if (f.education) {
    // Show jobs that ask for this level or less.
    const max = EDUCATION_LEVELS.indexOf(f.education as (typeof EDUCATION_LEVELS)[number]);
    and.push({ education: { in: EDUCATION_LEVELS.slice(0, max + 1) as unknown as string[] } });
  }
  if (f.area) and.push({ area: { slug: f.area } });
  if (f.q) {
    const q = f.q;
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { requirements: { contains: q, mode: "insensitive" } },
        { refCode: { equals: q.toUpperCase() } },
        { AND: [{ showEmployer: true }, { employerName: { contains: q, mode: "insensitive" } }] },
      ],
    });
  }
  const where: Prisma.JobPostWhereInput = { AND: and };
  const page = f.page ?? 1;
  const [rows, total] = await Promise.all([
    db.jobPost.findMany({
      where,
      select: publicJobSelect,
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * JOBS_PAGE_SIZE,
      take: JOBS_PAGE_SIZE,
    }),
    db.jobPost.count({ where }),
  ]);
  return { items: rows.map(toPublicJob), total, page, pageCount: Math.ceil(total / JOBS_PAGE_SIZE) };
}

/** Published (open or closed) jobs can be opened; pending and rejected ones cannot. */
export const getJobBySlug = cache(async (slug: string) => {
  const j = await db.jobPost.findFirst({ where: { slug, status: { in: ["PUBLISHED", "CLOSED"] } }, select: publicJobSelect });
  return j ? toPublicJob(j) : null;
});

export async function getLatestJobs(limit = 6) {
  const rows = await db.jobPost.findMany({
    where: openJobWhere(),
    select: publicJobSelect,
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
  return rows.map(toPublicJob);
}

export async function getSimilarJobs(job: { id: string; sector: string }, limit = 4) {
  const rows = await db.jobPost.findMany({
    where: { AND: [openJobWhere(), { id: { not: job.id } }, { sector: job.sector }] },
    select: publicJobSelect,
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return rows.map(toPublicJob);
}

export const getJobCounts = cache(async () => {
  const [open, graduate, skilled, bySector] = await Promise.all([
    db.jobPost.count({ where: openJobWhere() }),
    db.jobPost.count({ where: { AND: [openJobWhere(), { audience: { in: ["GRADUATE", "ANY"] } }] } }),
    db.jobPost.count({ where: { AND: [openJobWhere(), { audience: { in: ["SKILLED", "ANY"] } }] } }),
    db.jobPost.groupBy({ by: ["sector"], where: openJobWhere(), _count: { _all: true } }),
  ]);
  return { open, graduate, skilled, bySector: Object.fromEntries(bySector.map((s) => [s.sector, s._count._all])) as Record<string, number> };
});

/* ---------------- Tutors ---------------- */

const publicTutorSelect = {
  id: true,
  refCode: true,
  slug: true,
  displayName: true,
  subjects: true,
  levels: true,
  modes: true,
  education: true,
  field: true,
  experienceYears: true,
  bio: true,
  availability: true,
  hourlyRate: true,
  isVerified: true,
  featured: true,
  publishedAt: true,
  updatedAt: true,
  area: { select: { slug: true, nameEn: true, nameAm: true } },
} satisfies Prisma.TutorSelect;
export type PublicTutor = Prisma.TutorGetPayload<{ select: typeof publicTutorSelect }>;

export type TutorFilters = { subject?: string; level?: string; mode?: string; area?: string; page?: number };

export function parseTutorFilters(sp: Record<string, string | string[] | undefined>): TutorFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined);
  const page = Number(one("page"));
  return {
    subject: isOneOf(TUTOR_SUBJECTS, one("subject")) ? one("subject") : undefined,
    level: isOneOf(TUTOR_LEVELS, one("level")) ? one("level") : undefined,
    mode: isOneOf(TUTOR_MODES, one("mode")) ? one("mode") : undefined,
    area: one("area")?.slice(0, 60) || undefined,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 500) : 1,
  };
}

export const TUTORS_PAGE_SIZE = 24;

export async function searchTutors(f: TutorFilters) {
  const and: Prisma.TutorWhereInput[] = [{ status: "ACTIVE" }];
  // A tutor for "all subjects" matches any subject.
  if (f.subject) and.push({ subjects: { hasSome: [f.subject, "ALL_SUBJECTS"] } });
  if (f.level) and.push({ levels: { has: f.level } });
  if (f.mode) and.push({ modes: { has: f.mode } });
  if (f.area) and.push({ OR: [{ area: { slug: f.area } }, { modes: { has: "ONLINE" } }] });
  const where: Prisma.TutorWhereInput = { AND: and };
  const page = f.page ?? 1;
  const [items, total] = await Promise.all([
    db.tutor.findMany({
      where,
      select: publicTutorSelect,
      orderBy: [{ featured: "desc" }, { isVerified: "desc" }, { experienceYears: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * TUTORS_PAGE_SIZE,
      take: TUTORS_PAGE_SIZE,
    }),
    db.tutor.count({ where }),
  ]);
  return { items, total, page, pageCount: Math.ceil(total / TUTORS_PAGE_SIZE) };
}

export const getTutorBySlug = cache(async (slug: string) => db.tutor.findFirst({ where: { slug, status: "ACTIVE" }, select: publicTutorSelect }));

export async function getFeaturedTutors(limit = 4) {
  return db.tutor.findMany({
    where: { status: "ACTIVE" },
    select: publicTutorSelect,
    orderBy: [{ featured: "desc" }, { isVerified: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
}

export const getTutorCount = cache(async () => db.tutor.count({ where: { status: "ACTIVE" } }));

/** For sitemap.xml */
export async function getSitemapJobsAndTutors() {
  const [jobs, tutors] = await Promise.all([
    db.jobPost.findMany({ where: openJobWhere(), select: { slug: true, updatedAt: true }, take: 20000 }),
    db.tutor.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, take: 20000 }),
  ]);
  return { jobs, tutors };
}
