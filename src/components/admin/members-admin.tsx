"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, BriefcaseBusiness, GraduationCap, RotateCcw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnSelectFilter, type ColumnDef } from "./data-table";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import { setCompanyVerifiedAction, setMemberActiveAction } from "@/server/actions/admin-members";
import { formatPhoneDisplay, relativeTime } from "@/lib/format";

export type MemberRow = {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  seeker: string | null;
  tutor: string | null;
  company: { id: string; name: string; verified: boolean; jobs: number } | null;
  applications: number;
};

export function MembersView({ rows, isAdmin }: { rows: MemberRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const columns = React.useMemo<ColumnDef<MemberRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Member",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <span>
            <span className="font-semibold text-fg">{r.name}</span>
            <span className="block text-xs text-muted">{formatPhoneDisplay(r.phone)}</span>
          </span>
        ),
      },
      {
        id: "uses",
        header: "Uses",
        accessorFn: (r) => [r.seeker && "talent", r.tutor && "tutor", r.company && "employer"].filter(Boolean).join(" "),
        filterFn: (row, id, v) => !v || String(row.getValue(id)).includes(v),
        cell: ({ row: { original: r } }) => (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {r.seeker && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-bg-2 px-2 py-0.5">
                <UserRound className="size-3.5" /> Talent · {r.seeker.toLowerCase()}
              </span>
            )}
            {r.tutor && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-bg-2 px-2 py-0.5">
                <GraduationCap className="size-3.5" /> Tutor · {r.tutor.toLowerCase()}
              </span>
            )}
            {r.applications > 0 && <span className="rounded-pill bg-bg-2 px-2 py-0.5">{r.applications} applications</span>}
            {!r.seeker && !r.tutor && !r.company && r.applications === 0 && <span className="text-muted">—</span>}
          </div>
        ),
      },
      {
        id: "company",
        header: "Company",
        accessorFn: (r) => r.company?.name ?? "",
        cell: ({ row: { original: r } }) =>
          r.company ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-semibold text-fg">
                <BriefcaseBusiness className="size-4 text-muted" /> {r.company.name}
                {r.company.verified && <BadgeCheck className="size-4 text-sold" aria-label="Verified" />}
              </span>
              <span className="text-xs text-muted">{r.company.jobs} jobs</span>
              <Button
                size="xs"
                variant={r.company.verified ? "ghost" : "secondary"}
                disabled={pending}
                onClick={async () => {
                  const verify = !r.company!.verified;
                  if (verify) {
                    const ok = await confirm({
                      title: `Verify ${r.company!.name}?`,
                      description: "Call them first and confirm the business is real. Verified employers see the names and phone numbers of people who apply to their jobs.",
                      confirmLabel: "Verify",
                    });
                    if (!ok.ok) return;
                  }
                  run(() => setCompanyVerifiedAction(r.company!.id, verify), () => router.refresh());
                }}
              >
                {r.company.verified ? "Unverify" : "Verify"}
              </Button>
            </div>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => (r.isActive ? "ACTIVE" : "HIDDEN"),
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row: { original: r } }) => (
          <span className="whitespace-nowrap text-muted">
            {relativeTime(r.createdAt)}
            {r.lastLoginAt && <span className="block text-xs">last in {relativeTime(r.lastLoginAt)}</span>}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row: { original: r } }) =>
          isAdmin ? (
            r.isActive ? (
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-error"
                aria-label={`Deactivate ${r.name}`}
                title="Deactivate"
                disabled={pending}
                onClick={async () => {
                  const ok = await confirm({
                    title: `Deactivate ${r.name}?`,
                    description: "They are signed out everywhere and cannot sign in. Their profiles and jobs stay for you to review.",
                    confirmLabel: "Deactivate",
                    destructive: true,
                  });
                  if (ok.ok) run(() => setMemberActiveAction(r.id, false), () => router.refresh());
                }}
              >
                <Ban />
              </Button>
            ) : (
              <Button size="icon-sm" variant="ghost" aria-label={`Reactivate ${r.name}`} title="Reactivate" disabled={pending} onClick={() => run(() => setMemberActiveAction(r.id, true), () => router.refresh())}>
                <RotateCcw />
              </Button>
            )
          ) : null,
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
      storageKey="members"
      searchPlaceholder="Search name, phone, company…"
      emptyText="No one has created an account yet."
      toolbar={(t) => (
        <>
          <ColumnSelectFilter
            table={t}
            column="uses"
            label="Uses"
            options={[
              { value: "talent", label: "Talent profile" },
              { value: "tutor", label: "Tutor profile" },
              { value: "employer", label: "Employer" },
            ]}
          />
          <ColumnSelectFilter
            table={t}
            column="status"
            label="Status"
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "HIDDEN", label: "Deactivated" },
            ]}
          />
        </>
      )}
    />
  );
}
