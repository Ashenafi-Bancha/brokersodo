"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnSelectFilter, DataTable, type ColumnDef } from "./data-table";
import { ListingRowMenu } from "./listing-actions";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import { changeListingStatusAction } from "@/server/actions/admin-listings";
import { formatETB, rentSuffix } from "@/lib/format";
import type { AdminListingRow } from "@/server/queries/admin";

const exact = (row: { getValue: (id: string) => unknown }, id: string, v: string) => !v || String(row.getValue(id)) === v;

export function ListingsTable({ rows, isAdmin, categories, brokers }: { rows: AdminListingRow[]; isAdmin: boolean; categories: string[]; brokers: { id: string; name: string }[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();

  const columns = React.useMemo<ColumnDef<AdminListingRow, unknown>[]>(
    () => [
      {
        id: "listing",
        header: "Listing",
        accessorFn: (r) => `${r.refCode} ${r.title}`,
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <Link href={`/admin/listings/${r.id}`} className="group flex items-center gap-3">
            <span className="size-12 shrink-0 overflow-hidden rounded-sm bg-line">
              {r.thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumb} alt="" className="size-full object-cover" loading="lazy" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-xs font-bold text-primary">{r.refCode}</span>
              <span className="line-clamp-1 font-semibold text-fg group-hover:underline">{r.title}</span>
            </span>
            {r.featured && <Star className="size-4 shrink-0 fill-yellow-500 text-yellow-500" aria-label="Featured" />}
            {r.isVerified && <ShieldCheck className="size-4 shrink-0 text-sold" aria-label="Verified" />}
          </Link>
        ),
      },
      { accessorKey: "status", header: "Status", filterFn: (row, id, v) => exact(row, id, v), cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
      { accessorKey: "category", header: "Category", filterFn: (row, id, v) => exact(row, id, v) },
      { accessorKey: "dealType", header: "Deal", filterFn: (row, id, v) => exact(row, id, v), cell: ({ getValue }) => (getValue() === "RENT" ? "Rent" : "Sale") },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row: { original: r } }) => (r.priceOnRequest || r.price == null ? <span className="text-muted">On request</span> : <span className="font-semibold whitespace-nowrap tabular-nums">{formatETB(r.price)} <span className="text-xs text-muted">{rentSuffix(r.rentPeriod)}</span></span>),
        sortUndefined: "last",
      },
      { accessorKey: "area", header: "Area" },
      { accessorKey: "brokerId", header: "Broker", filterFn: (row, id, v) => exact(row, id, v), cell: ({ row: { original: r } }) => r.broker || <span className="text-muted">—</span> },
      { accessorKey: "views", header: "Views", cell: ({ getValue }) => <span className="tabular-nums">{Number(getValue()).toLocaleString()}</span> },
      { accessorKey: "inquiries", header: "Leads", cell: ({ getValue }) => <span className="tabular-nums">{Number(getValue())}</span> },
      { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => <span className="whitespace-nowrap text-muted">{new Date(String(getValue())).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span> },
      { id: "actions", header: "", enableHiding: false, enableSorting: false, cell: ({ row: { original: r } }) => <ListingRowMenu listing={r} isAdmin={isAdmin} /> },
    ],
    [isAdmin],
  );

  const bulk = (action: "publish" | "archive" | "feature" | "verify" | "unfeature", ids: string[], clear: () => void) =>
    run(() => changeListingStatusAction({ ids, action }), () => {
      clear();
      router.refresh();
    });

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      storageKey="listings"
      initialVisibility={{ area: false }}
      searchPlaceholder="Search ref code or title…"
      emptyText="No listings match."
      toolbar={(table) => (
        <>
          <ColumnSelectFilter table={table} column="status" label="Status" options={["DRAFT", "PUBLISHED", "RESERVED", "SOLD", "RENTED", "ARCHIVED"].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
          <ColumnSelectFilter table={table} column="category" label="Category" options={categories.map((c) => ({ value: c, label: c }))} />
          <ColumnSelectFilter table={table} column="dealType" label="Deal" options={[{ value: "SALE", label: "Sale" }, { value: "RENT", label: "Rent" }]} />
          <ColumnSelectFilter table={table} column="brokerId" label="Broker" options={brokers.map((b) => ({ value: b.id, label: b.name }))} />
        </>
      )}
      bulkActions={(selected, clear) => {
        const ids = selected.map((s) => s.id);
        const cls = "h-8 rounded-sm px-2.5 text-xs font-bold hover:bg-white/15 dark:hover:bg-navy-900/10 disabled:opacity-50 cursor-pointer";
        return (
          <>
            <button className={cls} disabled={pending} onClick={() => bulk("publish", ids, clear)}>Publish</button>
            <button className={cls} disabled={pending} onClick={() => bulk("feature", ids, clear)}>Feature</button>
            <button className={cls} disabled={pending} onClick={() => bulk("unfeature", ids, clear)}>Unfeature</button>
            <button className={cls} disabled={pending} onClick={() => bulk("verify", ids, clear)}>Mark verified</button>
            <button
              className={cls}
              disabled={pending}
              onClick={async () => {
                if ((await confirm({ title: `Archive ${ids.length} listings?`, description: "They will be removed from the public site.", confirmLabel: "Archive" })).ok) bulk("archive", ids, clear);
              }}
            >
              Archive
            </button>
            <Button variant="link" size="xs" className="ml-auto text-current" onClick={clear}>
              Clear
            </Button>
          </>
        );
      }}
    />
  );
}
