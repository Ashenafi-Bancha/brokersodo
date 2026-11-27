import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  good: "bg-[#DCFCE7] text-sold",
  wait: "bg-yellow-100 text-navy-900",
  info: "bg-blue-50 text-blue-500",
  bad: "bg-red-50 text-error",
  off: "bg-bg-2 text-muted",
};

/** Which tone a status gets, across jobs, applications, profiles and requests. */
const STATUS_TONE: Record<string, keyof typeof TONE> = {
  PUBLISHED: "good",
  ACTIVE: "good",
  MATCHED: "good",
  COMPLETED: "good",
  HIRED: "good",
  CONNECTED: "good",
  ACCEPTED: "good",
  SHORTLISTED: "info",
  INTERVIEW: "info",
  REVIEWING: "info",
  UNDER_REVIEW: "info",
  CONTACTED: "info",
  PENDING: "wait",
  NEW: "wait",
  REJECTED: "bad",
  DECLINED: "bad",
  CLOSED: "off",
  CANCELLED: "off",
  WITHDRAWN: "off",
  HIDDEN: "off",
  ARCHIVED: "off",
  PLACED: "good",
};

export function StatusPill({ status, label, className }: { status: string; label: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", TONE[STATUS_TONE[status] ?? "off"], className)}>{label}</span>;
}

export function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card bg-surface p-5 shadow-card sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-brand text-h3 text-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-btn bg-bg-2 p-4 text-sm text-fg-2">{children}</p>;
}
