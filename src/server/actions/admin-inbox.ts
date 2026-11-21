"use server";
import { db } from "@/lib/db";
import { inquiryUpdateSchema, rejectSubmissionSchema, wantedUpdateSchema } from "@/lib/validators/admin";
import { adminAction, logActivity, type ActionResult } from "./_helpers";

const STAFF = ["ADMIN", "BROKER"] as const;

/* ---------------- Inquiries (leads) ---------------- */

export async function updateInquiryAction(input: unknown): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const d = inquiryUpdateSchema.parse(input);
    if (d.assignedBrokerId) {
      const b = await db.user.findFirst({ where: { id: d.assignedBrokerId, isActive: true }, select: { id: true } });
      if (!b) return { ok: false, error: "Broker not found" };
    }
    const before = await db.inquiry.findUnique({ where: { id: d.id }, select: { status: true, name: true } });
    if (!before) return { ok: false, error: "Inquiry not found" };
    await db.inquiry.update({
      where: { id: d.id },
      data: {
        ...(d.status ? { status: d.status } : {}),
        ...(d.assignedBrokerId !== undefined ? { assignedBrokerId: d.assignedBrokerId || null } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
      },
    });
    const what = d.status && d.status !== before.status ? `${before.status} → ${d.status}` : d.assignedBrokerId !== undefined ? "assigned" : "notes updated";
    await logActivity(session, d.status ? "status" : "update", "Inquiry", d.id, `Inquiry from ${before.name}: ${what}`);
    return { ok: true, message: "Inquiry updated" };
  });
}

export async function deleteInquiryAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const i = await db.inquiry.delete({ where: { id } });
    await logActivity(session, "delete", "Inquiry", id, `Deleted inquiry from ${i.name}`);
    return { ok: true, message: "Inquiry deleted" };
  });
}

/* ---------------- Submissions ---------------- */

export async function rejectSubmissionAction(input: unknown): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const { id, reason } = rejectSubmissionSchema.parse(input);
    const s = await db.propertySubmission.update({ where: { id }, data: { status: "REJECTED", rejectReason: reason } });
    await logActivity(session, "reject", "PropertySubmission", id, `Rejected “${s.title}”: ${reason}`);
    return { ok: true, message: "Submission rejected" };
  });
}

export async function reopenSubmissionAction(id: string): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const s = await db.propertySubmission.update({ where: { id }, data: { status: "PENDING", rejectReason: null } });
    await logActivity(session, "reopen", "PropertySubmission", id, `Reopened “${s.title}”`);
    return { ok: true, message: "Submission reopened" };
  });
}

export async function saveSubmissionNotesAction(id: string, notes: string): Promise<ActionResult> {
  return adminAction([...STAFF], async () => {
    await db.propertySubmission.update({ where: { id }, data: { staffNotes: String(notes).slice(0, 5000) || null } });
    return { ok: true, message: "Notes saved" };
  });
}

/* ---------------- Wanted requests ---------------- */

export async function updateWantedAction(input: unknown): Promise<ActionResult> {
  return adminAction([...STAFF], async (session) => {
    const d = wantedUpdateSchema.parse(input);
    const w = await db.wantedRequest.update({
      where: { id: d.id },
      data: {
        ...(d.status ? { status: d.status } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        ...(d.matchListingIds ? { matches: { set: d.matchListingIds.map((id) => ({ id })) } } : {}),
      },
    });
    await logActivity(session, d.status ? "status" : "update", "WantedRequest", d.id, `Wanted request from ${w.name}${d.status ? ` → ${d.status}` : ""}${d.matchListingIds ? ` (${d.matchListingIds.length} matches)` : ""}`);
    return { ok: true, message: "Wanted request updated" };
  });
}

/** Suggest listings for a wanted request: same category/deal, within budget, by area. */
export async function suggestMatchesAction(id: string) {
  const res = await adminAction([...STAFF], async () => {
    const w = await db.wantedRequest.findUnique({ where: { id } });
    if (!w) return { ok: false, error: "Not found" };
    const rows = await db.listing.findMany({
      where: {
        status: { in: ["PUBLISHED", "RESERVED"] },
        dealType: w.dealType,
        ...(w.categoryId ? { categoryId: w.categoryId } : {}),
        ...(w.budgetMax ? { OR: [{ price: { lte: Math.round(w.budgetMax * 1.1) } }, { priceOnRequest: true }] } : {}),
        ...(w.budgetMin ? { price: { gte: Math.round(w.budgetMin * 0.8) } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 24,
      select: { id: true, refCode: true, titleEn: true, price: true, areaId: true },
    });
    const sorted = w.areaId ? [...rows.filter((r) => r.areaId === w.areaId), ...rows.filter((r) => r.areaId !== w.areaId)] : rows;
    return { ok: true, data: sorted.map(({ areaId: _a, ...r }) => r) };
  });
  return res.ok ? (res.data ?? []) : [];
}
