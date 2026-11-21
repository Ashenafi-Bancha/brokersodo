import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  Inbox,
  MessagesSquare,
  Search,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { CategoryChart, InquiriesChart } from "@/components/admin/dashboard-charts";
import { Button } from "@/components/ui/button";
import { requireStaffPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatETB, relativeTime } from "@/lib/format";
import { INQUIRY_STATUSES } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Dashboard" };

const DAYS = 30;
const TZ = "Africa/Addis_Ababa";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const STAGE: Record<(typeof INQUIRY_STATUSES)[number], string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  VIEWING_SCHEDULED: "Viewing",
  NEGOTIATING: "Negotiating",
  CLOSED_WON: "Won",
  CLOSED_LOST: "Lost",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const session = await requireStaffPage();
  const { denied } = await searchParams;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const since = new Date(now.getTime() - DAYS * 86400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);

  const [active, newInquiries, pendingSubs, openWanted, closedMonth, inquiriesWeek, byCategory, categories, inquiryDays, stages, activity, unassigned, staleDrafts, recentSubs, topViewed] =
    await Promise.all([
      db.listing.count({ where: { status: { in: ["PUBLISHED", "RESERVED"] } } }),
      db.inquiry.count({ where: { status: "NEW" } }),
      db.propertySubmission.count({ where: { status: "PENDING" } }),
      db.wantedRequest.count({ where: { status: "OPEN" } }),
      db.listing.count({ where: { status: { in: ["SOLD", "RENTED"] }, soldAt: { gte: monthStart } } }),
      db.inquiry.count({ where: { createdAt: { gte: weekAgo } } }),
      db.listing.groupBy({ by: ["categoryId"], where: { status: { in: ["PUBLISHED", "RESERVED"] } }, _count: { _all: true } }),
      db.category.findMany({ select: { id: true, nameEn: true } }),
      db.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD') AS day, count(*)::bigint AS count
        FROM "Inquiry" WHERE "createdAt" >= ${since} GROUP BY 1`,
      db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
      db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
      db.inquiry.findMany({ where: { status: "NEW", assignedBrokerId: null }, orderBy: { createdAt: "asc" }, take: 5, include: { listing: { select: { refCode: true } } } }),
      db.listing.findMany({ where: { status: "DRAFT", updatedAt: { lt: weekAgo } }, orderBy: { updatedAt: "asc" }, take: 5, select: { id: true, refCode: true, titleEn: true, updatedAt: true } }),
      db.propertySubmission.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 5, select: { id: true, title: true, name: true, createdAt: true } }),
      db.listing.findMany({
        where: { status: { in: ["PUBLISHED", "RESERVED"] } },
        orderBy: { viewCount: "desc" },
        take: 5,
        select: { id: true, refCode: true, titleEn: true, viewCount: true, price: true, priceOnRequest: true, images: { where: { isCover: true }, take: 1, select: { url: true } } },
      }),
    ]);

  const catName = new Map(categories.map((c) => [c.id, c.nameEn]));
  const catData = byCategory.map((b) => ({ name: catName.get(b.categoryId) ?? "—", count: b._count._all })).sort((a, b) => b.count - a.count);
  const dayMap = new Map(inquiryDays.map((d) => [d.day, Number(d.count)]));
  const inqData = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(now.getTime() - (DAYS - 1 - i) * 86400_000);
    return { day: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ }), count: dayMap.get(dayKey(d)) ?? 0 };
  });
  const stageCount = new Map(stages.map((s) => [s.status, s._count._all]));
  const maxStage = Math.max(1, ...INQUIRY_STATUSES.map((s) => stageCount.get(s) ?? 0));
  const attention = newInquiries + pendingSubs;
  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const today = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });

  const kpis: { label: string; value: number; hint: string; href: string; Icon: LucideIcon; chip: string }[] = [
    { label: "Active listings", value: active, hint: "Live on the website", href: "/admin/listings", Icon: Tags, chip: "bg-blue-50 text-blue-500 dark:bg-blue-800 dark:text-blue-100" },
    { label: "New inquiries", value: newInquiries, hint: `${inquiriesWeek} received this week`, href: "/admin/inquiries", Icon: MessagesSquare, chip: "bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-200" },
    { label: "Pending submissions", value: pendingSubs, hint: "Waiting for review", href: "/admin/submissions", Icon: Inbox, chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" },
    { label: "Open wanted", value: openWanted, hint: "Buyers to match", href: "/admin/wanted", Icon: Search, chip: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200" },
    { label: "Closed this month", value: closedMonth, hint: "Sold or rented", href: "/admin/listings", Icon: CheckCircle2, chip: "bg-[#DCFCE7] text-sold dark:bg-sold/25 dark:text-[#86efac]" },
  ];

  return (
    <div className="space-y-6">
      {denied && (
        <p role="alert" className="flex items-center gap-2 rounded-btn bg-amber-50 px-4 py-3 text-sm font-semibold text-reserved dark:bg-amber-900/30 dark:text-amber-200">
          <AlertTriangle className="size-4" /> That section is for admins only.
        </p>
      )}

      <section className="flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{today}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-fg sm:text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-1 text-fg-2">
            {attention > 0 ? (
              <>
                You have <strong className="text-primary">{newInquiries} new {newInquiries === 1 ? "inquiry" : "inquiries"}</strong> and{" "}
                <strong className="text-primary">{pendingSubs} {pendingSubs === 1 ? "submission" : "submissions"}</strong> to review.
              </>
            ) : (
              "You're all caught up."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="subtle">
            <Link href="/admin/inquiries">
              <MessagesSquare /> Inquiries
            </Link>
          </Button>
          <Button asChild size="sm" variant="subtle">
            <Link href="/admin/submissions">
              <Inbox /> Submissions
            </Link>
          </Button>
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <li key={k.label} className="last:col-span-2 md:last:col-span-1">
            <Link href={k.href} className="group flex h-full flex-col rounded-card bg-surface p-4 shadow-card transition-shadow hover:shadow-pop">
              <span className="flex items-center justify-between">
                <span className={`grid size-10 place-items-center rounded-btn ${k.chip}`}>
                  <k.Icon className="size-5" />
                </span>
                <ArrowRight className="size-4 text-line-strong transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
              </span>
              <span className="mt-3 text-3xl font-extrabold text-fg tabular-nums">{k.value}</span>
              <span className="mt-0.5 text-sm font-bold text-fg">{k.label}</span>
              <span className="text-xs text-muted">{k.hint}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-card bg-surface p-5 shadow-card xl:col-span-2">
          <h2 className="font-bold text-fg">Inquiries per day</h2>
          <p className="mb-4 text-sm text-muted">
            Last {DAYS} days · {inqData.reduce((s, d) => s + d.count, 0)} total
          </p>
          <InquiriesChart data={inqData} />
        </section>
        <section className="rounded-card bg-surface p-5 shadow-card">
          <CardTitle title="Lead pipeline" href="/admin/inquiries" />
          <ul className="space-y-3.5">
            {INQUIRY_STATUSES.map((s) => {
              const n = stageCount.get(s) ?? 0;
              return (
                <li key={s}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-fg-2">{STAGE[s]}</span>
                    <span className="font-bold text-fg tabular-nums">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-pill bg-bg-2">
                    <div className="h-full rounded-pill bg-primary" style={{ width: `${(n / maxStage) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-card bg-surface p-5 shadow-card">
          <h2 className="font-bold text-fg">Active listings by category</h2>
          <p className="mb-4 text-sm text-muted">Published and reserved</p>
          <CategoryChart data={catData} />
        </section>
        <section className="rounded-card bg-surface p-5 shadow-card">
          <CardTitle title="Most viewed listings" href="/admin/listings" />
          <ul className="divide-y divide-line">
            {topViewed.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/listings/${l.id}`} className="flex items-center gap-3 rounded-sm py-2.5 hover:bg-bg-2">
                  <span className="size-12 shrink-0 overflow-hidden rounded-sm bg-line">
                    {l.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.images[0].url} alt="" loading="lazy" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{l.titleEn}</span>
                    <span className="block text-xs text-muted">
                      {l.refCode} · {l.priceOnRequest || l.price == null ? "On request" : formatETB(l.price)}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-fg-2 tabular-nums">
                    <Eye className="size-4 text-muted" aria-hidden /> {l.viewCount.toLocaleString("en-US")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Attention title="Unassigned inquiries" href="/admin/inquiries" empty="Every new inquiry has a broker.">
          {unassigned.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {i.name} {i.listing && <span className="font-mono text-xs text-primary">{i.listing.refCode}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">{relativeTime(i.createdAt)}</span>
            </li>
          ))}
        </Attention>
        <Attention title="Submissions to review" href="/admin/submissions" empty="No submissions waiting.">
          {recentSubs.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <Link href={`/admin/submissions/${s.id}`} className="truncate hover:underline">
                {s.title} <span className="text-muted">· {s.name}</span>
              </Link>
              <span className="shrink-0 text-xs text-muted">{relativeTime(s.createdAt)}</span>
            </li>
          ))}
        </Attention>
        <Attention title="Old drafts" href="/admin/listings" empty="No drafts older than a week.">
          {staleDrafts.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2">
              <Link href={`/admin/listings/${l.id}`} className="truncate hover:underline">
                <span className="font-mono text-xs text-primary">{l.refCode}</span> {l.titleEn}
              </Link>
              <span className="shrink-0 text-xs text-muted">{relativeTime(l.updatedAt)}</span>
            </li>
          ))}
        </Attention>
      </div>

      <section className="rounded-card bg-surface p-5 shadow-card">
        {session.user.role === "ADMIN" ? <CardTitle title="Recent activity" href="/admin/activity" /> : <h2 className="mb-4 font-bold text-fg">Recent activity</h2>}
        <ul className="space-y-3 text-sm">
          {activity.map((a) => (
            <li key={a.id} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-yellow-100 text-xs font-extrabold text-navy-900">
                {(a.user?.name ?? "S").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-fg-2">
                <span className="font-semibold text-fg">{a.user?.name ?? "System"}</span> · {a.summary ?? `${a.action} ${a.entityType}`}
              </span>
              <span className="shrink-0 text-xs text-muted">{relativeTime(a.createdAt)}</span>
            </li>
          ))}
          {activity.length === 0 && <li className="text-muted">No activity yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function CardTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-bold text-fg">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        View all <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function Attention({ title, href, empty, children }: { title: string; href: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="rounded-card bg-surface p-5 shadow-card">
      <CardTitle title={title} href={href} />
      {children.length ? <ul className="space-y-2.5 text-sm text-fg">{children}</ul> : <p className="text-sm text-muted">{empty}</p>}
    </section>
  );
}
