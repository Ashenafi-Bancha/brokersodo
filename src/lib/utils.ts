import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Absolute site URL without trailing slash. */
export function siteUrl(path = ""): string {
  const base = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Pick the localized field (e.g. titleEn / titleAm) with English fallback. */
export function localized<T extends Record<string, unknown>>(
  obj: T,
  field: string,
  locale: string,
): string {
  const am = obj[`${field}Am`];
  const en = obj[`${field}En`];
  if (locale === "am" && typeof am === "string" && am.trim()) return am;
  return typeof en === "string" ? en : "";
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
