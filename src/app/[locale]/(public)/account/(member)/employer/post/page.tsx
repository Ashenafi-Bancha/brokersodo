import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ScopedIntl } from "@/components/scoped-intl";
import { JobPostForm } from "@/components/forms/jobs-forms";
import { db } from "@/lib/db";
import { requireMemberPage } from "@/lib/member-auth";
import { localePath } from "@/lib/seo";
import { localized } from "@/lib/utils";
import { getAreas } from "@/server/queries/public";

// Reads the sign-in cookie, so it renders on every request (also for /am).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("postJob") };
}

export default async function PostMyJobPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireMemberPage(locale, "/account/employer/post");
  const company = await db.company.findUnique({ where: { memberId: me.id }, select: { name: true } });
  if (!company) redirect(localePath(locale, "/account/employer"));
  const [t, areas] = await Promise.all([getTranslations("account"), getAreas()]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/account/employer" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
        <ArrowLeft className="size-4" /> {t("tabEmployer")}
      </Link>
      <h2 className="mt-3 mb-1 font-brand text-h3 text-fg">{t("postJob")}</h2>
      <p className="mb-5 text-fg-2">{t("postJobNote")}</p>
      <ScopedIntl namespaces={["jobs", "form", "catalog"]}>
        <JobPostForm member={{ company: company.name, name: me.name, phone: me.phone }} areas={areas.map((a) => ({ id: a.id, name: localized(a, "name", locale) }))} />
      </ScopedIntl>
    </div>
  );
}
