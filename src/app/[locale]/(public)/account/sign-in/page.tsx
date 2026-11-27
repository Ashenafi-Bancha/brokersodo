import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/misc";
import { ScopedIntl } from "@/components/scoped-intl";
import { SignInForm } from "@/components/account/account-forms";
import { getMember, safeNext } from "@/lib/member-auth";
import { localePath } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("signInTitle"), robots: { index: false, follow: false } };
}

export default async function SignInPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const next = localePath(locale, safeNext((await searchParams).next));
  if (await getMember()) redirect(next);
  const t = await getTranslations("account");
  return (
    <Container className="flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-card sm:p-8">
        <h1 className="font-brand text-h2 text-fg">{t("signInTitle")}</h1>
        <p className="mt-2 mb-6 text-fg-2">{t("signInSubtitle")}</p>
        <ScopedIntl namespaces={["account", "form"]}>
          <SignInForm next={next} signUpHref={`${localePath(locale, "/account/sign-up")}?next=${encodeURIComponent(safeNext((await searchParams).next))}`} />
        </ScopedIntl>
      </div>
    </Container>
  );
}
