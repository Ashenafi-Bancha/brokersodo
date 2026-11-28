"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Checkbox,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form-controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WhatsAppIcon } from "@/components/layout/icons";
import { DataTable, ColumnSelectFilter, type ColumnDef } from "./data-table";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import { RowActions } from "./row-actions";
import {
  deleteJobAction,
  deletePersonAction,
  matchSeekersAction,
  saveJobAction,
  setJobStatusAction,
  updateApplicationAction,
  updateSeekerAction,
} from "@/server/actions/admin-jobs";
import {
  EDUCATION_LEVELS,
  JOB_AUDIENCES,
  JOB_TYPES,
  SALARY_PERIODS,
  WORK_MODES,
  daysLeft,
  riskFlags,
} from "@/lib/jobs-catalog";
import {
  APPLICATION_STATUSES,
  JOB_STATUSES,
  SEEKER_STATUSES,
} from "@/lib/validators/jobs";
import { formatETB, formatPhoneDisplay, relativeTime } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { TalentProfileEditor, type TalentProfileRow } from "./talent-admin";

export type Labels = Record<string, Record<string, string>>;
type Area = { id: string; name: string };

const LabelsCtx = React.createContext<Labels>({});
/** Active sectors or subjects for option lists inside a LabelsProvider. */
export const useActiveList = (group: "sector" | "subject") => activeList(React.useContext(LabelsCtx), group);
export const useLabel = () => {
  const labels = React.useContext(LabelsCtx);
  return (group: string, v: string) => labels[group]?.[v] ?? v;
};
export function LabelsProvider({
  labels,
  children,
}: {
  labels: Labels;
  children: React.ReactNode;
}) {
  return <LabelsCtx.Provider value={labels}>{children}</LabelsCtx.Provider>;
}

/** Active sectors or subjects, in the order staff set (from getAdminLabels). */
export const activeList = (labels: Labels, group: "sector" | "subject") => (labels._active?.[group] ?? "").split(",").filter(Boolean);

const titleCase = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/* ---------------- Small form helpers ---------------- */

export function L({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1 text-sm font-semibold text-fg",
        className,
      )}
    >
      {label}
      {children}
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-fg">
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function ContactButtons({
  name,
  phone,
  about,
}: {
  name: string;
  phone: string;
  about: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="call" size="sm">
        <a href={telLink(phone)}>
          <Phone /> {formatPhoneDisplay(phone)}
        </a>
      </Button>
      <Button asChild variant="whatsapp" size="sm">
        <a
          href={whatsappLink(
            phone,
            `Hello ${name}, this is BrokerSodo about ${about}.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon /> WhatsApp
        </a>
      </Button>
    </div>
  );
}

function Options({ group, list }: { group: string; list: readonly string[] }) {
  const label = useLabel();
  return (
    <>
      {list.map((v) => (
        <option key={v} value={v}>
          {label(group, v)}
        </option>
      ))}
    </>
  );
}

/* ---------------- Jobs ---------------- */

export type ApplicantRow = {
  id: string;
  name: string;
  phone: string;
  education: string;
  field: string | null;
  experience: number;
  skills: string | null;
  message: string | null;
  cvId?: string | null;
  status: (typeof APPLICATION_STATUSES)[number];
  notes: string | null;
  createdAt: string;
};

export type JobRow = {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  employerName: string;
  showEmployer: boolean;
  employerVerified: boolean;
  featured: boolean;
  sector: string;
  jobType: string;
  audience: string;
  education: string;
  minExperience: number;
  vacancies: number;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string;
  areaId: string | null;
  area: string;
  description: string;
  requirements: string;
  responsibilities: string;
  skills: string;
  workMode: string;
  howToApply: string | null;
  deadline: string;
  contactName: string;
  contactPhone: string;
  staffNotes: string | null;
  status: (typeof JOB_STATUSES)[number];
  rejectReason: string | null;
  createdAt: string;
  applicants: ApplicantRow[];
};

const emptyJob = (): JobRow => ({
  id: "",
  refCode: "",
  slug: "",
  title: "",
  employerName: "",
  showEmployer: true,
  employerVerified: false,
  featured: false,
  sector: "OTHER",
  jobType: "FULL_TIME",
  audience: "ANY",
  education: "NONE",
  minExperience: 0,
  vacancies: 1,
  salaryMin: null,
  salaryMax: null,
  salaryPeriod: "MONTH",
  areaId: null,
  area: "",
  description: "",
  requirements: "",
  responsibilities: "",
  skills: "",
  workMode: "ONSITE",
  howToApply: null,
  deadline: "",
  contactName: "",
  contactPhone: "",
  staffNotes: null,
  status: "PUBLISHED",
  rejectReason: null,
  createdAt: new Date().toISOString(),
  applicants: [],
});

function deadlineCell(r: JobRow) {
  if (!r.deadline) return <span className="text-muted">—</span>;
  const left = daysLeft(`${r.deadline}T23:59:59+03:00`);
  if (left == null) return null;
  return (
    <span
      className={cn(
        "whitespace-nowrap",
        left < 0
          ? "text-error"
          : left <= 3
            ? "font-semibold text-reserved"
            : "text-fg-2",
      )}
    >
      {left < 0 ? "Expired" : left === 0 ? "Today" : `${left}d left`}
    </span>
  );
}

export function JobsView({
  rows,
  areas,
  labels,
  isAdmin,
}: {
  rows: JobRow[];
  areas: Area[];
  labels: Labels;
  isAdmin: boolean;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [editOnly, setEditOnly] = React.useState(false);
  const open =
    openId === "new" ? emptyJob() : (rows.find((r) => r.id === openId) ?? null);
  const columns = React.useMemo<ColumnDef<JobRow, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Job",
        enableHiding: false,
        cell: ({ row: { original: r } }) => {
          const flags = riskFlags(r.title, r.description, r.requirements);
          return (
            <button
              type="button"
              onClick={() => {
                setEditOnly(false);
                setOpenId(r.id);
              }}
              className="cursor-pointer text-left"
            >
              <span className="flex items-center gap-1.5 font-semibold text-fg hover:underline">
                {flags.length > 0 && (
                  <AlertTriangle
                    className="size-4 shrink-0 text-error"
                    aria-label="Possible scam words"
                  />
                )}
                <span className="line-clamp-1">{r.title}</span>
              </span>
              <span className="text-xs text-muted">
                <span className="font-mono text-primary">{r.refCode}</span> ·{" "}
                {r.employerName}
                {!r.showEmployer && " (confidential)"}
              </span>
            </button>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        accessorKey: "sector",
        header: "Sector",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) =>
          labels.sector?.[String(getValue())] ?? String(getValue()),
      },
      {
        id: "applicants",
        header: "Applicants",
        accessorFn: (r) => r.applicants.length,
        cell: ({ row: { original: r } }) => {
          const fresh = r.applicants.filter((a) => a.status === "NEW").length;
          return (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Users className="size-4 text-muted" /> {r.applicants.length}
              {fresh > 0 && (
                <span className="rounded-pill bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {fresh} new
                </span>
              )}
            </span>
          );
        },
      },
      {
        id: "deadline",
        header: "Deadline",
        accessorFn: (r) => r.deadline,
        cell: ({ row: { original: r } }) => deadlineCell(r),
      },
      {
        accessorKey: "createdAt",
        header: "Received",
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-muted">
            {relativeTime(String(getValue()))}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row: { original: r } }) => (
          <RowActions
            label={`${r.refCode} ${r.title}`}
            onEdit={() => {
              setEditOnly(true);
              setOpenId(r.id);
            }}
            onDelete={isAdmin ? () => deleteJobAction(r.id) : undefined}
            deleteText={`This permanently deletes ${r.refCode} and its ${r.applicants.length} applications. It cannot be undone.`}
          />
        ),
      },
    ],
    [labels, isAdmin],
  );
  return (
    <LabelsProvider labels={labels}>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setOpenId("new")}>
          <Plus /> New job
        </Button>
      </div>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        storageKey="jobs"
        searchPlaceholder="Search jobs, employers, refs…"
        emptyText="No job posts yet. Employers post at /jobs/post, or add one with “New job”."
        toolbar={(t) => (
          <>
            <ColumnSelectFilter
              table={t}
              column="status"
              label="Status"
              options={JOB_STATUSES.map((s) => ({
                value: s,
                label: titleCase(s),
              }))}
            />
            <ColumnSelectFilter
              table={t}
              column="sector"
              label="Sector"
              options={activeList(labels, "sector").map((s) => ({
                value: s,
                label: labels.sector?.[s] ?? s,
              }))}
            />
          </>
        )}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <DialogContent
            title={open.id ? `${open.refCode} · ${open.title}` : "New job"}
            description={
              open.id
                ? `${open.employerName} · received ${relativeTime(open.createdAt)}`
                : "Staff-created jobs can be published straight away."
            }
            className="max-w-4xl"
          >
            <JobDialog
              key={open.id || "new"}
              job={open}
              areas={areas}
              startOnDetails={editOnly}
              isAdmin={isAdmin}
              onDone={() => setOpenId(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </LabelsProvider>
  );
}

function JobDialog({
  job,
  areas,
  onDone,
  startOnDetails,
  isAdmin,
}: {
  job: JobRow;
  areas: Area[];
  onDone: () => void;
  startOnDetails?: boolean;
  isAdmin: boolean;
}) {
  const [tab, setTab] = React.useState<"details" | "applicants" | "talent">(
    !startOnDetails && job.id && job.applicants.length
      ? "applicants"
      : "details",
  );
  const tabs = [
    ["details", "Details"],
    ...(job.id
      ? ([
          ["applicants", `Applicants (${job.applicants.length})`],
          ["talent", "Matching talent"],
        ] as const)
      : []),
  ] as const;
  return (
    <div className="space-y-5">
      {job.id && (
        <JobQuickActions job={job} isAdmin={isAdmin} onDone={onDone} />
      )}
      {tabs.length > 1 && (
        <div role="tablist" className="flex gap-1 border-b border-line">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "-mb-px cursor-pointer border-b-2 px-3 py-2 text-sm font-bold",
                tab === k
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-fg",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === "details" && (
        <JobEditor job={job} areas={areas} onDone={onDone} />
      )}
      {tab === "applicants" && <Applicants job={job} />}
      {tab === "talent" && <MatchingTalent job={job} />}
    </div>
  );
}

function JobQuickActions({
  job,
  onDone,
  isAdmin,
}: {
  job: JobRow;
  onDone: () => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const flags = riskFlags(job.title, job.description, job.requirements);
  const set = (status: string, reason?: string) =>
    run(
      () => setJobStatusAction(job.id, status, reason),
      () => router.refresh(),
    );
  return (
    <div className="space-y-3">
      {flags.length > 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-btn bg-red-50 px-3 py-2 text-sm text-error dark:bg-error/20 dark:text-red-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Check before publishing.</strong> This post mentions:{" "}
            {flags.map((f) => `“${f}”`).join(", ")}. Scam posts often ask
            applicants to pay or promise jobs abroad. Call the employer to
            confirm.
          </span>
        </p>
      )}
      {job.status === "REJECTED" && job.rejectReason && (
        <p className="text-sm text-muted">Rejected: {job.rejectReason}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={job.status} />
        <span className="mr-auto" />
        <Button asChild variant="subtle" size="sm">
          <a href={telLink(job.contactPhone)}>
            <Phone /> {job.contactName} · {formatPhoneDisplay(job.contactPhone)}
          </a>
        </Button>
        {job.status === "PUBLISHED" && (
          <Button asChild variant="ghost" size="sm">
            <a
              href={`/jobs/${job.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink /> View
            </a>
          </Button>
        )}
        {job.status === "PENDING" && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => set("UNDER_REVIEW")}>
            Start review
          </Button>
        )}
        {job.status !== "PUBLISHED" && (
          <Button size="sm" disabled={pending} onClick={() => set("PUBLISHED")}>
            Approve &amp; publish
          </Button>
        )}
        {job.status === "PUBLISHED" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => set("CLOSED")}
          >
            Close
          </Button>
        )}
        {(job.status === "PENDING" || job.status === "UNDER_REVIEW") && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={async () => {
              const r = await confirm({
                title: "Reject this job?",
                description: "It will not be published.",
                confirmLabel: "Reject",
                destructive: true,
                input: { type: "textarea", label: "Reason (for your records)" },
              });
              if (r.ok) set("REJECTED", r.value);
            }}
          >
            Reject
          </Button>
        )}
        {isAdmin && (
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-error"
            aria-label="Delete job"
            disabled={pending}
            onClick={async () => {
              const r = await confirm({
                title: "Delete this job?",
                description: `This permanently deletes ${job.refCode} and its ${job.applicants.length} applications. This cannot be undone.`,
                confirmLabel: "Delete",
                destructive: true,
              });
              if (r.ok)
                run(
                  () => deleteJobAction(job.id),
                  () => {
                    onDone();
                    router.refresh();
                  },
                );
            }}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}

function JobEditor({
  job,
  areas,
  onDone,
}: {
  job: JobRow;
  areas: Area[];
  onDone: () => void;
}) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const sectorList = useActiveList("sector");
  const [v, setV] = React.useState(job);
  const set = <K extends keyof JobRow>(k: K, val: JobRow[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const num = (s: string) =>
    s.trim() === "" ? null : Number(s.replace(/,/g, ""));
  const save = () =>
    run(
      () =>
        saveJobAction({
          ...v,
          id: v.id || null,
          minExperience: String(v.minExperience),
          vacancies: String(v.vacancies),
          salaryMin: v.salaryMin ?? "",
          salaryMax: v.salaryMax ?? "",
        }),
      () => {
        onDone();
        router.refresh();
      },
    );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Job title" className="sm:col-span-2">
          <Input
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </L>
        <L label="Employer">
          <Input
            value={v.employerName}
            onChange={(e) => set("employerName", e.target.value)}
          />
        </L>
        <L label="Location">
          <Select
            value={v.areaId ?? ""}
            onChange={(e) => set("areaId", e.target.value || null)}
          >
            <option value="">—</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </L>
        <L label="Sector">
          <Select
            value={v.sector}
            onChange={(e) => set("sector", e.target.value)}
          >
            <Options group="sector" list={sectorList} />
          </Select>
        </L>
        <L label="Job type">
          <Select
            value={v.jobType}
            onChange={(e) => set("jobType", e.target.value)}
          >
            <Options group="jobType" list={JOB_TYPES} />
          </Select>
        </L>
        <L label="For">
          <Select
            value={v.audience}
            onChange={(e) => set("audience", e.target.value)}
          >
            <Options group="audience" list={JOB_AUDIENCES} />
          </Select>
        </L>
        <L label="Work mode">
          <Select
            value={v.workMode}
            onChange={(e) => set("workMode", e.target.value)}
          >
            <Options group="workMode" list={WORK_MODES} />
          </Select>
        </L>
        <L label="Minimum education">
          <Select
            value={v.education}
            onChange={(e) => set("education", e.target.value)}
          >
            <Options group="education" list={EDUCATION_LEVELS} />
          </Select>
        </L>
        <L label="Min. experience (years)">
          <Input
            inputMode="numeric"
            value={String(v.minExperience)}
            onChange={(e) => set("minExperience", Number(e.target.value) || 0)}
          />
        </L>
        <L label="Positions">
          <Input
            inputMode="numeric"
            value={String(v.vacancies)}
            onChange={(e) => set("vacancies", Number(e.target.value) || 1)}
          />
        </L>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <L label="Salary from (ETB)">
          <Input
            inputMode="numeric"
            value={v.salaryMin ?? ""}
            onChange={(e) => set("salaryMin", num(e.target.value))}
          />
        </L>
        <L label="Salary up to (ETB)">
          <Input
            inputMode="numeric"
            value={v.salaryMax ?? ""}
            onChange={(e) => set("salaryMax", num(e.target.value))}
          />
        </L>
        <L label="Per">
          <Select
            value={v.salaryPeriod}
            onChange={(e) => set("salaryPeriod", e.target.value)}
          >
            <Options group="salaryPeriodName" list={SALARY_PERIODS} />
          </Select>
        </L>
        <L label="Deadline">
          <Input
            type="date"
            value={v.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </L>
      </div>
      <L label="Description">
        <Textarea
          rows={6}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </L>
      <L label="Responsibilities">
        <Textarea
          rows={3}
          value={v.responsibilities}
          onChange={(e) => set("responsibilities", e.target.value)}
        />
      </L>
      <L label="Requirements">
        <Textarea
          rows={3}
          value={v.requirements}
          onChange={(e) => set("requirements", e.target.value)}
        />
      </L>
      <L label="Skills (comma separated)">
        <Input
          value={v.skills}
          placeholder="Excel, customer care, driving licence"
          onChange={(e) => set("skills", e.target.value)}
        />
      </L>
      <L label="How to apply (public, optional)">
        <Input
          value={v.howToApply ?? ""}
          placeholder="e.g. Bring your CV and ID for the interview"
          onChange={(e) => set("howToApply", e.target.value || null)}
        />
      </L>
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Contact name (private)">
          <Input
            value={v.contactName}
            onChange={(e) => set("contactName", e.target.value)}
          />
        </L>
        <L label="Contact phone (private)">
          <Input
            type="tel"
            value={v.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
          />
        </L>
      </div>
      <div className="grid gap-3 rounded-btn bg-bg-2 p-3 sm:grid-cols-3">
        <Toggle
          label="Show employer name"
          hint="Off = confidential employer"
          checked={v.showEmployer}
          onChange={(c) => set("showEmployer", c)}
        />
        <Toggle
          label="Verified employer"
          hint="You confirmed the business"
          checked={v.employerVerified}
          onChange={(c) => set("employerVerified", c)}
        />
        <Toggle
          label="Featured"
          hint="Shown first"
          checked={v.featured}
          onChange={(c) => set("featured", c)}
        />
      </div>
      <L label="Staff notes (private)">
        <Textarea
          rows={2}
          value={v.staffNotes ?? ""}
          onChange={(e) => set("staffNotes", e.target.value)}
        />
      </L>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <L label="Status" className="mr-auto flex-row items-center gap-2">
          <Select
            value={v.status}
            onChange={(e) => set("status", e.target.value as JobRow["status"])}
            className="min-h-10"
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </L>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button disabled={pending} onClick={save}>
          {pending && <Loader2 className="animate-spin" />}{" "}
          {v.id ? "Save" : "Create job"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        Published jobs without a deadline get one 30 days ahead.
      </p>
    </div>
  );
}

function Applicants({ job }: { job: JobRow }) {
  const label = useLabel();
  const [copied, setCopied] = React.useState(false);
  const shortlisted = job.applicants.filter((a) => a.status === "SHORTLISTED");
  if (job.applicants.length === 0)
    return <p className="text-sm text-muted">No applications yet.</p>;
  const copy = async () => {
    const text = [
      `${job.refCode} · ${job.title} · shortlist from BrokerSodo`,
      ...shortlisted.map(
        (a, i) =>
          `${i + 1}. ${a.name} · ${formatPhoneDisplay(a.phone)} · ${label("education", a.education)}${a.field ? ` (${a.field})` : ""} · ${a.experience} yrs${a.skills ? ` · ${a.skills}` : ""}`,
      ),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Shortlist the best people, then send the list to the employer.
        </p>
        <Button
          size="sm"
          variant="subtle"
          disabled={!shortlisted.length}
          onClick={copy}
        >
          <ClipboardCopy />{" "}
          {copied ? "Copied" : `Copy shortlist (${shortlisted.length})`}
        </Button>
      </div>
      <ul className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
        {job.applicants.map((a) => (
          <ApplicantItem key={a.id} a={a} job={job} />
        ))}
      </ul>
    </div>
  );
}

function ApplicantItem({ a, job }: { a: ApplicantRow; job: JobRow }) {
  const router = useRouter();
  const label = useLabel();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [status, setStatus] = React.useState(a.status);
  const [notes, setNotes] = React.useState(a.notes ?? "");
  const dirty = status !== a.status || notes !== (a.notes ?? "");
  return (
    <li className="rounded-btn border border-line p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-fg">
            {a.name}{" "}
            <span className="text-xs font-normal text-muted">
              · {relativeTime(a.createdAt)}
            </span>
          </p>
          <p className="text-sm text-fg-2">
            {label("education", a.education)}
            {a.field ? ` · ${a.field}` : ""} · {a.experience} yrs experience
          </p>
          {a.skills && <p className="text-sm text-fg-2">Skills: {a.skills}</p>}
          {a.cvId && (
            <a href={`/api/cv/${a.cvId}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              <ExternalLink className="size-4" /> Open CV
            </a>
          )}
          {a.message && (
            <p className="mt-1 rounded-sm bg-bg-2 p-2 text-sm whitespace-pre-line text-fg-2">
              {a.message}
            </p>
          )}
        </div>
        <ContactButtons
          name={a.name}
          phone={a.phone}
          about={`your application for ${job.title}`}
        />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicantRow["status"])}
          className="min-h-10"
          aria-label="Applicant status"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="min-h-10"
          aria-label="Notes"
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            disabled={!dirty || pending}
            onClick={() =>
              run(
                () => updateApplicationAction({ id: a.id, status, notes }),
                () => router.refresh(),
              )
            }
          >
            Save
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Delete application"
            onClick={async () => {
              if (
                (
                  await confirm({
                    title: `Delete ${a.name}'s application?`,
                    description:
                      "This permanently removes their details. It cannot be undone.",
                    confirmLabel: "Delete",
                    destructive: true,
                  })
                ).ok
              )
                run(
                  () => deletePersonAction("application", a.id),
                  () => router.refresh(),
                );
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}

type Match = Awaited<ReturnType<typeof matchSeekersAction>>[number];

function MatchingTalent({ job }: { job: JobRow }) {
  const label = useLabel();
  const [rows, setRows] = React.useState<Match[] | null>(null);
  React.useEffect(() => {
    let live = true;
    matchSeekersAction(job.id).then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, [job.id]);
  if (!rows)
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" /> Finding people…
      </p>
    );
  if (rows.length === 0)
    return (
      <p className="text-sm text-muted">
        No one in the talent pool matches this sector and education yet.
      </p>
    );
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm text-muted">
        <Sparkles className="size-4 text-primary" /> Same sector, enough
        education
        {job.audience !== "ANY"
          ? `, ${label("audience", job.audience).toLowerCase()}`
          : ""}
        . Call them about this job.
      </p>
      <ul className="max-h-[55vh] divide-y divide-line overflow-y-auto">
        {rows.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5"
          >
            <div>
              <p className="font-semibold text-fg">
                {s.name}{" "}
                <span className="text-sm font-normal text-muted">
                  · {s.profession}
                </span>
              </p>
              <p className="text-xs text-muted">
                {label("audience", s.seekerType)} ·{" "}
                {label("education", s.education)} · {s.experience} yrs
                {s.experience < job.minExperience && (
                  <span className="text-reserved">
                    {" "}
                    (below {job.minExperience} yrs)
                  </span>
                )}
              </p>
            </div>
            <ContactButtons
              name={s.name}
              phone={s.phone}
              about={`a job: ${job.title}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Talent pool ---------------- */

export type SeekerRow = {
  id: string;
  name: string;
  phone: string;
  seekerType: string;
  profession: string;
  sector: string;
  education: string;
  field: string | null;
  graduationYear: number | null;
  experience: number;
  skills: string | null;
  about: string | null;
  area: string;
  status: (typeof SEEKER_STATUSES)[number];
  notes: string | null;
  createdAt: string;
  profile: TalentProfileRow;
  cvId: string | null;
};

export function SeekersView({
  rows,
  labels,
  isAdmin,
}: {
  rows: SeekerRow[];
  labels: Labels;
  isAdmin: boolean;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const open = rows.find((r) => r.id === openId) ?? null;
  const columns = React.useMemo<ColumnDef<SeekerRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Person",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <button
            type="button"
            onClick={() => setOpenId(r.id)}
            className="cursor-pointer text-left"
          >
            <span className="font-semibold text-fg hover:underline">
              {r.name}
            </span>
            <span className="block text-xs text-muted">
              {r.profession} · {formatPhoneDisplay(r.phone)}
            </span>
          </button>
        ),
      },
      {
        accessorKey: "seekerType",
        header: "Type",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) =>
          labels.audience?.[String(getValue())] ?? String(getValue()),
      },
      {
        accessorKey: "sector",
        header: "Sector",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) =>
          labels.sector?.[String(getValue())] ?? String(getValue()),
      },
      {
        accessorKey: "education",
        header: "Education",
        cell: ({ getValue }) =>
          labels.education?.[String(getValue())] ?? String(getValue()),
      },
      {
        accessorKey: "experience",
        header: "Exp.",
        cell: ({ getValue }) => (
          <span className="tabular-nums">{String(getValue())} yrs</span>
        ),
      },
      { accessorKey: "area", header: "Area" },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: "visibility",
        header: "Profile",
        accessorFn: (r) => r.profile.visibility,
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-muted">
            {relativeTime(String(getValue()))}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row: { original: r } }) => (
          <RowActions
            label={r.name}
            onEdit={() => setOpenId(r.id)}
            onDelete={
              isAdmin ? () => deletePersonAction("seeker", r.id) : undefined
            }
            deleteText="This permanently removes their details from the talent pool. It cannot be undone."
          />
        ),
      },
    ],
    [labels, isAdmin],
  );
  return (
    <LabelsProvider labels={labels}>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        storageKey="seekers"
        searchPlaceholder="Search name, phone, profession, skills…"
        emptyText="No one has joined the talent pool yet."
        toolbar={(t) => (
          <>
            <ColumnSelectFilter
              table={t}
              column="seekerType"
              label="Type"
              options={[
                { value: "GRADUATE", label: "Fresh graduates" },
                { value: "SKILLED", label: "Skilled workers" },
              ]}
            />
            <ColumnSelectFilter
              table={t}
              column="sector"
              label="Sector"
              options={activeList(labels, "sector").map((s) => ({
                value: s,
                label: labels.sector?.[s] ?? s,
              }))}
            />
            <ColumnSelectFilter
              table={t}
              column="visibility"
              label="Profile"
              options={[
                { value: "PUBLIC", label: "Public" },
                { value: "PRIVATE", label: "Private" },
              ]}
            />
            <ColumnSelectFilter
              table={t}
              column="status"
              label="Status"
              options={SEEKER_STATUSES.map((s) => ({
                value: s,
                label: titleCase(s),
              }))}
            />
          </>
        )}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <DialogContent
            title={open.name}
            description={`${open.profession} · joined ${relativeTime(open.createdAt)}`}
            className="max-w-2xl"
          >
            <SeekerDetail
              key={open.id}
              s={open}
              isAdmin={isAdmin}
              onDone={() => setOpenId(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </LabelsProvider>
  );
}

function SeekerDetail({
  s,
  onDone,
  isAdmin,
}: {
  s: SeekerRow;
  onDone: () => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const label = useLabel();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [status, setStatus] = React.useState(s.status);
  const [notes, setNotes] = React.useState(s.notes ?? "");
  const facts = [
    ["Type", label("audience", s.seekerType)],
    ["Sector", label("sector", s.sector)],
    [
      "Education",
      `${label("education", s.education)}${s.field ? ` · ${s.field}` : ""}`,
    ],
    ["Graduated", s.graduationYear ? String(s.graduationYear) : "—"],
    ["Experience", `${s.experience} years`],
    ["Area", s.area || "—"],
  ];
  return (
    <div className="space-y-4">
      <ContactButtons
        name={s.name}
        phone={s.phone}
        about="your BrokerSodo talent pool profile"
      />
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-sm bg-bg-2 p-2">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-semibold text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      {s.skills && <p className="text-sm text-fg-2">Skills: {s.skills}</p>}
      {s.cvId && (
        <a href={`/api/cv/${s.cvId}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
          <ExternalLink className="size-4" /> Open CV
        </a>
      )}
      {s.about && (
        <p className="rounded-btn bg-bg-2 p-3 text-sm whitespace-pre-line text-fg-2">
          {s.about}
        </p>
      )}
      <TalentProfileEditor p={s.profile} />
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <L label="Status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as SeekerRow["status"])}
          >
            {SEEKER_STATUSES.map((x) => (
              <option key={x} value={x}>
                {titleCase(x)}
              </option>
            ))}
          </Select>
        </L>
        <L label="Notes">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </L>
      </div>
      <div className="flex justify-end gap-2">
        {isAdmin && (
          <Button
            variant="ghost"
            className="mr-auto text-error"
            onClick={async () => {
              if (
                (
                  await confirm({
                    title: `Delete ${s.name}?`,
                    description:
                      "This permanently removes their details from the talent pool. It cannot be undone.",
                    confirmLabel: "Delete",
                    destructive: true,
                  })
                ).ok
              )
                run(
                  () => deletePersonAction("seeker", s.id),
                  () => {
                    onDone();
                    router.refresh();
                  },
                );
            }}
          >
            <Trash2 /> Delete
          </Button>
        )}
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            run(
              () => updateSeekerAction({ id: s.id, status, notes }),
              () => {
                onDone();
                router.refresh();
              },
            )
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export const salaryLabel = (r: Pick<JobRow, "salaryMin" | "salaryMax">) =>
  r.salaryMin == null && r.salaryMax == null
    ? "Not stated"
    : `${r.salaryMin != null ? formatETB(r.salaryMin, { suffix: false }) : "…"} – ${r.salaryMax != null ? formatETB(r.salaryMax) : "…"}`;
