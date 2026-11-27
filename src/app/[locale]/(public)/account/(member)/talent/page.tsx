import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ScopedIntl } from "@/components/scoped-intl";
import { SeekerForm } from "@/components/forms/jobs-forms";
import { WithdrawButton } from "@/components/account/account-forms";
import { Empty, Panel, StatusPill } from "@/components/account/status-pill";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireMemberPage } from "@/lib/member-auth";
import { localized } from "@/lib/utils";
import { getAreas } from "@/server/queries/public";
import type { SeekerInput } from "@/lib/validators/jobs";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("tabTalent") };
}

export default async function MyTalentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireMemberPage(locale, "/account/talent");
  const [t, areas, seeker, applications, saved] = await Promise.all([
    getTranslations("account"),
    getAreas(),
    db.jobSeeker.findUnique({ where: { memberId: me.id } }),
    db.jobApplication.findMany({
      where: { memberId: me.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, status: true, createdAt: true, job: { select: { title: true, slug: true, status: true, employerName: true, showEmployer: true } } },
    }),
    db.savedJob.findMany({
      where: { memberId: me.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { createdAt: true, job: { select: { id: true, title: true, slug: true, status: true, deadline: true } } },
    }),
  ]);

  const initial: Partial<SeekerInput> | undefined = seeker
    ? {
        name: seeker.name,
        seekerType: seeker.seekerType as SeekerInput["seekerType"],
        profession: seeker.profession,
        sector: seeker.sector as SeekerInput["sector"],
        education: seeker.education as SeekerInput["education"],
        field: seeker.field ?? "",
        graduationYear: seeker.graduationYear ? String(seeker.graduationYear) : "",
        experience: String(seeker.experience),
        skills: seeker.skills ?? "",
        about: seeker.about ?? "",
        languages: seeker.languages as SeekerInput["languages"],
        certifications: seeker.certifications ?? "",
        projects: seeker.projects ?? "",
        portfolioUrl: seeker.portfolioUrl ?? "",
        availability: seeker.availability ?? "",
        makePublic: seeker.visibility === "PUBLIC",
        areaId: seeker.areaId ?? "",
        consent: true,
      }
    : { name: me.name };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-brand text-h3 text-fg">{seeker ? t("editTalent") : t("createTalent")}</h2>
          {seeker && <StatusPill status={seeker.status} label={t(`seekerStatus.${seeker.status}` as "seekerStatus.NEW")} />}
          {seeker?.slug && seeker.status === "ACTIVE" && seeker.visibility === "PUBLIC" && (
            <Link href={`/talent/${seeker.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              <ExternalLink className="size-4" /> {t("viewPublic")}
            </Link>
          )}
        </div>
        <p className="mb-4 flex gap-2 rounded-btn bg-bg-2 p-3 text-sm text-fg-2">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {t("talentNote")}
        </p>
        <ScopedIntl namespaces={["jobs", "form", "catalog"]}>
          <SeekerForm member={{ phone: me.phone }} initial={initial} areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} />
        </ScopedIntl>
      </div>

      <aside className="flex flex-col gap-6">
        <Panel title={t("myApplications")}>
          {applications.length === 0 ? (
            <Empty>
              {t("noApplications")}{" "}
              <Link href="/jobs" className="font-bold text-primary hover:underline">
                {t("browseJobs")}
              </Link>
            </Empty>
          ) : (
            <ScopedIntl namespaces={["account", "form"]}>
              <ul className="divide-y divide-line">
                {applications.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1.5 py-3">
                    <Link href={`/jobs/${a.job.slug}`} className="font-semibold text-fg hover:text-primary">
                      {a.job.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {a.job.showEmployer ? `${a.job.employerName} · ` : ""}
                      {t("appliedOn", { date: formatDate(a.createdAt, locale) })}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={a.status} label={t(`appStatus.${a.status}` as "appStatus.NEW")} />
                      {!["HIRED", "REJECTED", "WITHDRAWN"].includes(a.status) && <WithdrawButton id={a.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            </ScopedIntl>
          )}
        </Panel>
        <Panel title={t("savedJobs")}>
          {saved.length === 0 ? (
            <Empty>{t("noSavedJobs")}</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {saved.map((s) => (
                <li key={s.job.id} className="flex items-center justify-between gap-2 py-3">
                  <Link href={`/jobs/${s.job.slug}`} className="min-w-0 truncate font-semibold text-fg hover:text-primary">
                    {s.job.title}
                  </Link>
                  {s.job.status !== "PUBLISHED" || (s.job.deadline && s.job.deadline < new Date()) ? (
                    <StatusPill status="CLOSED" label={t("jobStatus.CLOSED")} />
                  ) : (
                    <StatusPill status="PUBLISHED" label={t("jobStatus.PUBLISHED")} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </aside>
    </div>
  );
}
