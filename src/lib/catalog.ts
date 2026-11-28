import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { JOB_SECTORS, TUTOR_SUBJECTS } from "@/lib/jobs-catalog";
import en from "../../messages/en.json";
import am from "../../messages/am.json";

/**
 * Job sectors and tutoring subjects: the built-in values from code plus what staff changed
 * in the admin (rename, reorder, hide, add). Values are stable keys stored on records, so a
 * hidden value keeps its label for old jobs and profiles but is no longer offered in forms.
 */

export const CATALOG_GROUPS = ["sector", "subject"] as const;
export type CatalogGroup = (typeof CATALOG_GROUPS)[number];
export const CATALOG_TAG = "catalog";

const BUILT_IN: Record<CatalogGroup, readonly string[]> = { sector: JOB_SECTORS, subject: TUTOR_SUBJECTS };
const label = (msgs: unknown, group: CatalogGroup, value: string) =>
  ((msgs as { catalog?: Record<string, Record<string, string>> }).catalog?.[group]?.[value] as string | undefined) ?? undefined;

export type CatalogItem = { value: string; labelEn: string; labelAm: string; sortOrder: number; isActive: boolean; builtIn: boolean; id: string | null };

/** Value key from an English label: "Solar & electrical" → "SOLAR_ELECTRICAL". */
export function catalogValueFrom(labelEn: string) {
  return labelEn
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

const loadRows = unstable_cache(
  async () => db.catalogOption.findMany({ orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }] }),
  ["catalog-options"],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

async function rows() {
  try {
    return await loadRows();
  } catch {
    // The site keeps working with the built-in lists if the table is unreachable.
    return [];
  }
}

/** Every value of a group (active first in display order, then hidden ones). */
export async function getCatalog(group: CatalogGroup): Promise<CatalogItem[]> {
  const custom = (await rows()).filter((r) => r.group === group);
  const byValue = new Map(custom.map((r) => [r.value, r]));
  const items: CatalogItem[] = BUILT_IN[group].map((value, i) => {
    const r = byValue.get(value);
    const labelEn = r?.labelEn || label(en, group, value) || value;
    return {
      id: r?.id ?? null,
      value,
      labelEn,
      labelAm: r?.labelAm || label(am, group, value) || labelEn,
      sortOrder: r?.sortOrder ?? i * 10,
      isActive: r?.isActive ?? true,
      builtIn: true,
    };
  });
  for (const r of custom) {
    if (BUILT_IN[group].includes(r.value)) continue;
    items.push({ id: r.id, value: r.value, labelEn: r.labelEn, labelAm: r.labelAm || r.labelEn, sortOrder: r.sortOrder, isActive: r.isActive, builtIn: false });
  }
  return items.sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.sortOrder - b.sortOrder || a.labelEn.localeCompare(b.labelEn));
}

/** Values offered in forms and filters, in display order. */
export async function getActiveValues(group: CatalogGroup): Promise<string[]> {
  return (await getCatalog(group)).filter((i) => i.isActive).map((i) => i.value);
}

/** True when every value is an active option of the group (server-side check for forms). */
export async function areActiveValues(group: CatalogGroup, values: string | string[] | null | undefined): Promise<boolean> {
  const list = Array.isArray(values) ? values : values ? [values] : [];
  if (list.length === 0) return true;
  const active = new Set(await getActiveValues(group));
  return list.every((v) => active.has(v));
}

/**
 * Catalog text merged into the translations for a locale: labels for every value (old
 * records keep theirs) plus `active_sector` / `active_subject` lists for client forms.
 */
export async function catalogMessages(locale: string) {
  const out: Record<string, Record<string, string> | string> = {};
  for (const group of CATALOG_GROUPS) {
    const items = await getCatalog(group);
    out[group] = Object.fromEntries(items.map((i) => [i.value, locale === "am" ? i.labelAm : i.labelEn]));
    out[`active_${group}`] = items.filter((i) => i.isActive).map((i) => i.value).join(",");
  }
  return out;
}
