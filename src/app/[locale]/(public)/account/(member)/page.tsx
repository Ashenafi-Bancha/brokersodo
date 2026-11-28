import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BookOpen, BriefcaseBusiness, GraduationCap, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ScopedIntl } from "@/components/scoped-intl";
import { CancelRequestButton } from "@/components/account/account-forms";
import { Empty, Panel, StatusPill } from "@/components/account/status-pill";
import { Updates } from "@/components/account/updates";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireMemberPage } from "@/lib/member-auth";

// Reads the sign-in cookie, so it renders on every request (also for /am).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title") };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireMemberPage(locale, "/account");
  const [t, tc, m] = await Promise.all([
    getTranslations("account"),
    getTranslations("catalog"),
    db.member.findUnique({
      where: { id: me.id },
      select: {
        seeker: { select: { status: true, visibility: true } },
        tutor: { select: { status: true, _count: { select: { requests: { where: { status: { in: ["NEW", "CONTACTED", "MATCHED"] } } } } } } },
        company: { select: { name: true, verified: true } },
        _count: { select: { applications: true, savedJobs: true, jobs: true } },
        tutorRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, subject: true, level: true, status: true, createdAt: true, tutor: { select: { displayName: true } } },
        },
      },
    }),
  ]);
  if (!m) return null;

  const cards = [
    {
      href: "/account/talent",
      Icon: UserRound,
      title: t("cardTalent"),
      body: m.seeker ? t("cardTalentHas", { apps: m._count.applications, saved: m._count.savedJobs }) : t("cardTalentNone"),
      status: m.seeker ? <StatusPill status={m.seeker.status} label={t(`seekerStatus.${m.seeker.status}` as "seekerStatus.NEW")} /> : null,
      cta: m.seeker ? t("open") : t("cardTalentCta"),
    },
    {
      href: "/account/tutor",
      Icon: GraduationCap,
      title: t("cardTutor"),
      body: m.tutor ? t("cardTutorHas", { count: m.tutor._count.requests }) : t("cardTutorNone"),
      status: m.tutor ? <StatusPill status={m.tutor.status} label={t(`tutorStatus.${m.tutor.status}` as "tutorStatus.PENDING")} /> : null,
      cta: m.tutor ? t("open") : t("cardTutorCta"),
    },
    {
      href: "/account/employer",
      Icon: BriefcaseBusiness,
      title: t("cardEmployer"),
      body: m.company ? t("cardEmployerHas", { name: m.company.name, jobs: m._count.jobs }) : t("cardEmployerNone"),
      status: m.company ? <StatusPill status={m.company.verified ? "ACTIVE" : "PENDING"} label={m.company.verified ? t("companyVerified") : t("companyUnverified")} /> : null,
      cta: m.company ? t("open") : t("cardEmployerCta"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Updates memberId={me.id} />
      <ul className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href} className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-btn bg-yellow-100 text-navy-900">
                <c.Icon className="size-5" aria-hidden />
              </span>
              <h2 className="flex-1 text-lg font-bold text-fg">{c.title}</h2>
              {c.status}
            </div>
            <p className="text-sm text-fg-2">{c.body}</p>
            <Button asChild variant="secondary" size="sm" className="mt-auto self-start">
              <Link href={c.href}>
                {c.cta} <ArrowRight />
              </Link>
            </Button>
          </li>
        ))}
      </ul>

      <Panel
        title={t("myTutorRequests")}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/tutors/request">
              <BookOpen /> {t("newTutorRequest")}
            </Link>
          </Button>
        }
      >
        {m.tutorRequests.length === 0 ? (
          <Empty>{t("noTutorRequests")}</Empty>
        ) : (
          <ScopedIntl namespaces={["account", "form"]}>
            <ul className="divide-y divide-line">
              {m.tutorRequests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">
                      {tc(`subject.${r.subject}` as "subject.MATHS")} · {tc(`level.${r.level}` as "level.KG")}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDate(r.createdAt, locale)}
                      {r.tutor ? ` · ${t("withTutor", { name: r.tutor.displayName })}` : ""}
                    </p>
                  </div>
                  <StatusPill status={r.status} label={t(`requestStatus.${r.status}` as "requestStatus.NEW")} />
                  {["NEW", "CONTACTED", "MATCHED"].includes(r.status) && <CancelRequestButton id={r.id} />}
                </li>
              ))}
            </ul>
          </ScopedIntl>
        )}
      </Panel>
    </div>
  );
}
