import "server-only";
import en from "../../messages/en.json";
import { getCatalog } from "@/lib/catalog";

/** English option labels for the admin panel (the admin is English-only). */
export const CATALOG_EN = en.catalog as unknown as Record<string, Record<string, string>>;

/**
 * Admin labels including sectors and subjects that staff renamed or added, plus
 * `_active.sector` / `_active.subject` (comma-separated) for the option lists.
 */
export async function getAdminLabels(): Promise<Record<string, Record<string, string>>> {
  const [sector, subject] = await Promise.all([getCatalog("sector"), getCatalog("subject")]);
  return {
    ...CATALOG_EN,
    sector: Object.fromEntries(sector.map((i) => [i.value, i.labelEn])),
    subject: Object.fromEntries(subject.map((i) => [i.value, i.labelEn])),
    _active: {
      sector: sector.filter((i) => i.isActive).map((i) => i.value).join(","),
      subject: subject.filter((i) => i.isActive).map((i) => i.value).join(","),
    },
  };
}
