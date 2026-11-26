"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, EyeOff, Loader2, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChipGroup } from "@/components/forms/form-kit";
import { DataTable, ColumnSelectFilter, type ColumnDef } from "./data-table";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import { RowActions } from "./row-actions";
import { ContactButtons, L, Toggle, useLabel } from "./jobs-admin";
import { deletePersonAction, deleteReviewAction, saveTalentProfileAction, setReviewStatusAction, updateTalentRequestAction } from "@/server/actions/admin-jobs";
import { LANGUAGES } from "@/lib/jobs-catalog";
import { REVIEW_STATUSES, TALENT_REQUEST_STATUSES } from "@/lib/validators/jobs";
import { formatPhoneDisplay, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

/* ---------------- Public talent profile (inside the talent pool dialog) ---------------- */

export type TalentProfileRow = {
  id: string;
  slug: string | null;
  status: string;
  visibility: string;
  displayName: string | null;
  name: string;
  profession: string;
  skills: string | null;
  about: string | null;
  languages: string[];
  certifications: string | null;
  projects: string | null;
  portfolioUrl: string | null;
  availability: string | null;
  isVerified: boolean;
};

export function TalentProfileEditor({ p }: { p: TalentProfileRow }) {
  const router = useRouter();
  const label = useLabel();
  const { run, pending } = useRunAction();
  const [v, setV] = React.useState({ ...p, displayName: p.displayName || p.name.split(/\s+/)[0] });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((x) => ({ ...x, [k]: val }));
  const live = p.visibility === "PUBLIC" && p.status === "ACTIVE" && p.slug;
  return (
    <section className="space-y-3 rounded-btn border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold text-fg">Public profile (Find Talent)</h3>
        <StatusBadge status={p.visibility} />
        {live ? (
          <Button asChild variant="ghost" size="sm">
            <a href={`/talent/${p.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> View
            </a>
          </Button>
        ) : (
          <span className="text-xs text-muted">{p.visibility === "PUBLIC" ? "Goes live when status is Active" : "Not listed"}</span>
        )}
      </div>
      <p className="text-xs text-muted">Only the public name, profession, skills and the fields below are shown. Phone and full name stay private.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Visibility">
          <Select value={v.visibility} onChange={(e) => set("visibility", e.target.value)}>
            <option value="PRIVATE">Private (staff only)</option>
            <option value="PUBLIC">Public on Find Talent</option>
          </Select>
        </L>
        <L label="Public name (first name)">
          <Input value={v.displayName ?? ""} onChange={(e) => set("displayName", e.target.value)} />
        </L>
        <L label="Profession / title" className="sm:col-span-2">
          <Input value={v.profession} onChange={(e) => set("profession", e.target.value)} />
        </L>
        <L label="Skills (comma separated)" className="sm:col-span-2">
          <Input value={v.skills ?? ""} onChange={(e) => set("skills", e.target.value)} />
        </L>
      </div>
      <L label="About">
        <Textarea rows={3} value={v.about ?? ""} onChange={(e) => set("about", e.target.value)} />
      </L>
      <L label="Projects and work">
        <Textarea rows={2} value={v.projects ?? ""} onChange={(e) => set("projects", e.target.value)} />
      </L>
      <div className="grid gap-3 sm:grid-cols-3">
        <L label="Certificates">
          <Input value={v.certifications ?? ""} onChange={(e) => set("certifications", e.target.value)} />
        </L>
        <L label="Portfolio link">
          <Input value={v.portfolioUrl ?? ""} onChange={(e) => set("portfolioUrl", e.target.value)} />
        </L>
        <L label="Available">
          <Input value={v.availability ?? ""} onChange={(e) => set("availability", e.target.value)} />
        </L>
      </div>
      <ChipGroup
        legend="Languages"
        multiple
        options={LANGUAGES.map((l) => ({ value: l, label: label("language", l) }))}
        value={v.languages}
        onChange={(x) => set("languages", x as string[])}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle label="Checked by BrokerSodo" hint="You called them and confirmed the details" checked={v.isVerified} onChange={(c) => set("isVerified", c)} />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                saveTalentProfileAction({
                  id: v.id,
                  visibility: v.visibility,
                  displayName: v.displayName,
                  profession: v.profession,
                  skills: v.skills,
                  about: v.about,
                  languages: v.languages,
                  certifications: v.certifications,
                  projects: v.projects,
                  portfolioUrl: v.portfolioUrl,
                  availability: v.availability,
                  isVerified: v.isVerified,
                }),
              () => router.refresh(),
            )
          }
        >
          {pending && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </div>
    </section>
  );
}

/* ---------------- Talent requests (employers asking about a candidate) ---------------- */

export type TalentRequestRow = {
  id: string;
  employerName: string;
  contactName: string;
  phone: string;
  message: string | null;
  status: (typeof TALENT_REQUEST_STATUSES)[number];
  notes: string | null;
  createdAt: string;
  seeker: { name: string; phone: string; profession: string; slug: string | null } | null;
};

export function TalentRequestsView({ rows, isAdmin }: { rows: TalentRequestRow[]; isAdmin: boolean }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const open = rows.find((r) => r.id === openId) ?? null;
  const columns = React.useMemo<ColumnDef<TalentRequestRow, unknown>[]>(
    () => [
      {
        accessorKey: "employerName",
        header: "Employer",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <button type="button" onClick={() => setOpenId(r.id)} className="cursor-pointer text-left">
            <span className="font-semibold text-fg hover:underline">{r.employerName}</span>
            <span className="block text-xs text-muted">
              {r.contactName} · {formatPhoneDisplay(r.phone)}
            </span>
          </button>
        ),
      },
      {
        id: "candidate",
        header: "Candidate",
        accessorFn: (r) => (r.seeker ? `${r.seeker.name} ${r.seeker.profession}` : ""),
        cell: ({ row: { original: r } }) =>
          r.seeker ? (
            <span>
              <span className="font-semibold text-fg">{r.seeker.name}</span>
              <span className="block text-xs text-muted">{r.seeker.profession}</span>
            </span>
          ) : (
            <span className="text-muted">Profile removed</span>
          ),
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
        cell: ({ getValue }) => <span className="whitespace-nowrap text-muted">{relativeTime(String(getValue()))}</span>,
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row: { original: r } }) => (
          <RowActions
            label={r.employerName}
            onEdit={() => setOpenId(r.id)}
            onDelete={isAdmin ? () => deletePersonAction("talentRequest", r.id) : undefined}
            deleteText="This permanently deletes the request and the employer's phone number."
          />
        ),
      },
    ],
    [isAdmin],
  );
  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        storageKey="talent-requests"
        searchPlaceholder="Search employer, phone, candidate…"
        emptyText="No employer has asked about a candidate yet."
        toolbar={(t) => <ColumnSelectFilter table={t} column="status" label="Status" options={TALENT_REQUEST_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <DialogContent title={open.employerName} description={`Asked ${relativeTime(open.createdAt)}`} className="max-w-xl">
            <TalentRequestDetail key={open.id} r={open} onDone={() => setOpenId(null)} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function TalentRequestDetail({ r, onDone }: { r: TalentRequestRow; onDone: () => void }) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [status, setStatus] = React.useState(r.status);
  const [notes, setNotes] = React.useState(r.notes ?? "");
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-bold text-muted uppercase">Employer</p>
        <ContactButtons name={r.contactName} phone={r.phone} about={`your request on BrokerSodo for ${r.seeker?.profession ?? "a candidate"}`} />
      </div>
      {r.message && <p className="rounded-btn bg-bg-2 p-3 text-sm whitespace-pre-line text-fg-2">{r.message}</p>}
      {r.seeker && (
        <div>
          <p className="mb-1 text-xs font-bold text-muted uppercase">Candidate · {r.seeker.profession}</p>
          <ContactButtons name={r.seeker.name} phone={r.seeker.phone} about={`a job offer from ${r.employerName}`} />
          {r.seeker.slug && (
            <a href={`/talent/${r.seeker.slug}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">
              <ExternalLink className="size-4" /> Public profile
            </a>
          )}
        </div>
      )}
      <p className="text-xs text-muted">Call the candidate first. Share contacts only when both agree, then mark it Connected.</p>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <L label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as TalentRequestRow["status"])}>
            {TALENT_REQUEST_STATUSES.map((x) => (
              <option key={x} value={x}>
                {titleCase(x)}
              </option>
            ))}
          </Select>
        </L>
        <L label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </L>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            run(
              () => updateTalentRequestAction({ id: r.id, status, notes }),
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

/* ---------------- Tutor reviews ---------------- */

export type ReviewRow = {
  id: string;
  name: string;
  phone: string;
  rating: number;
  comment: string;
  verified: boolean;
  status: (typeof REVIEW_STATUSES)[number];
  createdAt: string;
  tutor: { displayName: string; refCode: string; slug: string };
};

export function ReviewsView({ rows, isAdmin }: { rows: ReviewRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const setStatus = (id: string, status: string) => run(() => setReviewStatusAction(id, status), () => router.refresh());
  const columns = React.useMemo<ColumnDef<ReviewRow, unknown>[]>(
    () => [
      {
        id: "review",
        header: "Review",
        enableHiding: false,
        accessorFn: (r) => `${r.comment} ${r.name}`,
        cell: ({ row: { original: r } }) => (
          <div className="max-w-xl">
            <span className="inline-flex" aria-label={`${r.rating} stars`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("size-4", n <= r.rating ? "fill-yellow-500 text-yellow-500" : "text-line-strong")} />
              ))}
            </span>
            <p className="mt-1 text-sm whitespace-pre-line text-fg">{r.comment}</p>
            <p className="mt-1 text-xs text-muted">
              {r.name} · {formatPhoneDisplay(r.phone)}
              {r.verified ? " · matched by us" : " · not matched by us — call to check"}
            </p>
          </div>
        ),
      },
      {
        id: "tutor",
        header: "Tutor",
        accessorFn: (r) => `${r.tutor.displayName} ${r.tutor.refCode}`,
        cell: ({ row: { original: r } }) => (
          <a href={`/tutors/${r.tutor.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-fg hover:underline">
            {r.tutor.displayName}
            <span className="block font-mono text-xs text-muted">{r.tutor.refCode}</span>
          </a>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        accessorKey: "createdAt",
        header: "Sent",
        cell: ({ getValue }) => <span className="whitespace-nowrap text-muted">{relativeTime(String(getValue()))}</span>,
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row: { original: r } }) => (
          <div className="flex items-center justify-end gap-1">
            {r.status !== "APPROVED" && (
              <Button size="icon-sm" variant="ghost" className="text-sold" aria-label="Approve review" disabled={pending} onClick={() => setStatus(r.id, "APPROVED")}>
                <Check />
              </Button>
            )}
            {r.status === "APPROVED" && (
              <Button size="icon-sm" variant="ghost" aria-label="Hide review" disabled={pending} onClick={() => setStatus(r.id, "PENDING")}>
                <EyeOff />
              </Button>
            )}
            {r.status !== "REJECTED" && (
              <Button size="icon-sm" variant="ghost" aria-label="Reject review" disabled={pending} onClick={() => setStatus(r.id, "REJECTED")}>
                <X />
              </Button>
            )}
            {isAdmin && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-error"
                aria-label="Delete review"
                disabled={pending}
                onClick={async () => {
                  const res = await confirm({ title: "Delete this review?", description: "It is removed for good and the tutor's rating is updated.", confirmLabel: "Delete", destructive: true });
                  if (res.ok) run(() => deleteReviewAction(r.id), () => router.refresh());
                }}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, pending],
  );
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      storageKey="tutor-reviews"
      searchPlaceholder="Search review, name, tutor…"
      emptyText="No reviews yet."
      toolbar={(t) => <ColumnSelectFilter table={t} column="status" label="Status" options={REVIEW_STATUSES.map((s) => ({ value: s, label: titleCase(s) }))} />}
    />
  );
}
