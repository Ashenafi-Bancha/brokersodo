import { getLocale, getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Empty, Panel } from "./status-pill";

/** Which status labels each update uses. */
const STATUS_GROUP: Record<string, string> = {
  APPLICATION_STATUS: "appStatus",
  JOB_STATUS: "jobStatus",
  TUTOR_STATUS: "tutorStatus",
  TALENT_STATUS: "seekerStatus",
  TUTOR_REQUEST_STATUS: "requestStatus",
  TALENT_REQUEST_STATUS: "talentRequestStatus",
  STORE_STATUS: "storeStatus",
};

/** The member's latest updates. Opening the overview marks them as read. */
export async function Updates({ memberId }: { memberId: string }) {
  const [t, tc, locale] = await Promise.all([getTranslations("account"), getTranslations("catalog"), getLocale()]);
  const items = await db.notification.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 20 });
  const unread = items.filter((n) => !n.readAt).map((n) => n.id);
  if (unread.length) await db.notification.updateMany({ where: { id: { in: unread } }, data: { readAt: new Date() } });

  const text = (type: string, raw: unknown) => {
    const d = (raw ?? {}) as Record<string, string>;
    const group = STATUS_GROUP[type];
    const status = group && d.status && t.has(`${group}.${d.status}` as "appStatus.NEW") ? t(`${group}.${d.status}` as "appStatus.NEW") : (d.status ?? "");
    const subject = d.subject && tc.has(`subject.${d.subject}` as "subject.MATHS") ? tc(`subject.${d.subject}` as "subject.MATHS") : (d.subject ?? "");
    const key = `notify.${type}` as "notify.JOB_STATUS";
    return t.has(key) ? t(key, { title: d.title ?? "", status, subject, name: d.name ?? "", profession: d.profession ?? "" }) : type;
  };

  return (
    <Panel title={t("updates")}>
      {items.length === 0 ? (
        <Empty>{t("noUpdates")}</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((n) => {
            const body = (
              <span className="flex items-start gap-3">
                <Bell className={cn("mt-0.5 size-4 shrink-0", unread.includes(n.id) ? "text-primary" : "text-muted")} aria-hidden />
                <span className="min-w-0">
                  <span className={cn("block text-sm", unread.includes(n.id) ? "font-bold text-fg" : "text-fg-2")}>{text(n.type, n.data)}</span>
                  <span className="text-xs text-muted">{relativeTime(n.createdAt, locale)}</span>
                </span>
              </span>
            );
            return (
              <li key={n.id} className="py-3">
                {n.link ? (
                  <Link href={n.link} className="block rounded-btn hover:bg-bg-2">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
