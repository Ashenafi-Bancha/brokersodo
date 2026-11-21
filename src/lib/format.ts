/**
 * Ethiopian formatting helpers: ETB prices, phone numbers, relative time (en/am).
 * Pure functions — safe on server and client; covered by unit tests.
 */

export type RentPeriodValue = "DAY" | "MONTH" | "YEAR";

/** 1250000 -> "1,250,000 ETB" */
export function formatETB(amount: number | null | undefined, opts: { suffix?: boolean } = {}): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "";
  const n = Math.round(amount).toLocaleString("en-US");
  return opts.suffix === false ? n : `${n} ETB`;
}

/** Compact: 1250000 -> "1.25M ETB" (for chips / OG images) */
export function formatETBCompact(amount: number): string {
  if (amount >= 1_000_000) return `${trim(amount / 1_000_000)}M ETB`;
  if (amount >= 1_000) return `${trim(amount / 1_000)}K ETB`;
  return `${amount} ETB`;
}
function trim(n: number) {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

const RENT_SUFFIX: Record<string, Record<RentPeriodValue, string>> = {
  en: { DAY: "/ day", MONTH: "/ month", YEAR: "/ year" },
  am: { DAY: "/ በቀን", MONTH: "/ በወር", YEAR: "/ በዓመት" },
};
export function rentSuffix(period: RentPeriodValue | null | undefined, locale = "en"): string {
  if (!period) return "";
  return (RENT_SUFFIX[locale] ?? RENT_SUFFIX.en)[period];
}

/** Parse a user-typed price ("1,250,000", "1.2m", "250k") into integer ETB. */
export function parsePrice(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input) : null;
  const s = input.trim().toLowerCase().replace(/,/g, "").replace(/\s*etb$/, "").replace(/\s+/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (m[2] === "k") v *= 1_000;
  if (m[2] === "m") v *= 1_000_000;
  return Math.round(v);
}

/* ---------------- Phone numbers ---------------- */

/**
 * Normalise an Ethiopian mobile number to E.164 (+2519XXXXXXXX / +2517XXXXXXXX).
 * Accepts: 0911223344, 911223344, +251911223344, 251911223344, 00251911223344,
 * with spaces, dashes or brackets. Returns null if invalid.
 */
export function normalizeEthiopianPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("251")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  // Mobile: 9XXXXXXXX (Ethio telecom) or 7XXXXXXXX (Safaricom)
  if (/^[79]\d{8}$/.test(d)) return `+251${d}`;
  return null;
}

export function isValidEthiopianPhone(input: string | null | undefined): boolean {
  return normalizeEthiopianPhone(input) !== null;
}

/** +251911223344 -> "+251 91 122 3344" */
export function formatPhoneDisplay(e164: string | null | undefined): string {
  const n = normalizeEthiopianPhone(e164 ?? "");
  if (!n) return e164 ?? "";
  const d = n.slice(4);
  return `+251 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

/** For wa.me links: digits only, no plus. */
export function phoneDigits(input: string | null | undefined): string {
  const n = normalizeEthiopianPhone(input ?? "");
  return (n ?? input ?? "").replace(/\D/g, "");
}

/* ---------------- Relative time ---------------- */

type Unit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
const AM_UNITS: Record<Unit, string> = {
  second: "ሰከንድ",
  minute: "ደቂቃ",
  hour: "ሰዓት",
  day: "ቀን",
  week: "ሳምንት",
  month: "ወር",
  year: "ዓመት",
};

export function relativeTime(date: Date | string | number, locale = "en", now: Date = new Date()): string {
  const d = new Date(date);
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const table: [Unit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];
  if (abs < 45) return locale === "am" ? "አሁን" : "just now";
  for (const [unit, secs] of table) {
    if (abs >= secs || unit === "second") {
      const value = Math.round(diffSec / secs);
      if (locale === "am") {
        const n = Math.abs(value);
        return value < 0 ? `ከ${n} ${AM_UNITS[unit]} በፊት` : `በ${n} ${AM_UNITS[unit]} ውስጥ`;
      }
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, unit);
    }
  }
  return "";
}

export function formatDate(date: Date | string, locale = "en"): string {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
