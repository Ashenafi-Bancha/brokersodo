"use client";
import { useTranslations } from "next-intl";

/** Active job sectors or tutoring subjects, in the order staff set (from the merged translations). */
export function useCatalogList(group: "sector" | "subject"): string[] {
  const t = useTranslations("catalog");
  const key = `active_${group}` as "active_sector";
  return t.has(key) ? t(key).split(",").filter(Boolean) : [];
}
