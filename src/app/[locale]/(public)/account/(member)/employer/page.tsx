import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck, Clock, Plus, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ScopedIntl } from "@/components/scoped-intl";
import { CloseJobButton, CompanyForm } from "@/components/account/account-forms";
import { Empty, Panel, StatusPill } from "@/components/account/status-pill";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireMemberPage } from "@/lib/member-auth";
import { localized } from "@/lib/utils";
import { getAreas } from "@/server/queries/public";
import type { CompanyInput } from "@/lib/validators/member";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("tabEmployer") };
}

export default async function EmployerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireMemberPage(locale, "/account/employer");
  const [t, areas, company, jobs] = await Promise.all([
    getTranslations("account"),
    getAreas(),
    db.company.findUnique({ where: { memberId: me.id } }),
    db.jobPost.findMany({
      where: { memberId: me.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        refCode: true,
        title: true,
        slug: true,
        status: true,
        deadline: true,
        createdAt: true,
        _count: { select: { applications: true } },
      },
    }),
  ]);
  const initial: Partial<CompanyInput> | undefined = company
    ? { name: company.name, sector: company.sector as CompanyInput["sector"], about: company.about ?? "", website: company.website ?? "", areaId: company.areaId ?? "" }
    : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
      <Panel
        title={t("companyProfile")}
        action={
          company ? (
            company.verified ? (
              <StatusPill status="ACTIVE" label={t("companyVerified")} />
            ) : (
              <StatusPill status="PENDING" label={t("companyUnverified")} />
            )
          ) : undefined
        }
      >
        <p className="mb-4 flex gap-2 text-sm text-fg-2">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-sold" aria-hidden /> {company?.verified ? t("verifiedNote") : t("verifyNote")}
        </p>
        <ScopedIntl namespaces={["account", "form", "catalog"]}>
          <CompanyForm initial={initial} areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} />
        </ScopedIntl>
      </Panel>

      <Panel
        title={t("myJobs")}
        action={
          company ? (
            <Button asChild size="sm">
              <Link href="/account/employer/post">
                <Plus /> {t("postJob")}
              </Link>
            </Button>
          ) : undefined
        }
      >
        {!company ? (
          <Empty>{t("companyFirst")}</Empty>
        ) : jobs.length === 0 ? (
          <Empty>{t("noJobs")}</Empty>
        ) : (
          <ScopedIntl namespaces={["account", "form"]}>
            <ul className="divide-y divide-line">
              {jobs.map((j) => {
                const expired = j.status === "PUBLISHED" && j.deadline && j.deadline < new Date();
                const status = expired ? "CLOSED" : j.status;
                return (
                  <li key={j.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      {j.status === "PUBLISHED" ? (
                        <Link href={`/jobs/${j.slug}`} className="font-semibold text-fg hover:text-primary">
                          {j.title}
                        </Link>
                      ) : (
                        <p className="font-semibold text-fg">{j.title}</p>
                      )}
                      <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                        <span className="font-mono">{j.refCode}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" /> {formatDate(j.createdAt, locale)}
                        </span>
                      </p>
                    </div>
                    <StatusPill status={status} label={t(`jobStatus.${status}` as "jobStatus.PENDING")} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/account/employer/jobs/${j.id}`}>
                        <Users /> {t("applicantsCount", { count: j._count.applications })}
                      </Link>
                    </Button>
                    {["PENDING", "UNDER_REVIEW", "PUBLISHED"].includes(j.status) && !expired && <CloseJobButton id={j.id} />}
                  </li>
                );
              })}
            </ul>
          </ScopedIntl>
        )}
      </Panel>
    </div>
  );
}
