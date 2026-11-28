"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, ExternalLink, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnSelectFilter, type ColumnDef } from "./data-table";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import { deleteStoreAction, setStoreFeaturedAction, setStoreStatusAction } from "@/server/actions/admin-stores";
import { formatPhoneDisplay, relativeTime } from "@/lib/format";
import { STORE_STATUSES } from "@/lib/validators/stores";

export type StoreRow = {
  id: string;
  refCode: string;
  slug: string;
  name: string;
  type: string;
  phone: string;
  area: string;
  status: string;
  featured: boolean;
  items: number;
  owner: string;
  ownerPhone: string;
  createdAt: string;
};

export function StoresView({ rows, typeLabels, isAdmin }: { rows: StoreRow[]; typeLabels: Record<string, string>; isAdmin: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const set = (id: string, status: string, reason?: string) => run(() => setStoreStatusAction(id, status, reason), () => router.refresh());
  const columns = React.useMemo<ColumnDef<StoreRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Store",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <span>
            <span className="inline-flex items-center gap-1 font-semibold text-fg">
              {r.featured && <Star className="size-3.5 fill-yellow-500 text-yellow-500" aria-label="Featured" />} {r.name}
            </span>
            <span className="block text-xs text-muted">
              {r.refCode} · {typeLabels[r.type] ?? r.type} · {r.items} items
            </span>
          </span>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        accessorFn: (r) => `${r.owner} ${r.ownerPhone} ${r.phone}`,
        cell: ({ row: { original: r } }) => (
          <span className="text-sm">
            {r.owner}
            <span className="block text-xs text-muted">
              Account {formatPhoneDisplay(r.ownerPhone)} · Shop {formatPhoneDisplay(r.phone)}
            </span>
          </span>
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
        accessorKey: "createdAt",
        header: "Opened",
        cell: ({ getValue }) => <span className="whitespace-nowrap text-muted">{relativeTime(String(getValue()))}</span>,
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row: { original: r } }) => (
          <div className="flex items-center justify-end gap-1">
            {r.status === "ACTIVE" && (
              <Button asChild size="icon-sm" variant="ghost" aria-label={`View ${r.name}`} title="View">
                <a href={`/stores/${r.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                </a>
              </Button>
            )}
            {r.status !== "ACTIVE" && (
              <Button size="sm" disabled={pending} onClick={() => set(r.id, "ACTIVE")}>
                <Check /> Approve
              </Button>
            )}
            {r.status === "ACTIVE" && (
              <Button size="icon-sm" variant="ghost" aria-label={r.featured ? `Unfeature ${r.name}` : `Feature ${r.name}`} title={r.featured ? "Unfeature" : "Feature"} disabled={pending} onClick={() => run(() => setStoreFeaturedAction(r.id, !r.featured), () => router.refresh())}>
                <Star className={r.featured ? "fill-yellow-500 text-yellow-500" : ""} />
              </Button>
            )}
            {r.status === "ACTIVE" && (
              <Button size="icon-sm" variant="ghost" aria-label={`Hide ${r.name}`} title="Hide" disabled={pending} onClick={() => set(r.id, "HIDDEN")}>
                <EyeOff />
              </Button>
            )}
            {r.status === "PENDING" && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Reject ${r.name}`}
                title="Reject"
                disabled={pending}
                onClick={async () => {
                  const res = await confirm({ title: `Reject ${r.name}?`, description: "The owner sees the reason in their account.", confirmLabel: "Reject", destructive: true, input: { type: "textarea", label: "Reason" } });
                  if (res.ok) set(r.id, "REJECTED", res.value);
                }}
              >
                <X />
              </Button>
            )}
            {isAdmin && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-error"
                aria-label={`Delete ${r.name}`}
                title="Delete"
                disabled={pending}
                onClick={async () => {
                  const res = await confirm({ title: `Delete ${r.name}?`, description: `This permanently deletes the store and its ${r.items} items. It cannot be undone.`, confirmLabel: "Delete", destructive: true });
                  if (res.ok) run(() => deleteStoreAction(r.id), () => router.refresh());
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
    [isAdmin, pending, typeLabels],
  );
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      storageKey="stores"
      searchPlaceholder="Search store, owner, phone…"
      emptyText="No business has opened a store yet."
      toolbar={(t) => <ColumnSelectFilter table={t} column="status" label="Status" options={STORE_STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />}
    />
  );
}
