"use server";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { STORE_STATUSES } from "@/lib/validators/stores";
import { adminAction, logActivity, revalidatePublic, type ActionResult } from "./_helpers";

/** Approve, hide or reject a business store. */
export async function setStoreStatusAction(id: string, status: string, reason?: string): Promise<ActionResult> {
  return adminAction(["ADMIN", "BROKER"], async (session) => {
    if (!(STORE_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status" };
    const s = status as (typeof STORE_STATUSES)[number];
    const before = await db.store.findUnique({ where: { id }, select: { status: true, publishedAt: true, memberId: true, name: true, refCode: true } });
    if (!before) return { ok: false, error: "Store not found" };
    await db.store.update({
      where: { id },
      data: {
        status: s,
        rejectReason: s === "REJECTED" ? String(reason ?? "").slice(0, 500) || null : null,
        ...(s === "ACTIVE" && !before.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
    if (before.status !== s) await notify(before.memberId, "STORE_STATUS", { name: before.name, status: s }, "/account/store");
    await logActivity(session, "status", "Store", id, `${before.refCode} ${before.name}: ${before.status} → ${s}`);
    revalidatePublic();
    return { ok: true, message: s === "ACTIVE" ? "Store is now live" : `Store marked ${s.toLowerCase()}` };
  });
}

export async function setStoreFeaturedAction(id: string, featured: boolean): Promise<ActionResult> {
  return adminAction(["ADMIN", "BROKER"], async (session) => {
    const s = await db.store.update({ where: { id }, data: { featured: !!featured }, select: { name: true } });
    await logActivity(session, "update", "Store", id, `${s.name} ${featured ? "featured" : "unfeatured"}`);
    revalidatePublic();
    return { ok: true, message: featured ? "Store featured" : "Store no longer featured" };
  });
}

/** Admin only: delete a store and its items. */
export async function deleteStoreAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const s = await db.store.delete({ where: { id }, select: { name: true, refCode: true } });
    await logActivity(session, "delete", "Store", id, `Deleted store ${s.refCode} ${s.name}`);
    revalidatePublic();
    return { ok: true, message: "Store deleted" };
  });
}
