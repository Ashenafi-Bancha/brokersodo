import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TUTOR_SUBJECTS, fromCatalogSlug } from "@/lib/jobs-catalog";
import { alternates } from "@/lib/seo";
import TutorsPage from "../../page";

type Props = { params: Promise<{ locale: string; subject: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const dynamic = "force-dynamic";

/** "Maths tutors in Wolaita Sodo": the tutor list with one subject chosen. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, subject: slug } = await params;
  const subject = fromCatalogSlug(TUTOR_SUBJECTS, slug);
  if (!subject || subject === "ALL_SUBJECTS") return {};
  const [t, tc] = await Promise.all([getTranslations({ locale, namespace: "tutors" }), getTranslations({ locale, namespace: "catalog" })]);
  const name = tc(`subject.${subject}` as "subject.MATHS");
  return {
    title: t("subjectTitle", { subject: name }),
    description: t("subjectDescription", { subject: name }),
    alternates: alternates(locale, `/tutors/subject/${slug}`),
  };
}

export default async function TutorSubjectPage({ params, searchParams }: Props) {
  const { locale, subject: slug } = await params;
  const subject = fromCatalogSlug(TUTOR_SUBJECTS, slug);
  if (!subject || subject === "ALL_SUBJECTS") notFound();
  const sp = await searchParams;
  return TutorsPage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({ ...sp, subject }) });
}
