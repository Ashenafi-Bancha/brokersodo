import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useLocale as useLocaleSync, useTranslations as useTranslationsSync } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, BadgeCheck, Briefcase, Building2, CalendarClock, GraduationCap, MapPin, Timer, Users, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/misc";
import { ScopedIntl } from "@/components/scoped-intl";
import { ApplyForm } from "@/components/forms/jobs-forms";
import { AudienceIcon, DeadlineText, JobCard, SafetyBox, useSalaryText } from "@/components/jobs/cards";
import { daysLeft } from "@/lib/jobs-catalog";
import { formatDate, relativeTime } from "@/lib/format";
import { alternates, jsonLdScript } from "@/lib/seo";
import { localized, siteUrl } from "@/lib/utils";
import { getJobBySlug, getSimilarJobs, type PublicJob } from "@/server/queries/jobs";

export const revalidate = 300;

type Params = Promise<{ locale: string; slug: string }>;

const isOpen = (j: PublicJob) => j.status === "PUBLISHED" && (daysLeft(j.deadline) ?? 0) >= 0;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return {};
  const t = await getTranslations({ locale, namespace: "jobs" });
  const employer = job.employerName ?? t("confidential");
  return {
    title: `${job.title} · ${employer}`,
    description: job.description.slice(0, 160),
    alternates: alternates(locale, `/jobs/${job.slug}`),
    robots: isOpen(job) ? undefined : { index: false, follow: true },
    openGraph: { title: `${job.title} · ${employer}`, description: job.description.slice(0, 160), type: "website" },
  };
}

const EMPLOYMENT_TYPE: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR",
  TEMPORARY: "TEMPORARY",
  INTERNSHIP: "INTERN",
  DAILY: "PER_DIEM",
};

/** Google for Jobs markup. Only added while the job is open, and only with what the page shows. */
function jobPostingLd(job: PublicJob, url: string, confidential: string) {
  const unit = { MONTH: "MONTH", DAY: "DAY", HOUR: "HOUR" }[job.salaryPeriod] ?? "MONTH";
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: [job.description, job.requirements].filter(Boolean).join("\n\n").replace(/\n/g, "<br>"),
    identifier: { "@type": "PropertyValue", name: "BrokerSodo", value: job.refCode },
    datePosted: (job.publishedAt ?? job.updatedAt).toISOString(),
    ...(job.deadline ? { validThrough: new Date(job.deadline).toISOString() } : {}),
    employmentType: EMPLOYMENT_TYPE[job.jobType] ?? "OTHER",
    hiringOrganization: { "@type": "Organization", name: job.employerName ?? confidential },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.area?.nameEn ?? "Wolaita Sodo",
        addressCountry: "ET",
      },
    },
    ...(job.salaryMin != null || job.salaryMax != null
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "ETB",
            value: { "@type": "QuantitativeValue", ...(job.salaryMin != null ? { minValue: job.salaryMin } : {}), ...(job.salaryMax != null ? { maxValue: job.salaryMax } : {}), unitText: unit },
          },
        }
      : {}),
    ...(job.minExperience > 0 ? { experienceRequirements: { "@type": "OccupationalExperienceRequirements", monthsOfExperience: job.minExperience * 12 } } : {}),
    totalJobOpenings: job.vacancies,
    directApply: true,
    url,
  };
}

export default async function JobPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const job = await getJobBySlug(slug);
  if (!job) notFound();
  const [t, similar] = await Promise.all([getTranslations("jobs"), getSimilarJobs(job)]);
  const open = isOpen(job);
  const url = siteUrl(`${locale === "am" ? "/am" : ""}/jobs/${job.slug}`);
  return (
    <>
      {open && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jobPostingLd(job, url, t("confidential")))} />}
      <Container className="py-6 sm:py-10">
        <Link prefetch={false} href="/jobs" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <ArrowLeft className="size-4" /> {t("backToJobs")}
        </Link>
        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <article className="min-w-0">
            <JobHeader job={job} />
            {!open && (
              <p role="status" className="mt-6 rounded-btn bg-red-50 px-4 py-3 font-semibold text-error dark:bg-error/20 dark:text-red-200">
                {t("closed")}. {t("closedBody")}
              </p>
            )}
            <JobFacts job={job} />
            <section className="mt-8">
              <h2 className="font-brand text-h3 text-fg">{t("aboutRole")}</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-fg-2">{job.description}</p>
            </section>
            {job.requirements && (
              <section className="mt-8">
                <h2 className="font-brand text-h3 text-fg">{t("requirements")}</h2>
                <p className="mt-3 leading-relaxed whitespace-pre-line text-fg-2">{job.requirements}</p>
              </section>
            )}
            <p className="mt-8 text-sm text-muted">
              {t("ref")} <span className="font-mono font-bold text-fg">{job.refCode}</span>
              {job.publishedAt && <> · {t("posted", { when: relativeTime(job.publishedAt, locale) })}</>}
            </p>
          </article>

          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            {open && (
              <section id="apply" aria-labelledby="apply-title" className="rounded-card bg-surface p-5 shadow-card sm:p-6">
                <h2 id="apply-title" className="font-brand text-h3 text-fg">
                  {t("applyTitle")}
                </h2>
                <p className="mt-1 mb-4 text-sm text-fg-2">{t("applyIntro")}</p>
                <ScopedIntl namespaces={["jobs", "form", "catalog"]}>
                  <ApplyForm jobId={job.id} />
                </ScopedIntl>
              </section>
            )}
            <SafetyBox ns="jobs" />
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-5 font-brand text-h3 text-fg">{t("similar")}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((j) => (
                <li key={j.id}>
                  <JobCard job={j} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </>
  );
}

function JobHeader({ job }: { job: PublicJob }) {
  const t = useTranslationsSync("jobs");
  return (
    <header className="rounded-card bg-surface p-5 shadow-card sm:p-7">
      <div className="flex items-start gap-4">
        <span className="hidden size-16 shrink-0 place-items-center rounded-card bg-yellow-100 text-navy-900 sm:grid dark:bg-navy-700 dark:text-white">
          <Briefcase className="size-8" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="font-brand text-[clamp(1.6rem,3.5vw,2.4rem)] leading-tight text-fg">{job.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-lg text-fg-2">
            <Building2 className="size-5 text-muted" aria-hidden />
            {job.employerName ?? t("confidential")}
            {job.employerName && job.employerVerified && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-[#DCFCE7] px-2.5 py-0.5 text-sm font-bold text-sold dark:bg-sold/25 dark:text-[#86efac]">
                <BadgeCheck className="size-4" aria-hidden /> {t("verifiedEmployer")}
              </span>
            )}
          </p>
        </div>
      </div>
    </header>
  );
}

function JobFacts({ job }: { job: PublicJob }) {
  const t = useTranslationsSync("jobs");
  const tc = useTranslationsSync("catalog");
  const locale = useLocaleSync();
  const salary = useSalaryText();
  const facts: [React.ElementType, string, React.ReactNode][] = [
    [Wallet, "", <span key="s" className="font-bold text-primary">{salary(job)}</span>],
    [MapPin, t("location"), job.area ? localized(job.area, "name", locale) : "Wolaita Sodo"],
    [Briefcase, t("type"), tc(`jobType.${job.jobType}` as "jobType.FULL_TIME")],
    [Users, t("audienceLabel"), (
      <span key="a" className="inline-flex items-center gap-1">
        <AudienceIcon audience={job.audience} className="size-4" /> {tc(`audience.${job.audience}` as "audience.ANY")}
      </span>
    )],
    [GraduationCap, t("educationLabel"), tc(`education.${job.education}` as "education.NONE")],
    [Timer, t("experienceLabel"), t("experience", { count: job.minExperience })],
    [Users, t("vacanciesLabel"), t("vacancies", { count: job.vacancies })],
    [CalendarClock, t("deadlineLabel"), (
      <span key="d">
        {job.deadline ? `${formatDate(job.deadline, locale)} · ` : ""}
        <DeadlineText deadline={job.deadline} status={job.status} />
      </span>
    )],
  ];
  return (
    <section aria-label={t("overview")} className="mt-6">
      <dl className="grid gap-3 sm:grid-cols-2">
        {facts.map(([Icon, label, value], i) => (
          <div key={i} className="flex items-start gap-3 rounded-btn bg-bg-2 p-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              {label ? <dt className="text-xs font-semibold text-muted">{label}</dt> : <dt className="sr-only">{t("overview")}</dt>}
              <dd className="font-semibold text-fg">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

