"use server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sanitizeRichText } from "@/lib/sanitize";
import {
  faqSchema,
  pageSchema,
  reorderSchema,
  settingsSchema,
  testimonialSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validators/admin";
import { adminAction, logActivity, revalidatePublic, type ActionResult } from "./_helpers";

/** Content, settings and users — ADMIN only. */

const fe = (e: { flatten: () => { fieldErrors: unknown } }) => e.flatten().fieldErrors as Record<string, string[]>;

/* ---------- Testimonials ---------- */
export async function saveTestimonialAction(id: string | null, input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (s) => {
    const p = testimonialSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Please check the fields.", fieldErrors: fe(p.error) };
    if (id) await db.testimonial.update({ where: { id }, data: p.data });
    else {
      const max = await db.testimonial.aggregate({ _max: { sortOrder: true } });
      await db.testimonial.create({ data: { ...p.data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    }
    await logActivity(s, id ? "update" : "create", "Testimonial", id, `Testimonial from ${p.data.name}`);
    revalidatePublic();
    return { ok: true, message: "Testimonial saved" };
  });
}
export async function deleteTestimonialAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (s) => {
    const t = await db.testimonial.delete({ where: { id } });
    await logActivity(s, "delete", "Testimonial", id, `Deleted testimonial from ${t.name}`);
    revalidatePublic();
    return { ok: true, message: "Deleted" };
  });
}
export async function reorderTestimonialsAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async () => {
    const { ids } = reorderSchema.parse(input);
    await db.$transaction(ids.map((id, i) => db.testimonial.update({ where: { id }, data: { sortOrder: i } })));
    revalidatePublic();
    return { ok: true, message: "Order saved" };
  });
}

/* ---------- FAQs ---------- */
export async function saveFaqAction(id: string | null, input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (s) => {
    const p = faqSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Please check the fields.", fieldErrors: fe(p.error) };
    if (id) await db.faq.update({ where: { id }, data: p.data });
    else {
      const max = await db.faq.aggregate({ _max: { sortOrder: true } });
      await db.faq.create({ data: { ...p.data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    }
    await logActivity(s, id ? "update" : "create", "Faq", id, p.data.questionEn.slice(0, 80));
    revalidatePublic();
    return { ok: true, message: "FAQ saved" };
  });
}
export async function deleteFaqAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (s) => {
    const f = await db.faq.delete({ where: { id } });
    await logActivity(s, "delete", "Faq", id, f.questionEn.slice(0, 80));
    revalidatePublic();
    return { ok: true, message: "Deleted" };
  });
}
export async function reorderFaqsAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async () => {
    const { ids } = reorderSchema.parse(input);
    await db.$transaction(ids.map((id, i) => db.faq.update({ where: { id }, data: { sortOrder: i } })));
    revalidatePublic();
    return { ok: true, message: "Order saved" };
  });
}

/* ---------- Pages (About, Terms, Privacy…) ---------- */
export async function savePageAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (s) => {
    const p = pageSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Please check the fields.", fieldErrors: fe(p.error) };
    const data = { ...p.data, bodyEn: sanitizeRichText(p.data.bodyEn), bodyAm: p.data.bodyAm ? sanitizeRichText(p.data.bodyAm) : null };
    const page = await db.page.upsert({ where: { slug: data.slug }, update: data, create: data });
    await logActivity(s, "update", "Page", page.id, `Page /${page.slug}`);
    revalidatePublic();
    return { ok: true, message: "Page saved" };
  });
}

/* ---------- Site settings ---------- */
export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (s) => {
    const p = settingsSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fe(p.error) };
    await db.siteSettings.upsert({ where: { id: "site" }, update: p.data, create: { id: "site", ...p.data } });
    await logActivity(s, "update", "SiteSettings", "site", "Updated site settings");
    revalidatePublic();
    return { ok: true, message: "Settings saved" };
  });
}

/* ---------- Users ---------- */
export async function createUserAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (s) => {
    const p = userCreateSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Please check the fields.", fieldErrors: fe(p.error) };
    const { password, ...rest } = p.data;
    const u = await db.user.create({ data: { ...rest, passwordHash: await hashPassword(password) } });
    await logActivity(s, "create", "User", u.id, `Created ${u.role.toLowerCase()} ${u.name} (${u.email})`);
    return { ok: true, message: `${u.name} can now sign in` };
  });
}

export async function updateUserAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (s) => {
    const p = userUpdateSchema.safeParse(input);
    if (!p.success) return { ok: false, error: "Please check the fields.", fieldErrors: fe(p.error) };
    const { id, password, ...rest } = p.data;
    if (id === s.user.id && (!rest.isActive || rest.role !== "ADMIN")) {
      return { ok: false, error: "You can't deactivate or demote your own account." };
    }
    if (rest.role !== "ADMIN" || !rest.isActive) {
      const admins = await db.user.count({ where: { role: "ADMIN", isActive: true, id: { not: id } } });
      if (admins === 0) return { ok: false, error: "There must be at least one active admin." };
    }
    const u = await db.user.update({ where: { id }, data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) } });
    await logActivity(s, "update", "User", id, `Updated ${u.name}${password ? " (password reset)" : ""}${u.isActive ? "" : " — deactivated"}`);
    return { ok: true, message: "User saved" };
  });
}
