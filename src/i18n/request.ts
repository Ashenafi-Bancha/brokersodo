import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import { catalogMessages } from "@/lib/catalog";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  // English is the fallback for any key missing from another locale.
  const fallback = locale === "en" ? messages : (await import(`../../messages/en.json`)).default;
  // Job sectors and tutoring subjects that staff renamed or added in the admin.
  const catalog = await catalogMessages(locale);
  return {
    locale,
    messages: deepMerge(deepMerge(fallback, messages), { catalog }),
    timeZone: "Africa/Addis_Ababa",
  };
});

type Msgs = Record<string, unknown>;
function deepMerge(base: Msgs, over: Msgs): Msgs {
  const out: Msgs = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && typeof base[k] === "object"
        ? deepMerge(base[k] as Msgs, v as Msgs)
        : v;
  }
  return out;
}
