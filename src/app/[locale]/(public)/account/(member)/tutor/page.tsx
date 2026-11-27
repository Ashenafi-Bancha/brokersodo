import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink, Info, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ScopedIntl } from "@/components/scoped-intl";
import { TutorJoinForm } from "@/components/forms/tutors-forms";
import { TutorRequestAnswer } from "@/components/account/account-forms";
import { Stars } from "@/components/jobs/cards";
import { Empty, Panel, StatusPill } from "@/components/account/status-pill";
import { db } from "@/lib/db";
import { formatDate, formatPhoneDisplay } from "@/lib/format";
import { telLink } from "@/lib/contact";
import { requireMemberPage } from "@/lib/member-auth";
import { localized } from "@/lib/utils";
import { getAreas } from "@/server/queries/public";
import type { TutorInput } from "@/lib/validators/jobs";

// Reads the sign-in cookie, so it renders on every request (also for /am).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("tabTutor") };
}

export default async function MyTutorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireMemberPage(locale, "/account/tutor");
  const [t, tc, areas, tutor] = await Promise.all([
    getTranslations("account"),
    getTranslations("catalog"),
    getAreas(),
    db.tutor.findUnique({
      where: { memberId: me.id },
      include: {
        requests: {
          where: { status: { in: ["NEW", "CONTACTED", "MATCHED", "COMPLETED"] } },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, name: true, phone: true, subject: true, level: true, mode: true, schedule: true, message: true, status: true, tutorResponse: true, createdAt: true, area: { select: { nameEn: true, nameAm: true } } },
        },
      },
    }),
  ]);

  const initial: Partial<TutorInput> | undefined = tutor
    ? {
        fullName: tutor.fullName,
        subjects: tutor.subjects as TutorInput["subjects"],
        levels: tutor.levels as TutorInput["levels"],
        modes: tutor.modes as TutorInput["modes"],
        languages: tutor.languages as TutorInput["languages"],
        education: tutor.education as TutorInput["education"],
        field: tutor.field ?? "",
        experienceYears: String(tutor.experienceYears),
        bio: tutor.bio,
        availability: tutor.availability ?? "",
        hourlyRate: tutor.hourlyRate != null ? String(tutor.hourlyRate) : "",
        monthlyRate: tutor.monthlyRate != null ? String(tutor.monthlyRate) : "",
        areaId: tutor.areaId ?? "",
        consent: true,
      }
    : { fullName: me.name };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-brand text-h3 text-fg">{tutor ? t("editTutor") : t("createTutor")}</h2>
          {tutor && <StatusPill status={tutor.status} label={t(`tutorStatus.${tutor.status}` as "tutorStatus.PENDING")} />}
          {tutor?.status === "ACTIVE" && (
            <Link href={`/tutors/${tutor.slug}`} className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              <ExternalLink className="size-4" /> {t("viewPublic")}
            </Link>
          )}
          {tutor && tutor.ratingCount > 0 && (
            <ScopedIntl namespaces={["tutors"]}>
              <Stars value={tutor.ratingAvg} count={tutor.ratingCount} />
            </ScopedIntl>
          )}
        </div>
        <p className="mb-4 flex gap-2 rounded-btn bg-bg-2 p-3 text-sm text-fg-2">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {t("tutorNote")}
        </p>
        <ScopedIntl namespaces={["tutors", "form", "catalog"]}>
          <TutorJoinForm member={{ phone: me.phone }} initial={initial} areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} />
        </ScopedIntl>
      </div>

      <aside>
        <Panel title={t("studentRequests")}>
          {!tutor ? (
            <Empty>{t("studentRequestsNoProfile")}</Empty>
          ) : tutor.requests.length === 0 ? (
            <Empty>{t("noStudentRequests")}</Empty>
          ) : (
            <ScopedIntl namespaces={["account", "form"]}>
              <ul className="flex flex-col gap-3">
                {tutor.requests.map((r) => (
                  <li key={r.id} className="rounded-btn border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-fg">
                        {tc(`subject.${r.subject}` as "subject.MATHS")} · {tc(`level.${r.level}` as "level.KG")}
                      </p>
                      <StatusPill status={r.status} label={t(`requestStatus.${r.status}` as "requestStatus.NEW")} />
                    </div>
                    <p className="mt-1 text-sm text-fg-2">
                      {r.name.split(/\s+/)[0]} · {tc(`mode.${r.mode}` as "mode.HOME")}
                      {r.area ? ` · ${localized(r.area, "name", locale)}` : ""} · {formatDate(r.createdAt, locale)}
                    </p>
                    {r.schedule && <p className="mt-1 text-sm text-fg-2">{r.schedule}</p>}
                    {r.message && <p className="mt-1 text-sm whitespace-pre-line text-fg-2">{r.message}</p>}
                    {/* The family's phone is shared only once staff have matched the request. */}
                    {r.status === "MATCHED" || r.status === "COMPLETED" ? (
                      <a href={telLink(r.phone)} className="mt-2 inline-flex items-center gap-1.5 font-bold text-primary">
                        <Phone className="size-4" /> {formatPhoneDisplay(r.phone)}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-muted">{t("phoneAfterMatch")}</p>
                    )}
                    <div className="mt-2">
                      {r.tutorResponse ? (
                        <StatusPill status={r.tutorResponse} label={t(`answer.${r.tutorResponse}` as "answer.ACCEPTED")} />
                      ) : (
                        r.status !== "COMPLETED" && <TutorRequestAnswer id={r.id} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScopedIntl>
          )}
        </Panel>
      </aside>
    </div>
  );
}
