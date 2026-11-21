"use server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { areaFormSchema, categoryFormSchema, reorderSchema } from "@/lib/validators/admin";
import { adminAction, logActivity, revalidatePublic, type ActionResult } from "./_helpers";

/** Categories, attribute schemas and areas — ADMIN only. */

export async function saveCategoryAction(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return adminAction(["ADMIN"], async (session) => {
    const parsed = categoryFormSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
    }
    const d = parsed.data;
    if (id && d.parentId === id) return { ok: false, error: "A category can't be its own parent." };
    const data = { ...d, attributeSchema: d.attributeSchema as unknown as Prisma.InputJsonValue };
    if (id) {
      await db.category.update({ where: { id }, data });
      await logActivity(session, "update", "Category", id, `Updated category “${d.nameEn}” (${d.attributeSchema.length} fields)`);
      revalidatePublic();
      return { ok: true, data: { id }, message: "Category saved" };
    }
    const max = await db.category.aggregate({ _max: { sortOrder: true } });
    const created = await db.category.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    await logActivity(session, "create", "Category", created.id, `Created category “${d.nameEn}”`);
    revalidatePublic();
    return { ok: true, data: { id: created.id }, message: "Category created" };
  });
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const count = await db.listing.count({ where: { categoryId: id } });
    if (count > 0) return { ok: false, error: `This category has ${count} listing(s). Move or delete them first, or deactivate the category.` };
    const c = await db.category.delete({ where: { id } });
    await logActivity(session, "delete", "Category", id, `Deleted category “${c.nameEn}”`);
    revalidatePublic();
    return { ok: true, message: "Category deleted" };
  });
}

export async function reorderCategoriesAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const { ids } = reorderSchema.parse(input);
    await db.$transaction(ids.map((id, i) => db.category.update({ where: { id }, data: { sortOrder: i } })));
    await logActivity(session, "reorder", "Category", null, "Reordered categories");
    revalidatePublic();
    return { ok: true, message: "Order saved" };
  });
}

export async function saveAreaAction(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return adminAction(["ADMIN"], async (session) => {
    const d = areaFormSchema.parse(input);
    if (id) {
      await db.area.update({ where: { id }, data: d });
      await logActivity(session, "update", "Area", id, `Updated area “${d.nameEn}”`);
      revalidatePublic();
      return { ok: true, data: { id }, message: "Area saved" };
    }
    const max = await db.area.aggregate({ _max: { sortOrder: true } });
    const a = await db.area.create({ data: { ...d, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    await logActivity(session, "create", "Area", a.id, `Created area “${d.nameEn}”`);
    revalidatePublic();
    return { ok: true, data: { id: a.id }, message: "Area created" };
  });
}

export async function deleteAreaAction(id: string): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const a = await db.area.delete({ where: { id } }); // listings keep working: areaId is set null
    await logActivity(session, "delete", "Area", id, `Deleted area “${a.nameEn}”`);
    revalidatePublic();
    return { ok: true, message: "Area deleted" };
  });
}

export async function reorderAreasAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const { ids } = reorderSchema.parse(input);
    await db.$transaction(ids.map((id, i) => db.area.update({ where: { id }, data: { sortOrder: i } })));
    await logActivity(session, "reorder", "Area", null, "Reordered areas");
    revalidatePublic();
    return { ok: true, message: "Order saved" };
  });
}
