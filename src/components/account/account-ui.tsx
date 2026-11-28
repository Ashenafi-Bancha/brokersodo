"use client";
import { useTranslations } from "next-intl";
import { BriefcaseBusiness, GraduationCap, LayoutDashboard, Settings, Store, UserRound } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account", key: "tabOverview", Icon: LayoutDashboard },
  { href: "/account/talent", key: "tabTalent", Icon: UserRound },
  { href: "/account/tutor", key: "tabTutor", Icon: GraduationCap },
  { href: "/account/employer", key: "tabEmployer", Icon: BriefcaseBusiness },
  { href: "/account/store", key: "tabStore", Icon: Store },
  { href: "/account/settings", key: "tabSettings", Icon: Settings },
] as const;

/** Account sections. Scrolls sideways on small phones instead of wrapping. */
export function AccountTabs() {
  const t = useTranslations("account");
  const pathname = usePathname();
  return (
    <nav aria-label={t("accountNav")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2">
        {TABS.map(({ href, key, Icon }) => {
          const active = href === "/account" ? pathname === "/account" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-bold transition-colors",
                  active ? "bg-red-500 text-white" : "bg-surface text-fg shadow-card hover:bg-yellow-50",
                )}
              >
                <Icon className="size-4" aria-hidden /> {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
