import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/utils";

/** Locale-aware path: en has no prefix, am gets /am. */
export function localePath(locale: string, path: string) {
  const clean = path === "/" ? "" : path;
  return locale === routing.defaultLocale ? clean || "/" : `/${locale}${clean}`;
}

/** Canonical + hreflang alternates for a public path (path without locale prefix). */
export function alternates(locale: string, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = siteUrl(localePath(l, path));
  languages["x-default"] = siteUrl(localePath(routing.defaultLocale, path));
  return { canonical: siteUrl(localePath(locale, path)), languages };
}

export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
