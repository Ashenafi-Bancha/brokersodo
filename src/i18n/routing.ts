import { defineRouting } from "next-intl/routing";

/**
 * Supported locales. To add Wolaita later:
 *   1. add "wo" here and to LOCALE_LABELS
 *   2. create messages/wo.json (copy en.json and translate)
 */
export const routing = defineRouting({
  locales: ["en", "am"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<Locale, { short: string; long: string }> = {
  en: { short: "EN", long: "English" },
  am: { short: "አማ", long: "አማርኛ" },
};
