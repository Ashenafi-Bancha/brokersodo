"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getMember } from "@/lib/member-auth";
import { rateLimit } from "@/lib/rate-limit";
import { listingSlug, nextRefCode } from "@/lib/ref-code";
import { deadlineFromDate, splitSkills } from "@/lib/jobs-catalog";
import { jobPostSchema, seekerSchema, tutorSchema } from "@/lib/validators/jobs";
import { EMPLOYER_APPLICANT_STATUSES, companySchema } from "@/lib/validators/member";
import type { PublicActionResult } from "./public";

/**
 * Everything a signed-in member can do to their own data. Every action re-reads the
 * member from the session cookie and checks ownership in the database; nothing trusts
 * ids sent by the browser without that check.
 */

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "_")] ??= []).push(i.message);
  return out;
}

async function validArea(id: string | null | undefined) {
  if (!id) return null;
  return (await db.area.findFirst({ where: { id, isActive: true }, select: { id: true } }))?.id ?? null;
}

const done = () => {
  revalidatePath("/[locale]/account", "layout");
  return { ok: true as const };
};

/* ---------------- Talent profile ---------------- */

export async function saveMyTalentAction(input: unknown): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const parsed = seekerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (!(await rateLimit(`member-save:${me.id}`, 30, 60 * 60)).ok) return { ok: false, error: "rateLimited" };
  const data = {
    name: d.name,
    // The profile always uses the account's phone, so nobody can list someone else's number.
    phone: me.phone,
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
    visibility: d.makePublic ? "PUBLIC" : "PRIVATE",
    displayName: d.name.split(/\s+/)[0].slice(0, 40),
    areaId: await validArea(d.areaId),
  };
  const existing = await db.jobSeeker.findUnique({ where: { memberId: me.id }, select: { id: true, status: true, visibility: true } });
  if (existing) {
    // A public profile is checked again after the owner edits it.
    const recheck = existing.status === "ACTIVE" && data.visibility === "PUBLIC";
    await db.jobSeeker.update({ where: { id: existing.id }, data: { ...data, ...(recheck ? { status: "NEW", isVerified: false } : {}) } });
  } else {
    await db.jobSeeker.create({ data: { ...data, memberId: me.id } });
  }
  return done();
}

/* ---------------- Tutor profile ---------------- */

export async function saveMyTutorAction(input: unknown): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const parsed = tutorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (!(await rateLimit(`member-save:${me.id}`, 30, 60 * 60)).ok) return { ok: false, error: "rateLimited" };
  const displayName = d.fullName.split(/\s+/)[0].slice(0, 40);
  const data = {
    displayName,
    fullName: d.fullName,
    phone: me.phone,
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
    areaId: await validArea(d.areaId),
  };
  const existing = await db.tutor.findUnique({ where: { memberId: me.id }, select: { id: true, status: true } });
  if (existing) {
    // Edits to a live profile are checked again before they show.
    await db.tutor.update({ where: { id: existing.id }, data: { ...data, ...(existing.status === "ACTIVE" ? { status: "PENDING" } : {}) } });
  } else {
    await db.$transaction(async (tx) => {
      const refCode = await nextRefCode(tx, "T");
      await tx.tutor.create({ data: { ...data, refCode, slug: listingSlug(`${displayName} tutor`, refCode), memberId: me.id } });
    });
  }
  return done();
}

/** A tutor accepts or declines a family that staff sent them. */
export async function respondToTutorRequestAction(id: string, answer: string): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  if (answer !== "ACCEPTED" && answer !== "DECLINED") return { ok: false, error: "generic" };
  const tutor = await db.tutor.findUnique({ where: { memberId: me.id }, select: { id: true } });
  if (!tutor) return { ok: false, error: "generic" };
  const r = await db.tutorRequest.updateMany({
    where: { id: String(id).slice(0, 40), tutorId: tutor.id, status: { in: ["NEW", "CONTACTED", "MATCHED"] } },
    data: { tutorResponse: answer, respondedAt: new Date() },
  });
  if (r.count === 0) return { ok: false, error: "generic" };
  return done();
}

/** A family cancels their own open request. */
export async function cancelMyTutorRequestAction(id: string): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const r = await db.tutorRequest.updateMany({
    where: { id: String(id).slice(0, 40), memberId: me.id, status: { in: ["NEW", "CONTACTED", "MATCHED"] } },
    data: { status: "CANCELLED" },
  });
  if (r.count === 0) return { ok: false, error: "generic" };
  return done();
}

/* ---------------- Employer ---------------- */

export async function saveMyCompanyAction(input: unknown): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  const data = { name: d.name, sector: d.sector, about: d.about, website: d.website, areaId: await validArea(d.areaId) };
  const existing = await db.company.findUnique({ where: { memberId: me.id }, select: { id: true, name: true } });
  if (existing) {
    // A new company name has to be verified again.
    await db.company.update({ where: { id: existing.id }, data: { ...data, ...(existing.name !== d.name ? { verified: false } : {}) } });
  } else {
    await db.company.create({ data: { ...data, memberId: me.id } });
  }
  return done();
}

/** Employers post from their dashboard. Like the public form, staff review every post first. */
export async function postMyJobAction(input: unknown): Promise<PublicActionResult<{ ref: string }>> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const company = await db.company.findUnique({ where: { memberId: me.id }, select: { id: true, name: true, verified: true } });
  if (!company) return { ok: false, error: "noCompany" };
  const parsed = jobPostSchema.safeParse({ ...(input as object), employerName: company.name, contactName: me.name, contactPhone: me.phone });
  if (!parsed.success) return { ok: false, error: "invalid", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  if (d.website) return { ok: true };
  if (!(await rateLimit(`member-job:${me.id}`, 10, 24 * 60 * 60)).ok) return { ok: false, error: "rateLimited" };
  const job = await db.$transaction(async (tx) => {
    const refCode = await nextRefCode(tx, "J");
    return tx.jobPost.create({
      data: {
        refCode,
        slug: listingSlug(d.title, refCode),
        title: d.title,
        employerName: company.name,
        employerVerified: company.verified,
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
        areaId: await validArea(d.areaId),
        description: d.description,
        requirements: d.requirements,
        responsibilities: d.responsibilities,
        skills: splitSkills(d.skills),
        workMode: d.workMode,
        deadline: d.deadline ? deadlineFromDate(d.deadline) : null,
        contactName: me.name,
        contactPhone: me.phone,
        memberId: me.id,
        companyId: company.id,
      },
      select: { refCode: true },
    });
  });
  revalidatePath("/[locale]/account", "layout");
  return { ok: true, data: { ref: job.refCode } };
}

export async function closeMyJobAction(id: string): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const r = await db.jobPost.updateMany({ where: { id: String(id).slice(0, 40), memberId: me.id, status: { in: ["PENDING", "UNDER_REVIEW", "PUBLISHED"] } }, data: { status: "CLOSED" } });
  if (r.count === 0) return { ok: false, error: "generic" };
  revalidatePath("/[locale]/jobs", "page");
  return done();
}

/** Verified employers move their own applicants through the hiring steps. */
export async function setMyApplicantStatusAction(id: string, status: string): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  if (!(EMPLOYER_APPLICANT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "generic" };
  const company = await db.company.findUnique({ where: { memberId: me.id }, select: { verified: true } });
  if (!company?.verified) return { ok: false, error: "notVerified" };
  const r = await db.jobApplication.updateMany({
    where: { id: String(id).slice(0, 40), job: { memberId: me.id }, status: { not: "WITHDRAWN" } },
    data: { status: status as (typeof EMPLOYER_APPLICANT_STATUSES)[number] },
  });
  if (r.count === 0) return { ok: false, error: "generic" };
  return done();
}

/* ---------------- Job seeker ---------------- */

export async function withdrawMyApplicationAction(id: string): Promise<PublicActionResult> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const r = await db.jobApplication.updateMany({
    where: { id: String(id).slice(0, 40), memberId: me.id, status: { notIn: ["HIRED", "REJECTED", "WITHDRAWN"] } },
    data: { status: "WITHDRAWN" },
  });
  if (r.count === 0) return { ok: false, error: "generic" };
  return done();
}

/** Save or unsave a job. Returns the new state. */
export async function toggleSavedJobAction(jobId: string): Promise<PublicActionResult<{ saved: boolean }>> {
  const me = await getMember();
  if (!me) return { ok: false, error: "signIn" };
  const id = String(jobId).slice(0, 40);
  const key = { memberId_jobId: { memberId: me.id, jobId: id } };
  const existing = await db.savedJob.findUnique({ where: key, select: { jobId: true } });
  if (existing) {
    await db.savedJob.delete({ where: key });
    return { ok: true, data: { saved: false } };
  }
  const job = await db.jobPost.findFirst({ where: { id, status: "PUBLISHED" }, select: { id: true } });
  if (!job) return { ok: false, error: "jobClosed" };
  await db.savedJob.create({ data: { memberId: me.id, jobId: job.id } });
  return { ok: true, data: { saved: true } };
}

/** Lets a job page (cached for everyone) personalise itself after it loads. */
export async function myJobStateAction(jobId: string): Promise<{ signedIn: boolean; saved: boolean; applied: boolean; name?: string; phone?: string }> {
  const me = await getMember();
  if (!me) return { signedIn: false, saved: false, applied: false };
  const id = String(jobId).slice(0, 40);
  const [saved, applied] = await Promise.all([
    db.savedJob.findUnique({ where: { memberId_jobId: { memberId: me.id, jobId: id } }, select: { jobId: true } }),
    db.jobApplication.findFirst({ where: { jobId: id, OR: [{ memberId: me.id }, { phone: me.phone }] }, select: { id: true } }),
  ]);
  return { signedIn: true, saved: !!saved, applied: !!applied, name: me.name, phone: me.phone };
}
