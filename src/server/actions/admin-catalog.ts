"use server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { CATALOG_GROUPS, CATALOG_TAG, catalogValueFrom, getCatalog } from "@/lib/catalog";
import { adminAction, logActivity, revalidatePublic, type ActionResult } from "./_helpers";

const optionSchema = z.object({
  group: z.enum(CATALOG_GROUPS),
  /** Empty for a new option; the key is made from the English label. */
  value: z.string().max(40).optional().nullable(),
  labelEn: z.string().trim().min(2, "English name is too short").max(60),
  labelAm: z.string().trim().max(60).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

/** Rename, reorder, hide/show a sector or subject, or add a new one. Keys never change. */
export async function saveCatalogOptionAction(input: unknown): Promise<ActionResult> {
  return adminAction(["ADMIN"], async (session) => {
    const parsed = optionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the fields" };
    const d = parsed.data;
    const existing = await getCatalog(d.group);
    let value = d.value?.trim() || "";
    if (!value) {
      value = catalogValueFrom(d.labelEn);
      if (value.length < 2 || !/^[A-Z]/.test(value)) return { ok: false, error: "Start the English name with a letter" };
      if (existing.some((i) => i.value === value)) return { ok: false, error: "That name already exists. Edit it in the list instead." };
    } else if (!existing.some((i) => i.value === value)) {
      return { ok: false, error: "Unknown option" };
    }
    if (!d.isActive && existing.filter((i) => i.isActive && i.value !== value).length === 0) {
      return { ok: false, error: "Keep at least one option visible" };
    }
    await db.catalogOption.upsert({
      where: { group_value: { group: d.group, value } },
      create: { group: d.group, value, labelEn: d.labelEn, labelAm: d.labelAm || null, sortOrder: d.sortOrder, isActive: d.isActive },
      update: { labelEn: d.labelEn, labelAm: d.labelAm || null, sortOrder: d.sortOrder, isActive: d.isActive },
    });
    await logActivity(session, d.value ? "update" : "create", "CatalogOption", `${d.group}:${value}`, `${d.group === "sector" ? "Job sector" : "Tutor subject"} “${d.labelEn}”${d.isActive ? "" : " (hidden)"}`);
    revalidateTag(CATALOG_TAG);
    revalidatePublic();
    return { ok: true, message: d.value ? "Saved" : `Added “${d.labelEn}”` };
  });
}
