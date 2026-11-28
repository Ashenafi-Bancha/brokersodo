"use server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clientFingerprint, rateLimit } from "@/lib/rate-limit";
import { listingSlug, nextRefCode } from "@/lib/ref-code";
import {
  applicationSchema,
  jobPostSchema,
  seekerSchema,
  talentRequestSchema,
  tutorRequestSchema,
  tutorReviewSchema,
  tutorSchema,
} from "@/lib/validators/jobs";
import { deadlineFromDate, splitSkills } from "@/lib/jobs-catalog";
import { getMember } from "@/lib/member-auth";
import { areActiveValues } from "@/lib/catalog";
import { notify } from "@/lib/notify";

const badChoice = { ok: false as const, error: "invalid", fieldErrors: { _: ["required"] } };
import type { PublicActionResult } from "./public";

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "_")] ??= []).push(i.message);
  return out;
}

async function limited(kind: string, limit: number, windowSec: number) {
  const fp = await clientFingerprint();
  return !(await rateLimit(`${kind}:${fp}`, limit, windowSec)).ok;
}

const botOk = { ok: true as const };

async function validArea(id: string | null) {
  if (!id) return null;
  const a = await db.area.findFirst({ where: { id, isActive: true }, select: { id: true } });
  return a?.id ?? null;
}

/** Employers post a job. It goes live only after staff review. */
export async function createJobPostAction(input: unknown): Promise<PublicActionResult<{ ref: string }>> {
  const parsed = jobPostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return botOk;
  if (await limited("job-post", 4, 60 * 60)) return { ok: false, error: "rateLimited" };
  if (!(await areActiveValues("sector", d.sector))) return { ...badChoice, fieldErrors: { sector: ["required"] } };
  try {
    const areaId = await validArea(d.areaId);
    const job = await db.$transaction(async (tx) => {
      const refCode = await nextRefCode(tx, "J");
      return tx.jobPost.create({
        data: {
          refCode,
          slug: listingSlug(d.title, refCode),
          title: d.title,
          employerName: d.employerName,
          showEmployer: d.showEmployer,
          sector: d.sector,
          jobType: d.jobType,
          audience: d.audience,
          education: d.education,
          minExperience: d.minExperience ?? 0,
          vacancies: d.vacancies ?? 1,
          salaryMin: d.salaryMin,
          salaryMax: d.salaryMax,
          salaryPeriod: d.salaryPeriod,
          areaId,
          description: d.description,
          requirements: d.requirements,
          responsibilities: d.responsibilities,
          skills: splitSkills(d.skills),
          workMode: d.workMode,
          deadline: d.deadline ? deadlineFromDate(d.deadline) : null,
          contactName: d.contactName,
          contactPhone: d.contactPhone,
        },
        select: { refCode: true },
      });
    });
    return { ok: true, data: { ref: job.refCode } };
  } catch (e) {
    console.error("[job post]", e);
    return { ok: false, error: "generic" };
  }
}

/** Job seekers apply. Applying twice to the same job with the same phone keeps the first application. */
export async function applyToJobAction(input: unknown): Promise<PublicActionResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return botOk;
  if (await limited("job-apply", 10, 60 * 30)) return { ok: false, error: "rateLimited" };
  try {
    const job = await db.jobPost.findFirst({
      where: { id: d.jobId, status: "PUBLISHED", OR: [{ deadline: null }, { deadline: { gte: new Date() } }] },
      select: { id: true, title: true, memberId: true },
    });
    if (!job) return { ok: false, error: "jobClosed" };
    const me = await getMember();
    await db.jobApplication.create({
      data: {
        memberId: me?.id ?? null,
        jobId: job.id,
        name: d.name,
        phone: d.phone,
        education: d.education,
        field: d.field,
        experience: d.experience ?? 0,
        skills: d.skills,
        message: d.message,
      },
    });
    await notify(job.memberId, "NEW_APPLICANT", { title: job.title }, `/account/employer/jobs/${job.id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: true };
    console.error("[job apply]", e);
    return { ok: false, error: "generic" };
  }
}

/** Skilled workers and graduates join the private talent pool. */
export async function createSeekerAction(input: unknown): Promise<PublicActionResult> {
  const parsed = seekerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return botOk;
  if (await limited("job-seeker", 4, 60 * 60)) return { ok: false, error: "rateLimited" };
  if (!(await areActiveValues("sector", d.sector))) return { ...badChoice, fieldErrors: { sector: ["required"] } };
  try {
    await db.jobSeeker.create({
      data: {
        name: d.name,
        phone: d.phone,
        seekerType: d.seekerType,
        profession: d.profession,
        sector: d.sector,
        education: d.education,
        field: d.field,
        graduationYear: d.graduationYear,
        experience: d.experience ?? 0,
        skills: d.skills,
        about: d.about,
        languages: d.languages,
        certifications: d.certifications,
        projects: d.projects,
        portfolioUrl: d.portfolioUrl,
        availability: d.availability,
        // Public profiles still wait for staff (status NEW) before they are listed.
        visibility: d.makePublic ? "PUBLIC" : "PRIVATE",
        displayName: d.name.split(/\s+/)[0].slice(0, 40),
        areaId: await validArea(d.areaId),
      },
    });
    return { ok: true };
  } catch (e) {
    console.error("[job seeker]", e);
    return { ok: false, error: "generic" };
  }
}

/** Tutors apply to be listed. Staff check them before the profile goes live. */
export async function createTutorAction(input: unknown): Promise<PublicActionResult> {
  const parsed = tutorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return botOk;
  if (await limited("tutor-join", 3, 60 * 60)) return { ok: false, error: "rateLimited" };
  if (!(await areActiveValues("subject", d.subjects))) return { ...badChoice, fieldErrors: { subjects: ["required"] } };
  try {
    const areaId = await validArea(d.areaId);
    // Only the first name is shown publicly.
    const displayName = d.fullName.split(/\s+/)[0].slice(0, 40);
    await db.$transaction(async (tx) => {
      const refCode = await nextRefCode(tx, "T");
      await tx.tutor.create({
        data: {
          refCode,
          slug: listingSlug(`${displayName} tutor`, refCode),
          displayName,
          fullName: d.fullName,
          phone: d.phone,
          subjects: d.subjects,
          levels: d.levels,
          modes: d.modes,
          education: d.education,
          field: d.field,
          experienceYears: d.experienceYears ?? 0,
          bio: d.bio,
          availability: d.availability,
          hourlyRate: d.hourlyRate,
          monthlyRate: d.monthlyRate,
          languages: d.languages,
          areaId,
        },
      });
    });
    return { ok: true };
  } catch (e) {
    console.error("[tutor join]", e);
    return { ok: false, error: "generic" };
  }
}

/** Families and students ask for a tutor (a specific one, or any good match). */
export async function createTutorRequestAction(input: unknown): Promise<PublicActionResult> {
  const parsed = tutorRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return botOk;
  if (await limited("tutor-request", 6, 60 * 30)) return { ok: false, error: "rateLimited" };
  if (!(await areActiveValues("subject", d.subject))) return { ...badChoice, fieldErrors: { subject: ["required"] } };
  try {
    const tutor = d.tutorId ? await db.tutor.findFirst({ where: { id: d.tutorId, status: "ACTIVE" }, select: { id: true } }) : null;
    const me = await getMember();
    await db.tutorRequest.create({
      data: {
        memberId: me?.id ?? null,
        tutorId: tutor?.id ?? null,
        name: d.name,
        phone: d.phone,
        subject: d.subject,
        level: d.level,
        mode: d.mode,
        areaId: await validArea(d.areaId),
        schedule: d.schedule,
        budget: d.budget,
        message: d.message,
      },
    });
    return { ok: true };
  } catch (e) {
    console.error("[tutor request]", e);
    return { ok: false, error: "generic" };
  }
}

/**
 * A family reviews a tutor. Reviews are shown only after staff approve them, and
 * are marked "verified" when the phone matches a request staff matched to that tutor.
 * One review per phone per tutor; a second one updates the first.
 */
export async function createTutorReviewAction(input: unknown): Promise<PublicActionResult> {
  const parsed = tutorReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return botOk;
  if (await limited("tutor-review", 3, 60 * 60)) return { ok: false, error: "rateLimited" };
  try {
    const tutor = await db.tutor.findFirst({ where: { id: d.tutorId, status: "ACTIVE" }, select: { id: true } });
    if (!tutor) return { ok: false, error: "generic" };
    const match = await db.tutorRequest.findFirst({
      where: { tutorId: tutor.id, phone: d.phone, status: { in: ["MATCHED", "COMPLETED"] } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    const data = {
      name: d.name.split(/\s+/)[0].slice(0, 40),
      rating: d.rating,
      comment: d.comment,
      requestId: match?.id ?? null,
      verified: !!match,
      status: "PENDING" as const,
    };
    await db.tutorReview.upsert({
      where: { tutorId_phone: { tutorId: tutor.id, phone: d.phone } },
      create: { tutorId: tutor.id, phone: d.phone, ...data },
      update: data,
    });
    return { ok: true };
  } catch (e) {
    console.error("[tutor review]", e);
    return { ok: false, error: "generic" };
  }
}

/** An employer asks BrokerSodo to connect them with a listed candidate. */
export async function createTalentRequestAction(input: unknown): Promise<PublicActionResult> {
  const parsed = talentRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return botOk;
  if (await limited("talent-request", 6, 60 * 30)) return { ok: false, error: "rateLimited" };
  try {
    const seeker = await db.jobSeeker.findFirst({ where: { id: d.seekerId, visibility: "PUBLIC", status: "ACTIVE" }, select: { id: true } });
    if (!seeker) return { ok: false, error: "generic" };
    const me = await getMember();
    await db.talentRequest.create({
      data: { memberId: me?.id ?? null, seekerId: seeker.id, employerName: d.employerName, contactName: d.contactName, phone: d.phone, message: d.message },
    });
    return { ok: true };
  } catch (e) {
    console.error("[talent request]", e);
    return { ok: false, error: "generic" };
  }
}
