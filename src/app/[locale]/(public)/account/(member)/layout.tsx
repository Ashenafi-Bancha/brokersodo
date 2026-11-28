import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Bell, LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { ScopedIntl } from "@/components/scoped-intl";
import { AccountTabs } from "@/components/account/account-ui";
import { requireMemberPage } from "@/lib/member-auth";
import { signOutAction } from "@/server/actions/member-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Every page in here needs a signed-in member. */
export default async function MemberLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const me = await requireMemberPage(locale, "/account");
  const [t, unread] = await Promise.all([getTranslations("account"), db.notification.count({ where: { memberId: me.id, readAt: null } })]);
  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{t("signedInAs", { phone: me.phone.replace(/^\+251/, "0") })}</p>
          <h1 className="font-brand text-h2 text-fg">{t("hello", { name: me.name.split(/\s+/)[0] })}</h1>
        </div>
        <div className="flex items-center gap-2">
        {unread > 0 && (
          <Link href="/account" className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-red-500 px-3 text-sm font-bold text-white">
            <Bell className="size-4" aria-hidden /> {t("newUpdates", { count: unread })}
          </Link>
        )}
        <form action={signOutAction.bind(null, locale)}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut /> {t("signOut")}
          </Button>
        </form>
        </div>
      </div>
      <ScopedIntl namespaces={["account"]}>
        <AccountTabs />
      </ScopedIntl>
      <div className="mt-6">{children}</div>
    </Container>
  );
}
