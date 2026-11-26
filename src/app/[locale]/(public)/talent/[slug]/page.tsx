import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Award, BadgeCheck, Briefcase, CalendarClock, ExternalLink, FolderGit2, GraduationCap, Languages, Lock, MapPin, Timer } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/misc";
import { ScopedIntl } from "@/components/scoped-intl";
import { TalentRequestForm } from "@/components/forms/jobs-forms";
import { AudienceIcon, SafetyBox, TutorAvatar } from "@/components/jobs/cards";
import { alternates } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { getTalentBySlug } from "@/server/queries/jobs";

export const revalidate = 300;

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getTalentBySlug(slug);
  if (!p) return {};
  const t = await getTranslations({ locale, namespace: "talent" });
  return {
    title: `${p.displayName} · ${p.profession}`,
    description: `${p.profession} — ${t("title")}. ${(p.about ?? p.skills ?? "").slice(0, 120)}`,
    alternates: alternates(locale, `/talent/${p.slug}`),
  };
}

const list = (text: string | null) =>
  (text ?? "")
    .split(/[,\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean);

export default async function TalentProfilePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = await getTalentBySlug(slug);
  if (!p) notFound();
  const [t, tc] = await Promise.all([getTranslations("talent"), getTranslations("catalog")]);
  const skills = list(p.skills);
  const facts: [React.ElementType, string, React.ReactNode][] = [
    [Briefcase, t("sector"), tc(`sector.${p.sector}` as "sector.OTHER")],
    [GraduationCap, t("education"), `${tc(`education.${p.education}` as "education.DEGREE")}${p.field ? ` · ${p.field}` : ""}${p.graduationYear ? ` (${p.graduationYear})` : ""}`],
    [Timer, t("experienceLabel"), t("experience", { count: p.experience })],
    [MapPin, t("location"), p.area ? localized(p.area, "name", locale) : "Wolaita Sodo"],
    ...(p.languages.length ? ([[Languages, t("languages"), p.languages.map((l) => tc(`language.${l}` as "language.AMHARIC")).join(", ")]] as [React.ElementType, string, string][]) : []),
    ...(p.availability ? ([[CalendarClock, t("availability"), p.availability]] as [React.ElementType, string, string][]) : []),
  ];
  return (
    <Container className="py-6 sm:py-10">
      <Link prefetch={false} href="/talent" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0">
          <header className="flex items-center gap-5 rounded-card bg-surface p-5 shadow-card sm:p-7">
            <TutorAvatar name={p.displayName ?? "?"} className="size-20 text-4xl" />
            <div className="min-w-0">
              <h1 className="font-brand text-h2 text-fg">{p.displayName}</h1>
              <p className="mt-1 text-lg font-semibold text-fg-2">{p.profession}</p>
              <p className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-pill bg-blue-50 px-2.5 py-0.5 text-sm font-bold text-blue-500">
                  <AudienceIcon audience={p.seekerType} className="size-4" /> {tc(`audience.${p.seekerType}` as "audience.ANY")}
                </span>
                {p.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-[#DCFCE7] px-2.5 py-0.5 text-sm font-bold text-sold">
                    <BadgeCheck className="size-4" aria-hidden /> {t("verified")}
                  </span>
                )}
              </p>
            </div>
          </header>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {facts.map(([Icon, label, value], i) => (
              <div key={i} className="flex items-start gap-3 rounded-btn bg-bg-2 p-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold text-muted">{label}</dt>
                  <dd className="font-semibold text-fg">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          {p.about && (
            <section className="mt-8">
              <h2 className="font-brand text-h3 text-fg">{t("about")}</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-fg-2">{p.about}</p>
            </section>
          )}
          {skills.length > 0 && (
            <section className="mt-8">
              <h2 className="font-brand text-h3 text-fg">{t("skills")}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {skills.map((sk) => (
                  <li key={sk} className="rounded-pill bg-yellow-100 px-3 py-1.5 text-sm font-semibold text-navy-900">
                    {sk}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {p.projects && (
            <section className="mt-8">
              <h2 className="flex items-center gap-2 font-brand text-h3 text-fg">
                <FolderGit2 className="size-6 text-primary" aria-hidden /> {t("projects")}
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-fg-2">{p.projects}</p>
            </section>
          )}
          {p.certifications && (
            <section className="mt-8">
              <h2 className="flex items-center gap-2 font-brand text-h3 text-fg">
                <Award className="size-6 text-primary" aria-hidden /> {t("certifications")}
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-fg-2">{p.certifications}</p>
            </section>
          )}
          {p.portfolioUrl && (
            <p className="mt-8">
              <a href={p.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline">
                <ExternalLink className="size-4" aria-hidden /> {t("portfolio")}
              </a>
            </p>
          )}
        </article>
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="hire-title" className="rounded-card bg-surface p-5 shadow-card sm:p-6">
            <h2 id="hire-title" className="font-brand text-h3 text-fg">
              {t("requestTitle", { name: p.displayName ?? "" })}
            </h2>
            <p className="mt-1 mb-4 flex gap-2 text-sm text-fg-2">
              <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {t("requestIntro")}
            </p>
            <ScopedIntl namespaces={["talent", "form"]}>
              <TalentRequestForm seekerId={p.id} />
            </ScopedIntl>
          </section>
          <SafetyBox ns="jobs" />
        </aside>
      </div>
    </Container>
  );
}
