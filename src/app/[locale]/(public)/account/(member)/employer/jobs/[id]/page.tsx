import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Lock, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ScopedIntl } from "@/components/scoped-intl";
import { ApplicantStatusSelect } from "@/components/account/account-forms";
import { Empty, Panel, StatusPill } from "@/components/account/status-pill";
import { db } from "@/lib/db";
import { formatDate, formatPhoneDisplay } from "@/lib/format";
import { telLink } from "@/lib/contact";
import { requireMemberPage } from "@/lib/member-auth";
import { EMPLOYER_APPLICANT_STATUSES } from "@/lib/validators/member";

// Reads the sign-in cookie, so it renders on every request (also for /am).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("applicants") };
}

/** An employer's applicants for one of their own jobs. Contact details only for verified companies. */
export default async function MyJobApplicantsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const me = await requireMemberPage(locale, `/account/employer/jobs/${id}`);
  const job = await db.jobPost.findFirst({
    where: { id: id.slice(0, 40), memberId: me.id },
    select: {
      title: true,
      refCode: true,
      status: true,
      company: { select: { verified: true } },
      applications: {
        where: { status: { not: "WITHDRAWN" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, phone: true, education: true, field: true, experience: true, skills: true, message: true, status: true, createdAt: true },
      },
    },
  });
  if (!job) notFound();
  const [t, tc] = await Promise.all([getTranslations("account"), getTranslations("catalog")]);
  const verified = !!job.company?.verified;
  const options = EMPLOYER_APPLICANT_STATUSES.map((s) => ({ value: s, label: t(`appStatus.${s}` as "appStatus.NEW") }));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/account/employer" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
        <ArrowLeft className="size-4" /> {t("tabEmployer")}
      </Link>
      <Panel title={`${job.title} · ${job.refCode}`} action={<StatusPill status={job.status} label={t(`jobStatus.${job.status}` as "jobStatus.PENDING")} />}>
        {!verified && (
          <p className="mb-4 flex gap-2 rounded-btn bg-yellow-50 p-3 text-sm text-navy-900">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden /> {t("applicantsLocked")}
          </p>
        )}
        {job.applications.length === 0 ? (
          <Empty>{t("noApplicants")}</Empty>
        ) : (
          <ScopedIntl namespaces={["account", "form"]}>
            <ul className="flex flex-col gap-3">
              {job.applications.map((a) => (
                <li key={a.id} className="rounded-btn border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-fg">{verified ? a.name : `${a.name.split(/\s+/)[0]} ${a.name.split(/\s+/)[1]?.[0] ?? ""}.`}</p>
                      <p className="text-sm text-fg-2">
                        {tc(`education.${a.education}` as "education.DEGREE")}
                        {a.field ? ` · ${a.field}` : ""} · {t("years", { count: a.experience })}
                      </p>
                      <p className="text-xs text-muted">{t("appliedOn", { date: formatDate(a.createdAt, locale) })}</p>
                    </div>
                    {verified ? <ApplicantStatusSelect id={a.id} status={a.status} options={options} /> : <StatusPill status={a.status} label={t(`appStatus.${a.status}` as "appStatus.NEW")} />}
                  </div>
                  {a.skills && <p className="mt-2 text-sm text-fg-2">{a.skills}</p>}
                  {a.message && <p className="mt-2 rounded-btn bg-bg-2 p-2 text-sm whitespace-pre-line text-fg-2">{a.message}</p>}
                  {verified && (
                    <a href={telLink(a.phone)} className="mt-2 inline-flex items-center gap-1.5 font-bold text-primary">
                      <Phone className="size-4" /> {formatPhoneDisplay(a.phone)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </ScopedIntl>
        )}
      </Panel>
    </div>
  );
}
