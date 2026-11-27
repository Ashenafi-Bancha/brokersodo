import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScopedIntl } from "@/components/scoped-intl";
import { ChangePasswordForm, NameForm } from "@/components/account/account-forms";
import { Panel } from "@/components/account/status-pill";
import { requireMemberPage } from "@/lib/member-auth";

// Reads the sign-in cookie, so it renders on every request (also for /am).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("tabSettings") };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireMemberPage(locale, "/account/settings");
  const t = await getTranslations("account");
  return (
    <ScopedIntl namespaces={["account", "form"]}>
      <div className="grid max-w-3xl gap-6">
        <Panel title={t("yourName")}>
          <NameForm name={me.name} />
          <p className="mt-3 text-sm text-muted">{t("phoneFixed", { phone: me.phone.replace(/^\+251/, "0") })}</p>
        </Panel>
        <Panel title={t("changePassword")}>
          <ChangePasswordForm />
        </Panel>
      </div>
    </ScopedIntl>
  );
}
