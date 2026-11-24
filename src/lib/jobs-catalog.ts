/**
 * Fixed option lists for jobs and tutors. Labels live in messages/*.json under
 * `catalog.<group>.<value>`, so adding a value here needs a translation too.
 */

export const JOB_SECTORS = [
  "EDUCATION",
  "HEALTH",
  "FINANCE",
  "SALES",
  "OFFICE",
  "IT",
  "ENGINEERING",
  "CONSTRUCTION",
  "HOTEL",
  "DRIVING",
  "AGRICULTURE",
  "NGO",
  "TRADES",
  "SECURITY",
  "OTHER",
] as const;

export const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", "INTERNSHIP", "DAILY"] as const;

/** Who the job is meant for. */
export const JOB_AUDIENCES = ["ANY", "GRADUATE", "SKILLED"] as const;
export const SEEKER_TYPES = ["GRADUATE", "SKILLED"] as const;

export const EDUCATION_LEVELS = ["NONE", "GRADE_10", "GRADE_12", "TVET", "DIPLOMA", "DEGREE", "MASTERS"] as const;

export const SALARY_PERIODS = ["MONTH", "DAY", "HOUR"] as const;

export const TUTOR_SUBJECTS = [
  "MATHS",
  "ENGLISH",
  "AMHARIC",
  "PHYSICS",
  "CHEMISTRY",
  "BIOLOGY",
  "SOCIAL",
  "ICT",
  "ACCOUNTING",
  "WOLAITTATTO",
  "EXAM_PREP",
  "ALL_SUBJECTS",
] as const;

export const TUTOR_LEVELS = ["KG", "PRIMARY", "MIDDLE", "SECONDARY", "PREPARATORY", "UNIVERSITY"] as const;

export const TUTOR_MODES = ["HOME", "ONLINE", "CENTER"] as const;

export type JobSector = (typeof JOB_SECTORS)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type JobAudience = (typeof JOB_AUDIENCES)[number];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export type TutorSubject = (typeof TUTOR_SUBJECTS)[number];
export type TutorLevel = (typeof TUTOR_LEVELS)[number];
export type TutorMode = (typeof TUTOR_MODES)[number];

/** A typed membership check for values that come from the URL or the database. */
export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/**
 * Words that often appear in job scams (asking applicants to pay). Staff see a
 * warning on posts that contain them; nothing is blocked automatically.
 */
const RISK_PATTERNS = [
  /\b(registration|application|processing|training|medical|visa)\s+fee/i,
  /\bpay\s+(a\s+)?(fee|deposit|money|birr)/i,
  /\bdeposit\b/i,
  /\bsend\s+(money|birr|airtime|card)/i,
  /\bguaranteed\s+(job|visa|income)/i,
  /\babroad\b|\bdubai\b|\bsaudi\b/i,
  /ክፍያ|ገንዘብ\s*ይላኩ|ቅድመ\s*ክፍያ/,
];

export function riskFlags(...texts: (string | null | undefined)[]): string[] {
  const text = texts.filter(Boolean).join("\n");
  const found = new Set<string>();
  for (const re of RISK_PATTERNS) {
    const m = text.match(re);
    if (m) found.add(m[0].trim());
  }
  return [...found];
}

/** Deadline typed as YYYY-MM-DD means "until the end of that day" in Ethiopia (UTC+3). */
export function deadlineFromDate(date: string): Date {
  return new Date(`${date}T23:59:59+03:00`);
}

/** The YYYY-MM-DD form of a stored deadline, in Ethiopian time. */
export function dateFromDeadline(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date(d));
}

/** Days left until the deadline (0 = closes today, negative = closed). */
export function daysLeft(deadline: Date | string | null | undefined, now = new Date()): number | null {
  if (!deadline) return null;
  const today = deadlineFromDate(dateFromDeadline(now)).getTime();
  return Math.round((new Date(deadline).getTime() - today) / 86_400_000);
}

export const DEFAULT_JOB_DAYS = 30;
