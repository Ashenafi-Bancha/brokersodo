import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BriefcaseBusiness, GraduationCap, UserRound } from "lucide-react";
import { Container } from "@/components/ui/misc";
import { ScopedIntl } from "@/components/scoped-intl";
import { SignUpForm } from "@/components/account/account-forms";
import { getMember, safeNext } from "@/lib/member-auth";
import { localePath } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("signUpTitle"), description: t("signUpSubtitle"), robots: { index: false, follow: false } };
}

export default async function SignUpPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = safeNext((await searchParams).next);
  const next = localePath(locale, raw);
  if (await getMember()) redirect(next);
  const t = await getTranslations("account");
  const perks = [
    [UserRound, t("perkSeeker")],
    [GraduationCap, t("perkTutor")],
    [BriefcaseBusiness, t("perkEmployer")],
  ] as const;
  return (
    <Container className="grid items-start gap-8 py-10 sm:py-16 lg:grid-cols-[1fr_440px]">
      <div className="lg:pt-6">
        <h1 className="font-brand text-h2 text-fg">{t("signUpTitle")}</h1>
        <p className="mt-3 max-w-xl text-lg text-fg-2">{t("signUpSubtitle")}</p>
        <ul className="mt-6 flex flex-col gap-3">
          {perks.map(([Icon, text]) => (
            <li key={text} className="flex items-start gap-3 rounded-btn bg-surface p-3 shadow-card">
              <span className="grid size-10 shrink-0 place-items-center rounded-btn bg-yellow-100 text-navy-900">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="pt-2 font-semibold text-fg">{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <ScopedIntl namespaces={["account", "form"]}>
          <SignUpForm next={next} signInHref={`${localePath(locale, "/account/sign-in")}?next=${encodeURIComponent(raw)}`} termsHref={localePath(locale, "/terms")} />
        </ScopedIntl>
      </div>
    </Container>
  );
}
