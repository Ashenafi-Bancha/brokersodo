import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, BadgeCheck, BookOpen, CalendarClock, GraduationCap, Layers, MapPin, MonitorSmartphone, Wallet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/misc";
import { ScopedIntl } from "@/components/scoped-intl";
import { TutorRequestForm } from "@/components/forms/tutors-forms";
import { SafetyBox, TutorAvatar } from "@/components/jobs/cards";
import { formatETB } from "@/lib/format";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { getTutorBySlug } from "@/server/queries/jobs";
import { getAreas } from "@/server/queries/public";

export const revalidate = 300;

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const tutor = await getTutorBySlug(slug);
  if (!tutor) return {};
  const tc = await getTranslations({ locale, namespace: "catalog" });
  const t = await getTranslations({ locale, namespace: "tutors" });
  const subjects = tutor.subjects.map((s) => tc(`subject.${s}` as "subject.MATHS")).join(", ");
  return {
    title: `${tutor.displayName} · ${subjects}`,
    description: `${t("title")}: ${subjects}. ${tutor.bio.slice(0, 120)}`,
    alternates: alternates(locale, `/tutors/${tutor.slug}`),
  };
}

export default async function TutorPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tutor = await getTutorBySlug(slug);
  if (!tutor) notFound();
  const [t, tc, areas] = await Promise.all([getTranslations("tutors"), getTranslations("catalog"), getAreas()]);
  const area = tutor.area ? localized(tutor.area, "name", locale) : null;
  const facts: [React.ElementType, string, string][] = [
    [BookOpen, t("subjects"), tutor.subjects.map((s) => tc(`subject.${s}` as "subject.MATHS")).join(", ")],
    [Layers, t("levels"), tutor.levels.map((s) => tc(`level.${s}` as "level.KG")).join(", ")],
    [MonitorSmartphone, t("modes"), tutor.modes.map((s) => tc(`mode.${s}` as "mode.HOME")).join(", ")],
    [GraduationCap, t("educationLabel"), `${tc(`education.${tutor.education}` as "education.DEGREE")}${tutor.field ? ` · ${tutor.field}` : ""}`],
    [Wallet, "", tutor.hourlyRate ? t("perHour", { price: formatETB(tutor.hourlyRate) }) : t("rateOnRequest")],
    [MapPin, t("location"), area ?? "Wolaita Sodo"],
    ...(tutor.availability ? ([[CalendarClock, t("availability"), tutor.availability]] as [React.ElementType, string, string][]) : []),
  ];
  return (
    <Container className="py-6 sm:py-10">
      <Link prefetch={false} href="/tutors" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
        <ArrowLeft className="size-4" /> {t("backToTutors")}
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0">
          <header className="flex items-center gap-5 rounded-card bg-surface p-5 shadow-card sm:p-7">
            <TutorAvatar name={tutor.displayName} className="size-20 text-4xl" />
            <div className="min-w-0">
              <h1 className="font-brand text-h2 text-fg">{tutor.displayName}</h1>
              <p className="mt-1 text-fg-2">{t("experience", { count: tutor.experienceYears })}</p>
              {tutor.isVerified && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-pill bg-[#DCFCE7] px-2.5 py-0.5 text-sm font-bold text-sold dark:bg-sold/25 dark:text-[#86efac]">
                  <BadgeCheck className="size-4" aria-hidden /> {t("verified")}
                </p>
              )}
            </div>
          </header>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {facts.map(([Icon, label, value], i) => (
              <div key={i} className="flex items-start gap-3 rounded-btn bg-bg-2 p-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  {label ? <dt className="text-xs font-semibold text-muted">{label}</dt> : <dt className="sr-only">{t("rateOnRequest")}</dt>}
                  <dd className="font-semibold text-fg">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <section className="mt-8">
            <h2 className="font-brand text-h3 text-fg">{t("about", { name: tutor.displayName })}</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-fg-2">{tutor.bio}</p>
          </section>
          <p className="mt-8 font-mono text-sm text-muted">{tutor.refCode}</p>
        </article>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="req-title" className="rounded-card bg-surface p-5 shadow-card sm:p-6">
            <h2 id="req-title" className="font-brand text-h3 text-fg">
              {t("requestThis", { name: tutor.displayName })}
            </h2>
            <p className="mt-1 mb-4 text-sm text-fg-2">{t("requestIntro")}</p>
            <ScopedIntl namespaces={["tutors", "form", "catalog"]}>
              <TutorRequestForm
                compact
                areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))}
                tutor={{ id: tutor.id, subjects: tutor.subjects, levels: tutor.levels, modes: tutor.modes }}
              />
            </ScopedIntl>
          </section>
          <SafetyBox ns="tutors" />
        </aside>
      </div>
    </Container>
  );
}
