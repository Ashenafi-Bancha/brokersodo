import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, Briefcase, Building2, Clock, GraduationCap, MapPin, ShieldAlert, Star, Users, Wrench } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { daysLeft } from "@/lib/jobs-catalog";
import { formatDate, formatETB, relativeTime } from "@/lib/format";
import { cn, localized } from "@/lib/utils";
import type { PublicJob, PublicTutor } from "@/server/queries/jobs";

/** "8,000 – 12,000 ETB / month", "Up to 5,000 ETB / day" or "Salary discussed at interview". */
export function useSalaryText() {
  const t = useTranslations("jobs");
  const tc = useTranslations("catalog");
  return (j: Pick<PublicJob, "salaryMin" | "salaryMax" | "salaryPeriod">) => {
    const per = ` ${tc(`salaryPeriod.${j.salaryPeriod}` as "salaryPeriod.MONTH")}`;
    if (j.salaryMin != null && j.salaryMax != null)
      return j.salaryMin === j.salaryMax ? `${formatETB(j.salaryMin)}${per}` : `${formatETB(j.salaryMin, { suffix: false })} – ${formatETB(j.salaryMax)}${per}`;
    if (j.salaryMax != null) return `${t("salaryUpTo", { amount: formatETB(j.salaryMax) })}${per}`;
    if (j.salaryMin != null) return `${t("salaryFrom", { amount: formatETB(j.salaryMin) })}${per}`;
    return t("salaryOnRequest");
  };
}

/** Deadline chip: "3 days left", "Closes today", "Open until filled" or "This job is closed". */
export function DeadlineText({ deadline, status, className }: { deadline: Date | string | null; status: string; className?: string }) {
  const t = useTranslations("jobs");
  const locale = useLocale();
  const left = daysLeft(deadline);
  if (status !== "PUBLISHED" || (left != null && left < 0)) return <span className={cn("font-semibold text-error", className)}>{t("closed")}</span>;
  if (left == null) return <span className={className}>{t("openUntilFilled")}</span>;
  if (left === 0) return <span className={cn("font-semibold text-error", className)}>{t("closesToday")}</span>;
  return (
    <span className={cn(left <= 3 && "font-semibold text-reserved", className)} title={t("applyBy", { date: formatDate(deadline!, locale) })}>
      {t("daysLeft", { count: left })}
    </span>
  );
}

export function AudienceIcon({ audience, className }: { audience: string; className?: string }) {
  if (audience === "GRADUATE") return <GraduationCap className={className} aria-hidden />;
  if (audience === "SKILLED") return <Wrench className={className} aria-hidden />;
  return <Users className={className} aria-hidden />;
}

export function JobCard({ job, className }: { job: PublicJob; className?: string }) {
  const t = useTranslations("jobs");
  const tc = useTranslations("catalog");
  const locale = useLocale();
  const salary = useSalaryText();
  const area = job.area ? localized(job.area, "name", locale) : null;
  return (
    <article
      data-reveal
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-card bg-surface p-5 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-pop focus-within:shadow-pop motion-reduce:hover:translate-y-0",
        job.featured && "outline-3 outline-yellow-500",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-btn bg-yellow-100 text-navy-900 dark:bg-navy-700 dark:text-white">
          <Briefcase className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug font-bold text-fg">
            <Link prefetch={false} href={`/jobs/${job.slug}`} className="after:absolute after:inset-0 after:rounded-card hover:text-primary">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-2">
            <Building2 className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="truncate">{job.employerName ?? t("confidential")}</span>
            {job.employerName && job.employerVerified && <BadgeCheck className="size-4 shrink-0 text-sold" aria-label={t("verifiedEmployer")} />}
          </p>
        </div>
        {job.featured && (
          <Badge variant="featured" className="shrink-0">
            <Star className="size-3 fill-current" aria-hidden /> {t("featured")}
          </Badge>
        )}
      </div>
      <ul className="flex flex-wrap gap-1.5 text-xs font-semibold">
        <li className="rounded-pill bg-bg-2 px-2.5 py-1 text-fg-2">{tc(`jobType.${job.jobType}` as "jobType.FULL_TIME")}</li>
        {job.audience !== "ANY" && (
          <li className="inline-flex items-center gap-1 rounded-pill bg-blue-50 px-2.5 py-1 text-blue-500 dark:bg-blue-800 dark:text-blue-100">
            <AudienceIcon audience={job.audience} className="size-3.5" /> {tc(`audience.${job.audience}` as "audience.ANY")}
          </li>
        )}
        <li className="rounded-pill bg-bg-2 px-2.5 py-1 text-fg-2">{tc(`sector.${job.sector}` as "sector.OTHER")}</li>
      </ul>
      <p className="font-bold text-primary">{salary(job)}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-4" aria-hidden /> {area ?? "Wolaita Sodo"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-4" aria-hidden /> <DeadlineText deadline={job.deadline} status={job.status} />
        </span>
      </div>
      {job.publishedAt && <p className="sr-only">{t("posted", { when: relativeTime(job.publishedAt, locale) })}</p>}
    </article>
  );
}

export function TutorAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-brand-gradient font-brand text-navy-900", className)}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function TutorCard({ tutor, className }: { tutor: PublicTutor; className?: string }) {
  const t = useTranslations("tutors");
  const tc = useTranslations("catalog");
  const locale = useLocale();
  const area = tutor.area ? localized(tutor.area, "name", locale) : null;
  return (
    <article
      data-reveal
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-card bg-surface p-5 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-pop focus-within:shadow-pop motion-reduce:hover:translate-y-0",
        tutor.featured && "outline-3 outline-yellow-500",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <TutorAvatar name={tutor.displayName} className="size-14 text-2xl" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-fg">
            <Link prefetch={false} href={`/tutors/${tutor.slug}`} className="after:absolute after:inset-0 after:rounded-card hover:text-primary">
              {tutor.displayName}
            </Link>
          </h3>
          <p className="text-sm text-muted">
            {tc(`education.${tutor.education}` as "education.DEGREE")}
            {tutor.field ? ` · ${tutor.field}` : ""}
          </p>
        </div>
        {tutor.isVerified && <BadgeCheck className="size-6 shrink-0 text-sold" aria-label={t("verified")} />}
      </div>
      <ul className="flex flex-wrap gap-1.5 text-xs font-semibold" aria-label={t("subjects")}>
        {tutor.subjects.slice(0, 4).map((s) => (
          <li key={s} className="rounded-pill bg-yellow-100 px-2.5 py-1 text-navy-900 dark:bg-navy-700 dark:text-white">
            {tc(`subject.${s}` as "subject.MATHS")}
          </li>
        ))}
        {tutor.subjects.length > 4 && <li className="rounded-pill bg-bg-2 px-2.5 py-1 text-fg-2">+{tutor.subjects.length - 4}</li>}
      </ul>
      <p className="line-clamp-2 text-sm text-fg-2">{tutor.bio}</p>
      <p className="text-sm text-muted">{tutor.levels.map((l) => tc(`level.${l}` as "level.KG")).join(" · ")}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
        <span className="font-bold text-primary">{tutor.hourlyRate ? t("perHour", { price: formatETB(tutor.hourlyRate) }) : t("rateOnRequest")}</span>
        <span className="inline-flex items-center gap-1 text-muted">
          <MapPin className="size-4" aria-hidden /> {tutor.modes.includes("ONLINE") && !area ? tc("mode.ONLINE") : (area ?? "Wolaita Sodo")}
        </span>
      </div>
    </article>
  );
}

export function SafetyBox({ ns, className }: { ns: "jobs" | "tutors"; className?: string }) {
  const t = useTranslations(ns);
  return (
    <aside className={cn("rounded-card border-2 border-yellow-500 bg-yellow-100/60 p-5 text-navy-900 dark:bg-navy-800 dark:text-white", className)}>
      <h2 className="flex items-center gap-2 font-bold">
        <ShieldAlert className="size-5 text-primary" aria-hidden /> {t("safetyTitle")}
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        {(["safety1", "safety2", "safety3"] as const).map((k) => (
          <li key={k} className="flex gap-2">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-sold" aria-hidden /> {t(k)}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function HowSteps({ ns }: { ns: "jobs" | "tutors" }) {
  const t = useTranslations(ns);
  return (
    <section data-reveal aria-labelledby={`${ns}-how`} className="rounded-card bg-surface p-6 shadow-card sm:p-8">
      <h2 id={`${ns}-how`} className="mb-6 font-brand text-h3 text-fg">
        {t("howTitle")}
      </h2>
      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {([1, 2, 3, 4] as const).map((i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-btn bg-red-500 font-brand text-white">{i}</span>
            <div>
              <p className="font-bold text-fg">{t(`steps.${i}.title` as "steps.1.title")}</p>
              <p className="mt-0.5 text-sm text-muted">{t(`steps.${i}.body` as "steps.1.body")}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Previous / next links that keep the current filters. */
export function Pager({ basePath, params, page, pageCount, label }: { basePath: string; params: Record<string, string | undefined>; page: number; pageCount: number; label: string }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const cls = "inline-flex min-h-11 items-center rounded-btn border-2 border-line px-5 font-bold text-fg hover:border-fg";
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
      {page > 1 && (
        <Link prefetch={false} href={href(page - 1)} className={cls} rel="prev">
          ←
        </Link>
      )}
      <span className="text-sm font-semibold text-muted">{label}</span>
      {page < pageCount && (
        <Link prefetch={false} href={href(page + 1)} className={cls} rel="next">
          →
        </Link>
      )}
    </nav>
  );
}
