"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ExternalLink,
  Loader2,
  Phone,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChipGroup } from "@/components/forms/form-kit";
import { DataTable, ColumnSelectFilter, type ColumnDef } from "./data-table";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import { RowActions } from "./row-actions";
import {
  ContactButtons,
  L,
  LabelsProvider,
  Toggle,
  activeList,
  useActiveList,
  useLabel,
  type Labels,
} from "./jobs-admin";
import {
  deletePersonAction,
  deleteTutorAction,
  saveTutorAction,
  setTutorStatusAction,
  updateTutorRequestAction,
} from "@/server/actions/admin-jobs";
import {
  EDUCATION_LEVELS,
  LANGUAGES,
  TUTOR_LEVELS,
  TUTOR_MODES,
} from "@/lib/jobs-catalog";
import { TUTOR_REQUEST_STATUSES, TUTOR_STATUSES } from "@/lib/validators/jobs";
import { formatETB, formatPhoneDisplay, relativeTime } from "@/lib/format";
import { telLink } from "@/lib/contact";

type Area = { id: string; name: string };
const titleCase = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export type TutorRow = {
  id: string;
  refCode: string;
  slug: string;
  displayName: string;
  fullName: string;
  phone: string;
  subjects: string[];
  levels: string[];
  modes: string[];
  education: string;
  field: string | null;
  experienceYears: number;
  bio: string;
  availability: string | null;
  hourlyRate: number | null;
  monthlyRate: number | null;
  languages: string[];
  ratingAvg: number;
  ratingCount: number;
  areaId: string | null;
  area: string;
  isVerified: boolean;
  featured: boolean;
  staffNotes: string | null;
  status: (typeof TUTOR_STATUSES)[number];
  rejectReason: string | null;
  createdAt: string;
  requestCount: number;
};

const emptyTutor = (): TutorRow => ({
  id: "",
  refCode: "",
  slug: "",
  displayName: "",
  fullName: "",
  phone: "",
  subjects: [],
  levels: [],
  modes: ["HOME"],
  education: "DEGREE",
  field: null,
  experienceYears: 0,
  bio: "",
  availability: null,
  hourlyRate: null,
  monthlyRate: null,
  languages: ["AMHARIC"],
  ratingAvg: 0,
  ratingCount: 0,
  areaId: null,
  area: "",
  isVerified: false,
  featured: false,
  staffNotes: null,
  status: "ACTIVE",
  rejectReason: null,
  createdAt: new Date().toISOString(),
  requestCount: 0,
});

export function TutorsView({
  rows,
  areas,
  labels,
  isAdmin,
}: {
  rows: TutorRow[];
  areas: Area[];
  labels: Labels;
  isAdmin: boolean;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const open =
    openId === "new"
      ? emptyTutor()
      : (rows.find((r) => r.id === openId) ?? null);
  const columns = React.useMemo<ColumnDef<TutorRow, unknown>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Tutor",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <button
            type="button"
            onClick={() => setOpenId(r.id)}
            className="cursor-pointer text-left"
          >
            <span className="flex items-center gap-1.5 font-semibold text-fg hover:underline">
              {r.fullName}
              {r.isVerified && (
                <BadgeCheck
                  className="size-4 text-sold"
                  aria-label="Verified"
                />
              )}
              {r.featured && (
                <Star
                  className="size-4 fill-yellow-500 text-yellow-500"
                  aria-label="Featured"
                />
              )}
            </span>
            <span className="text-xs text-muted">
              <span className="font-mono text-primary">{r.refCode}</span> ·
              shown as “{r.displayName}”
            </span>
          </button>
        ),
      },
      {
        id: "subjects",
        header: "Subjects",
        accessorFn: (r) => r.subjects.join(" "),
        filterFn: (row, _id, v) =>
          !v || row.original.subjects.includes(String(v)),
        cell: ({ row: { original: r } }) => (
          <span className="line-clamp-2 max-w-xs text-sm">
            {r.subjects.map((s) => labels.subject?.[s] ?? s).join(", ")}
          </span>
        ),
      },
      {
        id: "levels",
        header: "Levels",
        accessorFn: (r) => r.levels.join(" "),
        cell: ({ row: { original: r } }) => (
          <span className="text-sm text-fg-2">
            {r.levels.map((s) => labels.level?.[s] ?? s).join(", ")}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        accessorKey: "requestCount",
        header: "Requests",
        cell: ({ getValue }) => (
          <span className="tabular-nums">{String(getValue())}</span>
        ),
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
            label={`${r.refCode} ${r.fullName}`}
            onEdit={() => setOpenId(r.id)}
            onDelete={isAdmin ? () => deleteTutorAction(r.id) : undefined}
            deleteText="This permanently removes the tutor's details. It cannot be undone."
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
          <Plus /> New tutor
        </Button>
      </div>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        storageKey="tutors"
        searchPlaceholder="Search tutors, phone, refs…"
        emptyText="No tutors yet. Tutors apply at /tutors/join, or add one with “New tutor”."
        toolbar={(t) => (
          <>
            <ColumnSelectFilter
              table={t}
              column="status"
              label="Status"
              options={TUTOR_STATUSES.map((s) => ({
                value: s,
                label: titleCase(s),
              }))}
            />
            <ColumnSelectFilter
              table={t}
              column="subjects"
              label="Subject"
              options={activeList(labels, "subject").map((s) => ({
                value: s,
                label: labels.subject?.[s] ?? s,
              }))}
            />
          </>
        )}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <DialogContent
            title={open.id ? `${open.refCode} · ${open.fullName}` : "New tutor"}
            description={
              open.id
                ? `Applied ${relativeTime(open.createdAt)}. Check ID and education before making them live.`
                : "Add a tutor you have already checked."
            }
            className="max-w-3xl"
          >
            <TutorEditor
              key={open.id || "new"}
              tutor={open}
              areas={areas}
              isAdmin={isAdmin}
              onDone={() => setOpenId(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </LabelsProvider>
  );
}

function TutorEditor({
  tutor,
  areas,
  onDone,
  isAdmin,
}: {
  tutor: TutorRow;
  areas: Area[];
  onDone: () => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const label = useLabel();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [v, setV] = React.useState(tutor);
  const set = <K extends keyof TutorRow>(k: K, val: TutorRow[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const subjectList = useActiveList("subject");
  const opts = (group: string, list: readonly string[]) =>
    list.map((x) => ({ value: x, label: label(group, x) }));
  const quick = (status: string, reason?: string) =>
    run(
      () => setTutorStatusAction(tutor.id, status, reason),
      () => router.refresh(),
    );
  const save = () =>
    run(
      () =>
        saveTutorAction({
          ...v,
          id: v.id || null,
          experienceYears: String(v.experienceYears),
          hourlyRate: v.hourlyRate ?? "",
          monthlyRate: v.monthlyRate ?? "",
        }),
      () => {
        onDone();
        router.refresh();
      },
    );
  return (
    <div className="space-y-4">
      {tutor.id && (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={tutor.status} />
          <span className="mr-auto" />
          <Button asChild variant="subtle" size="sm">
            <a href={telLink(tutor.phone)}>
              <Phone /> {formatPhoneDisplay(tutor.phone)}
            </a>
          </Button>
          {tutor.status === "ACTIVE" ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <a
                  href={`/tutors/${tutor.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink /> View
                </a>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => quick("HIDDEN")}
              >
                Hide
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => quick("ACTIVE")}
            >
              Make live
            </Button>
          )}
          {tutor.status === "PENDING" && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={async () => {
                const r = await confirm({
                  title: "Reject this tutor?",
                  confirmLabel: "Reject",
                  destructive: true,
                  input: {
                    type: "textarea",
                    label: "Reason (for your records)",
                  },
                });
                if (r.ok) quick("REJECTED", r.value);
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
              aria-label="Delete tutor"
              onClick={async () => {
                if (
                  (
                    await confirm({
                      title: `Delete ${tutor.fullName}?`,
                      description:
                        "This permanently removes the tutor's details. It cannot be undone.",
                      confirmLabel: "Delete",
                      destructive: true,
                    })
                  ).ok
                )
                  run(
                    () => deleteTutorAction(tutor.id),
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
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <L label="Full name (private)">
          <Input
            value={v.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
        </L>
        <L label="Public name">
          <Input
            value={v.displayName}
            onChange={(e) => set("displayName", e.target.value)}
          />
        </L>
        <L label="Phone (private)">
          <Input
            type="tel"
            value={v.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </L>
      </div>
      <ChipGroup
        legend="Subjects"
        multiple
        options={opts("subject", subjectList)}
        value={v.subjects}
        onChange={(x) => set("subjects", x as string[])}
      />
      <ChipGroup
        legend="Levels"
        multiple
        options={opts("level", TUTOR_LEVELS)}
        value={v.levels}
        onChange={(x) => set("levels", x as string[])}
      />
      <ChipGroup
        legend="Lessons"
        multiple
        options={opts("mode", TUTOR_MODES)}
        value={v.modes}
        onChange={(x) => set("modes", x as string[])}
      />
      <ChipGroup
        legend="Teaches in"
        multiple
        options={opts("language", LANGUAGES)}
        value={v.languages}
        onChange={(x) => set("languages", x as string[])}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <L label="Education">
          <Select
            value={v.education}
            onChange={(e) => set("education", e.target.value)}
          >
            {EDUCATION_LEVELS.map((x) => (
              <option key={x} value={x}>
                {label("education", x)}
              </option>
            ))}
          </Select>
        </L>
        <L label="Field of study">
          <Input
            value={v.field ?? ""}
            onChange={(e) => set("field", e.target.value || null)}
          />
        </L>
        <L label="Years teaching">
          <Input
            inputMode="numeric"
            value={String(v.experienceYears)}
            onChange={(e) =>
              set("experienceYears", Number(e.target.value) || 0)
            }
          />
        </L>
        <L label="Rate per hour (ETB)">
          <Input
            inputMode="numeric"
            value={v.hourlyRate ?? ""}
            onChange={(e) =>
              set(
                "hourlyRate",
                e.target.value
                  ? Number(e.target.value.replace(/,/g, ""))
                  : null,
              )
            }
          />
        </L>
        <L label="Rate per month (ETB)">
          <Input
            inputMode="numeric"
            value={v.monthlyRate ?? ""}
            onChange={(e) =>
              set(
                "monthlyRate",
                e.target.value
                  ? Number(e.target.value.replace(/,/g, ""))
                  : null,
              )
            }
          />
        </L>
        <L label="Area">
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
        <L label="Availability">
          <Input
            value={v.availability ?? ""}
            onChange={(e) => set("availability", e.target.value || null)}
          />
        </L>
      </div>
      <L label="About (public)">
        <Textarea
          rows={4}
          value={v.bio}
          onChange={(e) => set("bio", e.target.value)}
        />
      </L>
      <div className="grid gap-3 rounded-btn bg-bg-2 p-3 sm:grid-cols-2">
        <Toggle
          label="Verified"
          hint="You checked their ID and certificates"
          checked={v.isVerified}
          onChange={(c) => set("isVerified", c)}
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
            onChange={(e) =>
              set("status", e.target.value as TutorRow["status"])
            }
            className="min-h-10"
          >
            {TUTOR_STATUSES.map((s) => (
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
          {v.id ? "Save" : "Create tutor"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Tutor requests ---------------- */

export type TutorRequestRow = {
  id: string;
  name: string;
  phone: string;
  subject: string;
  level: string;
  mode: string;
  area: string;
  areaId: string | null;
  schedule: string | null;
  budget: number | null;
  message: string | null;
  status: (typeof TUTOR_REQUEST_STATUSES)[number];
  notes: string | null;
  tutorId: string | null;
  tutorName: string | null;
  createdAt: string;
};

export type TutorOption = {
  id: string;
  refCode: string;
  name: string;
  subjects: string[];
  levels: string[];
  modes: string[];
  areaId: string | null;
  hourlyRate: number | null;
};

export function TutorRequestsView({
  rows,
  tutors,
  labels,
  isAdmin,
}: {
  rows: TutorRequestRow[];
  tutors: TutorOption[];
  labels: Labels;
  isAdmin: boolean;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const open = rows.find((r) => r.id === openId) ?? null;
  const L2 = (g: string, v: string) => labels[g]?.[v] ?? v;
  const columns = React.useMemo<ColumnDef<TutorRequestRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Request",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <button
            type="button"
            onClick={() => setOpenId(r.id)}
            className="cursor-pointer text-left"
          >
            <span className="font-semibold text-fg hover:underline">
              {L2("subject", r.subject)} · {L2("level", r.level)}
            </span>
            <span className="block text-xs text-muted">
              {r.name} · {formatPhoneDisplay(r.phone)}
              {r.tutorName ? ` · asked for ${r.tutorName}` : ""}
            </span>
          </button>
        ),
      },
      {
        accessorKey: "mode",
        header: "Lesson",
        cell: ({ getValue }) => L2("mode", String(getValue())),
      },
      { accessorKey: "area", header: "Area" },
      {
        accessorKey: "budget",
        header: "Budget",
        cell: ({ getValue }) =>
          getValue() ? formatETB(Number(getValue())) : "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
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
            label={`request from ${r.name}`}
            onEdit={() => setOpenId(r.id)}
            onDelete={
              isAdmin
                ? () => deletePersonAction("tutorRequest", r.id)
                : undefined
            }
            deleteText="This permanently removes the family's details. It cannot be undone."
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, isAdmin],
  );
  return (
    <LabelsProvider labels={labels}>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        storageKey="tutor-requests"
        searchPlaceholder="Search requests…"
        emptyText="No tutor requests yet."
        toolbar={(t) => (
          <ColumnSelectFilter
            table={t}
            column="status"
            label="Status"
            options={TUTOR_REQUEST_STATUSES.map((s) => ({
              value: s,
              label: titleCase(s),
            }))}
          />
        )}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <DialogContent
            title={`Tutor request: ${open.name}`}
            description={`${L2("subject", open.subject)} · ${L2("level", open.level)} · ${L2("mode", open.mode)}`}
            className="max-w-2xl"
          >
            <RequestDetail
              key={open.id}
              r={open}
              tutors={tutors}
              isAdmin={isAdmin}
              onDone={() => setOpenId(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </LabelsProvider>
  );
}

function RequestDetail({
  r,
  tutors,
  onDone,
  isAdmin,
}: {
  r: TutorRequestRow;
  tutors: TutorOption[];
  onDone: () => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const label = useLabel();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [status, setStatus] = React.useState(r.status);
  const [notes, setNotes] = React.useState(r.notes ?? "");
  const [tutorId, setTutorId] = React.useState(r.tutorId ?? "");
  // Best matches first: teaches the subject and level, same lesson type, same area.
  const ranked = React.useMemo(() => {
    const score = (t: TutorOption) =>
      (t.subjects.includes(r.subject) || t.subjects.includes("ALL_SUBJECTS")
        ? 4
        : 0) +
      (t.levels.includes(r.level) ? 3 : 0) +
      (t.modes.includes(r.mode) ? 2 : 0) +
      (r.areaId && t.areaId === r.areaId ? 1 : 0);
    return tutors
      .map((t) => ({ ...t, score: score(t) }))
      .sort((a, b) => b.score - a.score);
  }, [tutors, r]);
  const good = ranked.filter((t) => t.score >= 7);
  const picked = tutors.find((t) => t.id === tutorId);
  return (
    <div className="space-y-4">
      <ContactButtons
        name={r.name}
        phone={r.phone}
        about="your tutor request"
      />
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {[
          ["Area", r.area || "—"],
          ["Budget / hour", r.budget ? formatETB(r.budget) : "—"],
          ["When", r.schedule || "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-sm bg-bg-2 p-2">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="font-semibold text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      {r.message && (
        <p className="rounded-btn bg-bg-2 p-3 text-sm whitespace-pre-line text-fg-2">
          {r.message}
        </p>
      )}
      <div>
        <p className="mb-1 text-sm font-bold text-fg">
          Matching tutors ({good.length} strong)
        </p>
        <Select
          value={tutorId}
          onChange={(e) => setTutorId(e.target.value)}
          aria-label="Assign tutor"
        >
          <option value="">— Not assigned —</option>
          {ranked.map((t) => (
            <option key={t.id} value={t.id}>
              {t.score >= 7 ? "★ " : ""}
              {t.name} ({t.refCode}) ·{" "}
              {t.subjects.map((s) => label("subject", s)).join(", ")}
              {t.hourlyRate ? ` · ${formatETB(t.hourlyRate)}/h` : ""}
            </option>
          ))}
        </Select>
        {picked && (
          <p className="mt-1 text-xs text-muted">
            Call the tutor to confirm, then call the family. Set status to
            Matched when they agree.
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <L label="Status">
          <Select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as TutorRequestRow["status"])
            }
          >
            {TUTOR_REQUEST_STATUSES.map((x) => (
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
                    title: "Delete this request?",
                    description:
                      "This permanently removes the family's details. It cannot be undone.",
                    confirmLabel: "Delete",
                    destructive: true,
                  })
                ).ok
              )
                run(
                  () => deletePersonAction("tutorRequest", r.id),
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
              () =>
                updateTutorRequestAction({
                  id: r.id,
                  status: tutorId && status === "NEW" ? "CONTACTED" : status,
                  notes,
                  tutorId: tutorId || null,
                }),
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
