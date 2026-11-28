"use server";
import { db } from "@/lib/db";
import { listingSlug, nextRefCode } from "@/lib/ref-code";
import { DEFAULT_JOB_DAYS, deadlineFromDate, dateFromDeadline, splitSkills } from "@/lib/jobs-catalog";
import {
  APPLICATION_STATUSES,
  REVIEW_STATUSES,
  SEEKER_STATUSES,
  TALENT_REQUEST_STATUSES,
  TUTOR_REQUEST_STATUSES,
  TUTOR_STATUSES,
  JOB_STATUSES,
  adminJobSchema,
  adminTalentSchema,
  adminTutorSchema,
  inboxUpdateSchema,
} from "@/lib/validators/jobs";
import { adminAction, logActivity, revalidatePublic, type ActionResult } from "./_helpers";
import { getCatalog } from "@/lib/catalog";
import { notify } from "@/lib/notify";

/** Staff may keep a hidden sector or subject on a record, but not invent one. */
async function knownValues(group: "sector" | "subject", values: string[]) {
  const all = new Set((await getCatalog(group)).map((i) => i.value));
  return values.every((v) => all.has(v));
}

const STAFF = ["ADMIN", "BROKER"] as const;

async function areaOrNull(id: string | null | undefined) {
  if (!id) return null;
  return (await db.area.findUnique({ where: { id }, select: { id: true } }))?.id ?? null;
}

/* ---------------- Job posts ---------------- */

export async function saveJobAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return adminAction([...STAFF], async (session) => {
    const d = adminJobSchema.parse(input);
    if (!(await knownValues("sector", [d.sector]))) return { ok: false, error: "Unknown sector" };
    const before = d.id ? await db.jobPost.findUnique({ where: { id: d.id }, select: { status: true, publishedAt: true, memberId: true } }) : null;
    if (d.id && !before) return { ok: false, error: "Job not found" };
    const publishing = d.status === "PUBLISHED" && before?.status !== "PUBLISHED";
    // A published job always gets a deadline so the board never fills with stale posts.
    let deadline = d.deadline ? deadlineFromDate(d.deadline) : null;
    if (d.status === "PUBLISHED" && !deadline) deadline = deadlineFromDate(dateFromDeadline(new Date(Date.now() + DEFAULT_JOB_DAYS * 86_400_000)));
    const data = {
      title: d.title,
      employerName: d.employerName,
      showEmployer: d.showEmployer,
      employerVerified: d.employerVerified,
      featured: d.featured,
      sector: d.sector,
      jobType: d.jobType,
      audience: d.audience,
      education: d.education,
      minExperience: d.minExperience ?? 0,
      vacancies: d.vacancies ?? 1,
      salaryMin: d.salaryMin,
      salaryMax: d.salaryMax,
      salaryPeriod: d.salaryPeriod,
      areaId: await areaOrNull(d.areaId),
      description: d.description,
      requirements: d.requirements,
      responsibilities: d.responsibilities,
      skills: splitSkills(d.skills),
      workMode: d.workMode,
      howToApply: d.howToApply,
      deadline,
      contactName: d.contactName,
      contactPhone: d.contactPhone,
      staffNotes: d.staffNotes,
      status: d.status,
      ...(d.status !== "REJECTED" ? { rejectReason: null } : {}),
      ...(publishing ? { publishedAt: before?.publishedAt ?? new Date() } : {}),
    };
    const job = d.id
      ? await db.jobPost.update({ where: { id: d.id }, data, select: { id: true, refCode: true, title: true } })
      : await db.$transaction(async (tx) => {
          const refCode = await nextRefCode(tx, "J");
          return tx.jobPost.create({
            data: { ...data, refCode, slug: listingSlug(d.title, refCode), publishedAt: d.status === "PUBLISHED" ? new Date() : null },
            select: { id: true, refCode: true, title: true },
          });
        });
    if (before && before.status !== d.status) await notify(before.memberId, "JOB_STATUS", { title: job.title, status: d.status }, "/account/employer");
    await logActivity(session, d.id ? (publishing ? "publish" : "update") : "create", "JobPost", job.id, `${job.refCode} ${job.title}${publishing ? " published" : ""}`);
    revalidatePublic();
    return { ok: true, data: { id: job.id }, message: publishing ? "Job published" : "Job saved" };
  });
}

export async function setJobStatusAction(id: string, status: string, reason?: string): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    if (!(JOB_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status" };
    const before = await db.jobPost.findUnique({ where: { id }, select: { status: true, deadline: true, publishedAt: true, memberId: true } });
    if (!before) return { ok: false, error: "Job not found" };
    const s = status as (typeof JOB_STATUSES)[number];
    const reopen = s === "PUBLISHED" && (!before.deadline || before.deadline < new Date());
    const job = await db.jobPost.update({
      where: { id },
      data: {
        status: s,
        rejectReason: s === "REJECTED" ? String(reason ?? "").slice(0, 500) || null : null,
        ...(s === "PUBLISHED" && !before.publishedAt ? { publishedAt: new Date() } : {}),
        ...(reopen ? { deadline: deadlineFromDate(dateFromDeadline(new Date(Date.now() + DEFAULT_JOB_DAYS * 86_400_000))) } : {}),
      },
      select: { refCode: true, title: true },
    });
    if (before.status !== s) await notify(before.memberId, "JOB_STATUS", { title: job.title, status: s }, "/account/employer");
    await logActivity(session, "status", "JobPost", id, `${job.refCode} ${job.title}: ${before.status} → ${s}`);
    revalidatePublic();
    return { ok: true, message: s === "PUBLISHED" ? "Job published" : `Job marked ${s.toLowerCase()}` };
  });
}

export async function deleteJobAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const j = await db.jobPost.delete({ where: { id }, select: { refCode: true, title: true } });
    await logActivity(session, "delete", "JobPost", id, `Deleted ${j.refCode} ${j.title} and its applications`);
    revalidatePublic();
    return { ok: true, message: "Job deleted" };
  });
}

/** People from the talent pool who fit a job: same sector and enough education, active first. */
export async function matchSeekersAction(jobId: string) {
  const res = await adminAction([...STAFF], async () => {
    const job = await db.jobPost.findUnique({ where: { id: jobId }, select: { sector: true, audience: true, education: true, minExperience: true } });
    if (!job) return { ok: false, error: "Not found" };
    const { EDUCATION_LEVELS } = await import("@/lib/jobs-catalog");
    const minEdu = Math.max(0, EDUCATION_LEVELS.indexOf(job.education as (typeof EDUCATION_LEVELS)[number]));
    const rows = await db.jobSeeker.findMany({
      where: {
        status: { in: ["NEW", "ACTIVE"] },
        sector: job.sector,
        education: { in: EDUCATION_LEVELS.slice(minEdu) as unknown as string[] },
        ...(job.audience !== "ANY" ? { seekerType: job.audience } : {}),
      },
      orderBy: [{ status: "desc" }, { experience: "desc" }, { createdAt: "desc" }],
      take: 30,
      select: { id: true, name: true, phone: true, profession: true, education: true, experience: true, seekerType: true },
    });
    return { ok: true, data: rows.sort((a, b) => Number(b.experience >= job.minExperience) - Number(a.experience >= job.minExperience)) };
  });
  return res.ok ? (res.data ?? []) : [];
}

/* ---------------- Applications, talent pool, tutor requests ---------------- */

export async function updateApplicationAction(input: unknown): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const d = inboxUpdateSchema.parse(input);
    if (!(APPLICATION_STATUSES as readonly string[]).includes(d.status)) return { ok: false, error: "Unknown status" };
    const prev = await db.jobApplication.findUnique({ where: { id: d.id }, select: { status: true } });
    const a = await db.jobApplication.update({
      where: { id: d.id },
      data: { status: d.status as (typeof APPLICATION_STATUSES)[number], notes: d.notes?.trim() || null },
      select: { name: true, memberId: true, job: { select: { refCode: true, title: true } } },
    });
    if (prev?.status !== d.status) await notify(a.memberId, "APPLICATION_STATUS", { title: a.job.title, status: d.status }, "/account/talent");
    await logActivity(session, "status", "JobApplication", d.id, `${a.name} for ${a.job.refCode} → ${d.status}`);
    return { ok: true, message: "Applicant updated" };
  });
}

export async function updateSeekerAction(input: unknown): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const d = inboxUpdateSchema.parse(input);
    if (!(SEEKER_STATUSES as readonly string[]).includes(d.status)) return { ok: false, error: "Unknown status" };
    const prevSeeker = await db.jobSeeker.findUnique({ where: { id: d.id }, select: { status: true } });
    const s = await db.jobSeeker.update({
      where: { id: d.id },
      data: { status: d.status as (typeof SEEKER_STATUSES)[number], notes: d.notes?.trim() || null },
      select: { name: true, memberId: true },
    });
    if (prevSeeker?.status !== d.status) await notify(s.memberId, "TALENT_STATUS", { status: d.status }, "/account/talent");
    await ensureTalentSlug(d.id);
    await logActivity(session, "status", "JobSeeker", d.id, `Job seeker ${s.name} → ${d.status}`);
    revalidatePublic();
    return { ok: true, message: "Job seeker updated" };
  });
}

export async function updateTutorRequestAction(input: unknown): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const d = inboxUpdateSchema.parse(input);
    if (!(TUTOR_REQUEST_STATUSES as readonly string[]).includes(d.status)) return { ok: false, error: "Unknown status" };
    const tutorId = d.tutorId ? ((await db.tutor.findUnique({ where: { id: d.tutorId }, select: { id: true } }))?.id ?? null) : null;
    const prevReq = await db.tutorRequest.findUnique({ where: { id: d.id }, select: { status: true, tutorId: true } });
    const r = await db.tutorRequest.update({
      where: { id: d.id },
      data: {
        status: d.status as (typeof TUTOR_REQUEST_STATUSES)[number],
        notes: d.notes?.trim() || null,
        ...(d.tutorId !== undefined ? { tutorId } : {}),
      },
      select: { name: true, subject: true, memberId: true, tutorId: true, tutor: { select: { memberId: true } } },
    });
    if (prevReq?.status !== d.status) await notify(r.memberId, "TUTOR_REQUEST_STATUS", { subject: r.subject, status: d.status }, "/account");
    if (r.tutorId && r.tutorId !== prevReq?.tutorId) await notify(r.tutor?.memberId, "NEW_STUDENT", { subject: r.subject }, "/account/tutor");
    await logActivity(session, "status", "TutorRequest", d.id, `Tutor request from ${r.name} → ${d.status}`);
    return { ok: true, message: "Request updated" };
  });
}

/** Personal data: only admins can delete it permanently. */
export async function deletePersonAction(kind: "application" | "seeker" | "tutorRequest" | "talentRequest", id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    if (kind === "application") await db.jobApplication.delete({ where: { id } });
    else if (kind === "seeker") await db.jobSeeker.delete({ where: { id } });
    else if (kind === "tutorRequest") await db.tutorRequest.delete({ where: { id } });
    else if (kind === "talentRequest") await db.talentRequest.delete({ where: { id } });
    else return { ok: false, error: "Unknown record" };
    await logActivity(session, "delete", kind, id, `Deleted ${kind}`);
    return { ok: true, message: "Deleted" };
  });
}

/* ---------------- Tutors ---------------- */

export async function saveTutorAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return adminAction([...STAFF], async (session) => {
    const d = adminTutorSchema.parse(input);
    if (!(await knownValues("subject", d.subjects))) return { ok: false, error: "Unknown subject" };
    const before = d.id ? await db.tutor.findUnique({ where: { id: d.id }, select: { status: true, publishedAt: true, memberId: true } }) : null;
    if (d.id && !before) return { ok: false, error: "Tutor not found" };
    const going = d.status === "ACTIVE" && before?.status !== "ACTIVE";
    const data = {
      displayName: d.displayName,
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
      areaId: await areaOrNull(d.areaId),
      isVerified: d.isVerified,
      featured: d.featured,
      staffNotes: d.staffNotes,
      status: d.status,
      ...(d.status !== "REJECTED" ? { rejectReason: null } : {}),
      ...(going && !before?.publishedAt ? { publishedAt: new Date() } : {}),
    };
    const tutor = d.id
      ? await db.tutor.update({ where: { id: d.id }, data, select: { id: true, refCode: true, displayName: true } })
      : await db.$transaction(async (tx) => {
          const refCode = await nextRefCode(tx, "T");
          return tx.tutor.create({
            data: { ...data, refCode, slug: listingSlug(`${d.displayName} tutor`, refCode), publishedAt: d.status === "ACTIVE" ? new Date() : null },
            select: { id: true, refCode: true, displayName: true },
          });
        });
    if (before && before.status !== d.status) await notify(before.memberId, "TUTOR_STATUS", { status: d.status }, "/account/tutor");
    await logActivity(session, d.id ? (going ? "publish" : "update") : "create", "Tutor", tutor.id, `${tutor.refCode} ${tutor.displayName}${going ? " listed" : ""}`);
    revalidatePublic();
    return { ok: true, data: { id: tutor.id }, message: going ? "Tutor is now live" : "Tutor saved" };
  });
}

export async function setTutorStatusAction(id: string, status: string, reason?: string): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    if (!(TUTOR_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status" };
    const s = status as (typeof TUTOR_STATUSES)[number];
    const before = await db.tutor.findUnique({ where: { id }, select: { publishedAt: true, status: true, memberId: true } });
    if (!before) return { ok: false, error: "Tutor not found" };
    const tu = await db.tutor.update({
      where: { id },
      data: {
        status: s,
        rejectReason: s === "REJECTED" ? String(reason ?? "").slice(0, 500) || null : null,
        ...(s === "ACTIVE" && !before.publishedAt ? { publishedAt: new Date() } : {}),
      },
      select: { refCode: true, displayName: true },
    });
    if (before.status !== s) await notify(before.memberId, "TUTOR_STATUS", { status: s }, "/account/tutor");
    await logActivity(session, "status", "Tutor", id, `${tu.refCode} ${tu.displayName}: ${before.status} → ${s}`);
    revalidatePublic();
    return { ok: true, message: s === "ACTIVE" ? "Tutor is now live" : `Tutor marked ${s.toLowerCase()}` };
  });
}

export async function deleteTutorAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const tu = await db.tutor.delete({ where: { id }, select: { refCode: true, displayName: true } });
    await logActivity(session, "delete", "Tutor", id, `Deleted tutor ${tu.refCode} ${tu.displayName}`);
    revalidatePublic();
    return { ok: true, message: "Tutor deleted" };
  });
}

/* ---------------- Talent profiles ---------------- */

/** A public, active profile needs a stable address on /talent. */
async function ensureTalentSlug(id: string) {
  const p = await db.jobSeeker.findUnique({ where: { id }, select: { slug: true, visibility: true, status: true, displayName: true, name: true, profession: true, publishedAt: true } });
  if (!p || p.visibility !== "PUBLIC" || p.status !== "ACTIVE") return;
  const displayName = p.displayName || p.name.split(/\s+/)[0].slice(0, 40);
  await db.jobSeeker.update({
    where: { id },
    data: {
      displayName,
      ...(p.slug ? {} : { slug: listingSlug(`${displayName} ${p.profession}`, `P${id.slice(-6).toUpperCase()}`) }),
      ...(p.publishedAt ? {} : { publishedAt: new Date() }),
    },
  });
}

export async function saveTalentProfileAction(input: unknown): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const d = adminTalentSchema.parse(input);
    const p = await db.jobSeeker.update({
      where: { id: d.id },
      data: {
        visibility: d.visibility,
        displayName: d.displayName,
        profession: d.profession,
        skills: d.skills,
        about: d.about,
        languages: d.languages,
        certifications: d.certifications,
        projects: d.projects,
        portfolioUrl: d.portfolioUrl,
        availability: d.availability,
        isVerified: d.isVerified,
      },
      select: { name: true },
    });
    await ensureTalentSlug(d.id);
    await logActivity(session, "update", "JobSeeker", d.id, `Talent profile ${p.name} (${d.visibility.toLowerCase()})`);
    revalidatePublic();
    return { ok: true, message: "Talent profile saved" };
  });
}

export async function updateTalentRequestAction(input: unknown): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const d = inboxUpdateSchema.parse(input);
    if (!(TALENT_REQUEST_STATUSES as readonly string[]).includes(d.status)) return { ok: false, error: "Unknown status" };
    const prevTr = await db.talentRequest.findUnique({ where: { id: d.id }, select: { status: true } });
    const r = await db.talentRequest.update({
      where: { id: d.id },
      data: { status: d.status as (typeof TALENT_REQUEST_STATUSES)[number], notes: d.notes?.trim() || null },
      select: { employerName: true, memberId: true, seeker: { select: { profession: true } } },
    });
    if (prevTr?.status !== d.status) await notify(r.memberId, "TALENT_REQUEST_STATUS", { profession: r.seeker?.profession ?? "", status: d.status }, "/account/employer");
    await logActivity(session, "status", "TalentRequest", d.id, `Talent request from ${r.employerName} → ${d.status}`);
    return { ok: true, message: "Request updated" };
  });
}

/* ---------------- Tutor reviews ---------------- */

/** Keeps the tutor's star average in step with approved reviews. */
async function refreshTutorRating(tutorId: string) {
  const agg = await db.tutorReview.aggregate({ where: { tutorId, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  await db.tutor.update({
    where: { id: tutorId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count._all },
  });
}

export async function setReviewStatusAction(id: string, status: string): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    if (!(REVIEW_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status" };
    const r = await db.tutorReview.update({
      where: { id },
      data: { status: status as (typeof REVIEW_STATUSES)[number] },
      select: { tutorId: true, name: true, rating: true, tutor: { select: { refCode: true } } },
    });
    await refreshTutorRating(r.tutorId);
    await logActivity(session, "status", "TutorReview", id, `${r.rating}★ review by ${r.name} for ${r.tutor.refCode} → ${status}`);
    revalidatePublic();
    return { ok: true, message: status === "APPROVED" ? "Review is now public" : `Review marked ${status.toLowerCase()}` };
  });
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const r = await db.tutorReview.delete({ where: { id }, select: { tutorId: true, name: true } });
    await refreshTutorRating(r.tutorId);
    await logActivity(session, "delete", "TutorReview", id, `Deleted review by ${r.name}`);
    revalidatePublic();
    return { ok: true, message: "Review deleted" };
  });
}
