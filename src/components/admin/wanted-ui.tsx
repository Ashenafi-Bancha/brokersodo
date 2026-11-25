"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Select, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WhatsAppIcon } from "@/components/layout/icons";
import { DataTable, ColumnSelectFilter, type ColumnDef } from "./data-table";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import { RowActions } from "./row-actions";
import {
  deleteWantedAction,
  suggestMatchesAction,
  updateWantedAction,
} from "@/server/actions/admin-inbox";
import { formatETB, formatPhoneDisplay, relativeTime } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/contact";
import { WANTED_STATUSES } from "@/lib/validators/common";

export type WantedRow = {
  id: string;
  name: string;
  phone: string;
  category: string;
  dealType: "SALE" | "RENT";
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  area: string;
  status: (typeof WANTED_STATUSES)[number];
  notes: string | null;
  createdAt: string;
  matches: {
    id: string;
    refCode: string;
    titleEn: string;
    price: number | null;
  }[];
};

const budget = (r: WantedRow) =>
  r.budgetMin == null && r.budgetMax == null
    ? "Any"
    : `${r.budgetMin != null ? formatETB(r.budgetMin, { suffix: false }) : "0"} – ${r.budgetMax != null ? formatETB(r.budgetMax) : "∞"}`;

export function WantedView({
  rows,
  isAdmin,
}: {
  rows: WantedRow[];
  isAdmin: boolean;
}) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const open = rows.find((r) => r.id === openId) ?? null;
  const columns = React.useMemo<ColumnDef<WantedRow, unknown>[]>(
    () => [
      {
        accessorKey: "description",
        header: "Looking for",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <button
            type="button"
            onClick={() => setOpenId(r.id)}
            className="cursor-pointer text-left"
          >
            <span className="line-clamp-2 max-w-md font-semibold text-fg hover:underline">
              {r.description}
            </span>
            <span className="text-xs text-muted">
              {r.name} · {r.matches.length} match
              {r.matches.length === 1 ? "" : "es"} linked
            </span>
          </button>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        accessorKey: "category",
        header: "Category",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
      },
      {
        accessorKey: "dealType",
        header: "Deal",
        cell: ({ getValue }) => (getValue() === "RENT" ? "Rent" : "Buy"),
      },
      {
        id: "budget",
        header: "Budget",
        accessorFn: (r) => r.budgetMax ?? r.budgetMin ?? 0,
        cell: ({ row: { original: r } }) => (
          <span className="whitespace-nowrap tabular-nums">{budget(r)}</span>
        ),
      },
      { accessorKey: "area", header: "Area" },
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
            onDelete={isAdmin ? () => deleteWantedAction(r.id) : undefined}
          />
        ),
      },
    ],
    [isAdmin],
  );
  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        storageKey="wanted"
        searchPlaceholder="Search requests…"
        emptyText="No wanted requests."
        toolbar={(t) => (
          <>
            <ColumnSelectFilter
              table={t}
              column="status"
              label="Status"
              options={WANTED_STATUSES.map((s) => ({
                value: s,
                label: s.charAt(0) + s.slice(1).toLowerCase(),
              }))}
            />
            <ColumnSelectFilter
              table={t}
              column="category"
              label="Category"
              options={categories.map((c) => ({ value: c, label: c }))}
            />
          </>
        )}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <DialogContent
            title={`Wanted: ${open.name}`}
            description={`${open.category || "Any category"} · ${open.dealType === "RENT" ? "Rent" : "Buy"} · ${budget(open)}`}
            className="max-w-2xl"
          >
            <WantedDetail
              key={open.id}
              row={open}
              isAdmin={isAdmin}
              onDone={() => setOpenId(null)}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function WantedDetail({
  row,
  isAdmin,
  onDone,
}: {
  row: WantedRow;
  isAdmin: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [status, setStatus] = React.useState(row.status);
  const [notes, setNotes] = React.useState(row.notes ?? "");
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(row.matches.map((m) => m.id)),
  );
  const [suggestions, setSuggestions] = React.useState<
    WantedRow["matches"] | null
  >(null);
  const [loading, setLoading] = React.useState(false);
  const pool = React.useMemo(() => {
    const map = new Map(row.matches.map((m) => [m.id, m]));
    for (const s of suggestions ?? []) map.set(s.id, s);
    return [...map.values()];
  }, [row.matches, suggestions]);

  return (
    <div className="space-y-5">
      <p className="rounded-btn bg-bg-2 p-3 text-sm whitespace-pre-line text-fg-2">
        {row.description}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="call" size="sm">
          <a href={telLink(row.phone)}>
            <Phone /> {formatPhoneDisplay(row.phone)}
          </a>
        </Button>
        <Button asChild variant="whatsapp" size="sm">
          <a
            href={whatsappLink(
              row.phone,
              `Hello ${row.name}, this is BrokerSodo about your request.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon /> WhatsApp
          </a>
        </Button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-fg">Matching listings</p>
          <Button
            variant="outline"
            size="xs"
            className="border-line"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setSuggestions(await suggestMatchesAction(row.id));
              setLoading(false);
            }}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}{" "}
            Suggest matches
          </Button>
        </div>
        {pool.length === 0 ? (
          <p className="text-sm text-muted">
            No linked listings. Click “Suggest matches”.
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {pool.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-btn p-2 hover:bg-bg-2">
                  <Checkbox
                    checked={selected.has(m.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      setSelected(next);
                    }}
                  />
                  <span className="font-mono text-xs font-bold text-primary">
                    {m.refCode}
                  </span>
                  <span className="flex-1 truncate text-sm text-fg">
                    {m.titleEn}
                  </span>
                  <span className="text-xs text-muted tabular-nums">
                    {m.price ? formatETB(m.price) : "—"}
                  </span>
                  <Link
                    href={`/admin/listings/${m.id}`}
                    target="_blank"
                    className="text-xs font-bold text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    open
                  </Link>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
          Status
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as WantedRow["status"])}
          >
            {WANTED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
          Notes
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        {isAdmin && (
          <Button
            variant="ghost"
            className="mr-auto text-error"
            disabled={pending}
            onClick={async () => {
              if (
                (
                  await confirm({
                    title: `Delete the request from ${row.name}?`,
                    description:
                      "This permanently removes it. It cannot be undone.",
                    confirmLabel: "Delete",
                    destructive: true,
                  })
                ).ok
              )
                run(
                  () => deleteWantedAction(row.id),
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
                updateWantedAction({
                  id: row.id,
                  status:
                    selected.size && status === "OPEN" ? "MATCHED" : status,
                  notes,
                  matchListingIds: [...selected],
                }),
              () => {
                onDone();
                router.refresh();
              },
            )
          }
        >
          {selected.size && status === "OPEN" ? "Save & mark matched" : "Save"}
        </Button>
      </div>
    </div>
  );
}
