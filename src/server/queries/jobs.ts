import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  EDUCATION_LEVELS,
  JOB_AUDIENCES,
  JOB_SECTORS,
  JOB_TYPES,
  LANGUAGES,
  TUTOR_LEVELS,
  TUTOR_MODES,
  TUTOR_SUBJECTS,
  WORK_MODES,
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
  responsibilities: true,
  skills: true,
  workMode: true,
  howToApply: true,
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

export const JOB_SORTS = ["deadline", "salary"] as const;
export type JobFilters = { q?: string; sector?: string; type?: string; audience?: string; area?: string; education?: string; mode?: string; sort?: string; page?: number };

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
    mode: isOneOf(WORK_MODES, one("mode")) ? one("mode") : undefined,
    sort: isOneOf(JOB_SORTS, one("sort")) ? one("sort") : undefined,
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
  if (f.mode) and.push({ workMode: f.mode });
  if (f.q) {
    const q = f.q;
    // Skills are stored as typed ("Excel"), so match the common capitalised form too.
    const skill = q.charAt(0).toUpperCase() + q.slice(1);
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { skills: { hasSome: [q, skill] } },
        { responsibilities: { contains: q, mode: "insensitive" } },
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
      orderBy:
        f.sort === "deadline"
          ? [{ deadline: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }]
          : f.sort === "salary"
            ? [{ salaryMax: { sort: "desc", nulls: "last" } }, { salaryMin: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }]
            : [{ featured: "desc" }, { publishedAt: "desc" }],
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
  monthlyRate: true,
  languages: true,
  ratingAvg: true,
  ratingCount: true,
  isVerified: true,
  featured: true,
  publishedAt: true,
  updatedAt: true,
  area: { select: { slug: true, nameEn: true, nameAm: true } },
} satisfies Prisma.TutorSelect;
export type PublicTutor = Prisma.TutorGetPayload<{ select: typeof publicTutorSelect }>;

export const TUTOR_SORTS = ["rating", "price", "experience"] as const;
/** Hourly price ceilings offered in the filter (ETB). */
export const TUTOR_MAX_RATES = ["200", "300", "500", "1000"] as const;
export type TutorFilters = { subject?: string; level?: string; mode?: string; area?: string; language?: string; maxRate?: string; sort?: string; page?: number };

export function parseTutorFilters(sp: Record<string, string | string[] | undefined>): TutorFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined);
  const page = Number(one("page"));
  return {
    subject: isOneOf(TUTOR_SUBJECTS, one("subject")) ? one("subject") : undefined,
    level: isOneOf(TUTOR_LEVELS, one("level")) ? one("level") : undefined,
    mode: isOneOf(TUTOR_MODES, one("mode")) ? one("mode") : undefined,
    area: one("area")?.slice(0, 60) || undefined,
    language: isOneOf(LANGUAGES, one("language")) ? one("language") : undefined,
    maxRate: isOneOf(TUTOR_MAX_RATES, one("maxRate")) ? one("maxRate") : undefined,
    sort: isOneOf(TUTOR_SORTS, one("sort")) ? one("sort") : undefined,
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
  if (f.language) and.push({ languages: { has: f.language } });
  // Tutors without a listed price are kept: they agree the price with the family.
  if (f.maxRate) and.push({ OR: [{ hourlyRate: null }, { hourlyRate: { lte: Number(f.maxRate) } }] });
  const where: Prisma.TutorWhereInput = { AND: and };
  const page = f.page ?? 1;
  const [items, total] = await Promise.all([
    db.tutor.findMany({
      where,
      select: publicTutorSelect,
      orderBy:
        f.sort === "rating"
          ? [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { publishedAt: "desc" }]
          : f.sort === "price"
            ? [{ hourlyRate: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }]
            : f.sort === "experience"
              ? [{ experienceYears: "desc" }, { publishedAt: "desc" }]
              : [{ featured: "desc" }, { isVerified: "desc" }, { ratingAvg: "desc" }, { experienceYears: "desc" }, { publishedAt: "desc" }],
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

/** Approved reviews for a tutor's page: first name, stars, text and date only. */
export const getTutorReviews = cache(async (tutorId: string) =>
  db.tutorReview.findMany({
    where: { tutorId, status: "APPROVED" },
    select: { id: true, name: true, rating: true, comment: true, verified: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  }),
);

/* ---------------- Talent ---------------- */

/** Public talent fields. The full name, phone and staff notes are never selected here. */
const publicTalentSelect = {
  id: true,
  slug: true,
  displayName: true,
  seekerType: true,
  profession: true,
  sector: true,
  education: true,
  field: true,
  graduationYear: true,
  experience: true,
  skills: true,
  about: true,
  languages: true,
  certifications: true,
  projects: true,
  portfolioUrl: true,
  availability: true,
  isVerified: true,
  publishedAt: true,
  updatedAt: true,
  area: { select: { slug: true, nameEn: true, nameAm: true } },
} satisfies Prisma.JobSeekerSelect;
export type PublicTalent = Prisma.JobSeekerGetPayload<{ select: typeof publicTalentSelect }>;

/** Listed only when the person chose a public profile and staff approved it. */
const publicTalentWhere: Prisma.JobSeekerWhereInput = { visibility: "PUBLIC", status: "ACTIVE", slug: { not: null } };

export type TalentFilters = { q?: string; sector?: string; type?: string; education?: string; area?: string; page?: number };

export function parseTalentFilters(sp: Record<string, string | string[] | undefined>): TalentFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined);
  const page = Number(one("page"));
  return {
    q: one("q")?.slice(0, 80) || undefined,
    sector: isOneOf(JOB_SECTORS, one("sector")) ? one("sector") : undefined,
    type: isOneOf(["GRADUATE", "SKILLED"] as const, one("type")) ? one("type") : undefined,
    education: isOneOf(EDUCATION_LEVELS, one("education")) ? one("education") : undefined,
    area: one("area")?.slice(0, 60) || undefined,
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 500) : 1,
  };
}

export const TALENT_PAGE_SIZE = 24;

export async function searchTalent(f: TalentFilters) {
  const and: Prisma.JobSeekerWhereInput[] = [publicTalentWhere];
  if (f.sector) and.push({ sector: f.sector });
  if (f.type) and.push({ seekerType: f.type });
  if (f.education) {
    // This level or higher.
    const min = EDUCATION_LEVELS.indexOf(f.education as (typeof EDUCATION_LEVELS)[number]);
    and.push({ education: { in: EDUCATION_LEVELS.slice(min) as unknown as string[] } });
  }
  if (f.area) and.push({ area: { slug: f.area } });
  if (f.q) {
    const q = f.q;
    and.push({
      OR: [
        { profession: { contains: q, mode: "insensitive" } },
        { skills: { contains: q, mode: "insensitive" } },
        { field: { contains: q, mode: "insensitive" } },
        { about: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.JobSeekerWhereInput = { AND: and };
  const page = f.page ?? 1;
  const [items, total] = await Promise.all([
    db.jobSeeker.findMany({
      where,
      select: publicTalentSelect,
      orderBy: [{ isVerified: "desc" }, { experience: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * TALENT_PAGE_SIZE,
      take: TALENT_PAGE_SIZE,
    }),
    db.jobSeeker.count({ where }),
  ]);
  return { items, total, page, pageCount: Math.ceil(total / TALENT_PAGE_SIZE) };
}

export const getTalentBySlug = cache(async (slug: string) => db.jobSeeker.findFirst({ where: { ...publicTalentWhere, slug }, select: publicTalentSelect }));

export const getTalentCount = cache(async () => db.jobSeeker.count({ where: publicTalentWhere }));

export async function getFeaturedTalent(limit = 4) {
  return db.jobSeeker.findMany({ where: publicTalentWhere, select: publicTalentSelect, orderBy: [{ isVerified: "desc" }, { publishedAt: "desc" }], take: limit });
}

/** For sitemap.xml */
export async function getSitemapJobsAndTutors() {
  const [jobs, tutors, talent] = await Promise.all([
    db.jobPost.findMany({ where: openJobWhere(), select: { slug: true, updatedAt: true }, take: 20000 }),
    db.tutor.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true }, take: 20000 }),
    db.jobSeeker.findMany({ where: publicTalentWhere, select: { slug: true, updatedAt: true }, take: 20000 }),
  ]);
  return { jobs, tutors, talent: talent.filter((t): t is { slug: string; updatedAt: Date } => !!t.slug) };
}
