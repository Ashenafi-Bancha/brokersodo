"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Columns3,
  ExternalLink,
  LayoutList,
  Phone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/form-controls";
import { TelegramIcon, WhatsAppIcon } from "@/components/layout/icons";
import { DataTable, ColumnSelectFilter, type ColumnDef } from "./data-table";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import {
  deleteInquiryAction,
  updateInquiryAction,
} from "@/server/actions/admin-inbox";
import { RowActions } from "./row-actions";
import { INQUIRY_STATUSES } from "@/lib/validators/common";
import { formatPhoneDisplay, relativeTime } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/contact";
import { cn } from "@/lib/utils";

export type InquiryRow = {
  id: string;
  name: string;
  phone: string;
  message: string | null;
  preferredContact: "CALL" | "TELEGRAM" | "WHATSAPP";
  source: string;
  status: (typeof INQUIRY_STATUSES)[number];
  notes: string | null;
  createdAt: string;
  brokerId: string | null;
  brokerName: string | null;
  listing: { id: string; refCode: string; title: string; slug: string } | null;
};

const LABEL: Record<InquiryRow["status"], string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  VIEWING_SCHEDULED: "Viewing scheduled",
  NEGOTIATING: "Negotiating",
  CLOSED_WON: "Closed — won",
  CLOSED_LOST: "Closed — lost",
};
const ACCENT: Record<InquiryRow["status"], string> = {
  NEW: "bg-red-500",
  CONTACTED: "bg-info",
  VIEWING_SCHEDULED: "bg-amber-500",
  NEGOTIATING: "bg-yellow-500",
  CLOSED_WON: "bg-sold",
  CLOSED_LOST: "bg-navy-300",
};

export function InquiriesView({
  rows,
  brokers,
  isAdmin,
}: {
  rows: InquiryRow[];
  brokers: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const [view, setView] = React.useState<"board" | "table">("board");
  const [items, setItems] = React.useState(rows);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [brokerFilter, setBrokerFilter] = React.useState("");
  const router = useRouter();
  const { run } = useRunAction();
  React.useEffect(() => setItems(rows), [rows]);
  React.useEffect(() => {
    try {
      const v = localStorage.getItem("bs:inq-view");
      if (v === "table" || v === "board") setView(v);
    } catch {
      /* ignore */
    }
  }, []);
  const switchView = (v: "board" | "table") => {
    setView(v);
    try {
      localStorage.setItem("bs:inq-view", v);
    } catch {
      /* ignore */
    }
  };

  const move = (id: string, status: InquiryRow["status"]) => {
    const prev = items;
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, status } : i)));
    run(
      async () => {
        const r = await updateInquiryAction({ id, status });
        if (!r.ok) setItems(prev);
        return { ...r, message: undefined };
      },
      () => router.refresh(),
    );
  };

  const visible = brokerFilter
    ? items.filter((i) =>
        brokerFilter === "none" ? !i.brokerId : i.brokerId === brokerFilter,
      )
    : items;
  const open = items.find((i) => i.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-btn bg-surface p-1 shadow-card"
          role="tablist"
          aria-label="View"
        >
          {(
            [
              ["board", "Board", Columns3],
              ["table", "Table", LayoutList],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => switchView(v)}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-sm font-semibold",
                view === v
                  ? "bg-navy-900 text-white dark:bg-yellow-500 dark:text-navy-900"
                  : "text-muted",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        {view === "board" && (
          <select
            value={brokerFilter}
            onChange={(e) => setBrokerFilter(e.target.value)}
            aria-label="Filter by broker"
            className="min-h-10 rounded-btn border-[1.5px] border-line bg-surface px-3 text-sm"
          >
            <option value="">All brokers</option>
            <option value="none">Unassigned</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {view === "board" ? (
        <Board items={visible} onMove={move} onOpen={setOpenId} isAdmin={isAdmin} />
      ) : (
        <InquiryTable
          rows={items}
          brokers={brokers}
          onOpen={setOpenId}
          isAdmin={isAdmin}
        />
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <DialogContent
            title={`Inquiry from ${open.name}`}
            description={`${relativeTime(open.createdAt)} · via ${open.source}`}
            className="max-w-xl"
          >
            <InquiryDetail
              key={open.id}
              inquiry={open}
              brokers={brokers}
              isAdmin={isAdmin}
              onChanged={(patch) =>
                setItems((cur) =>
                  cur.map((i) => (i.id === open.id ? { ...i, ...patch } : i)),
                )
              }
              onDeleted={() => {
                setOpenId(null);
                router.refresh();
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Board({
  items,
  onMove,
  onOpen,
  isAdmin,
}: {
  items: InquiryRow[];
  onMove: (id: string, s: InquiryRow["status"]) => void;
  onOpen: (id: string) => void;
  isAdmin: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const to = e.over?.id as InquiryRow["status"] | undefined;
    const item = items.find((i) => i.id === e.active.id);
    if (to && item && item.status !== to) onMove(item.id, to);
  };
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {INQUIRY_STATUSES.map((s) => (
          <Column
            key={s}
            status={s}
            items={items.filter((i) => i.status === s)}
            onOpen={onOpen}
            onMove={onMove}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  items,
  onOpen,
  onMove,
  isAdmin,
}: {
  status: InquiryRow["status"];
  items: InquiryRow[];
  onOpen: (id: string) => void;
  onMove: (id: string, s: InquiryRow["status"]) => void;
  isAdmin: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={LABEL[status]}
      className={cn(
        "flex w-72 shrink-0 snap-start flex-col rounded-card bg-bg-2 p-2 transition-colors dark:bg-navy-800",
        isOver && "ring-2 ring-yellow-500",
      )}
    >
      <header className="flex items-center gap-2 px-2 py-2">
        <span
          className={cn("size-2.5 rounded-full", ACCENT[status])}
          aria-hidden
        />
        <h2 className="text-sm font-bold text-fg">{LABEL[status]}</h2>
        <span className="ml-auto rounded-pill bg-surface px-2 text-xs font-bold text-muted">
          {items.length}
        </span>
      </header>
      <ul className="flex min-h-24 flex-col gap-2">
        {items.map((i) => (
          <Card key={i.id} item={i} onOpen={onOpen} onMove={onMove} isAdmin={isAdmin} />
        ))}
      </ul>
    </section>
  );
}

function Card({
  item,
  onOpen,
  onMove,
  isAdmin,
}: {
  item: InquiryRow;
  onOpen: (id: string) => void;
  onMove: (id: string, s: InquiryRow["status"]) => void;
  isAdmin: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "rounded-btn bg-surface p-3 shadow-card",
        isDragging && "z-20 shadow-pop ring-2 ring-yellow-500",
      )}
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
        aria-roledescription="Draggable lead. Press space to pick up, arrows to move, space to drop."
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-fg">{item.name}</p>
          <span className="shrink-0 text-[11px] text-muted">
            {relativeTime(item.createdAt)}
          </span>
        </div>
        {item.listing && (
          <p className="mt-0.5 font-mono text-xs font-bold text-primary">
            {item.listing.refCode}
          </p>
        )}
        {item.message && (
          <p className="mt-1 line-clamp-2 text-xs text-fg-2">{item.message}</p>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1">
        <a
          href={telLink(item.phone)}
          aria-label={`Call ${item.name}`}
          className="grid size-8 place-items-center rounded-full bg-red-500 text-white"
        >
          <Phone className="size-3.5" />
        </a>
        <a
          href={whatsappLink(item.phone)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp ${item.name}`}
          className="grid size-8 place-items-center rounded-full bg-whatsapp text-white"
        >
          <WhatsAppIcon className="size-3.5" />
        </a>
        <span className="ml-1 truncate text-[11px] text-muted">
          {item.brokerName ?? "Unassigned"}
        </span>
        <select
          aria-label="Move to"
          value={item.status}
          onChange={(e) =>
            onMove(item.id, e.target.value as InquiryRow["status"])
          }
          className="ml-auto max-w-[5.5rem] rounded-sm border border-line bg-bg px-1 py-1 text-[11px] sm:hidden"
        >
          {INQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </select>
        <div className="ml-auto">
          <RowActions
            label={`inquiry from ${item.name}`}
            onEdit={() => onOpen(item.id)}
            onDelete={isAdmin ? () => deleteInquiryAction(item.id) : undefined}
          />
        </div>
      </div>
    </li>
  );
}

function InquiryTable({
  rows,
  brokers,
  onOpen,
  isAdmin,
}: {
  rows: InquiryRow[];
  brokers: { id: string; name: string }[];
  onOpen: (id: string) => void;
  isAdmin: boolean;
}) {
  const columns = React.useMemo<ColumnDef<InquiryRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <button
            type="button"
            onClick={() => onOpen(r.id)}
            className="cursor-pointer font-semibold text-fg hover:underline"
          >
            {r.name}
          </button>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ getValue }) => (
          <a
            href={telLink(String(getValue()))}
            className="whitespace-nowrap text-primary"
          >
            {formatPhoneDisplay(String(getValue()))}
          </a>
        ),
      },
      {
        id: "listing",
        header: "Listing",
        accessorFn: (r) => r.listing?.refCode ?? "",
        cell: ({ row: { original: r } }) =>
          r.listing ? (
            <Link
              href={`/admin/listings/${r.listing.id}`}
              className="font-mono text-xs font-bold text-primary"
            >
              {r.listing.refCode}
            </Link>
          ) : (
            <span className="text-muted">{r.source}</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        accessorKey: "brokerId",
        header: "Broker",
        filterFn: (row, id, v) =>
          !v || (v === "none" ? !row.getValue(id) : row.getValue(id) === v),
        cell: ({ row: { original: r } }) =>
          r.brokerName ?? <span className="text-muted">—</span>,
      },
      {
        accessorKey: "preferredContact",
        header: "Prefers",
        cell: ({ getValue }) => String(getValue()).toLowerCase(),
      },
      {
        accessorKey: "message",
        header: "Message",
        cell: ({ getValue }) => (
          <span className="line-clamp-1 max-w-xs text-fg-2">
            {String(getValue() ?? "")}
          </span>
        ),
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
            label={`inquiry from ${r.name}`}
            onEdit={() => onOpen(r.id)}
            onDelete={isAdmin ? () => deleteInquiryAction(r.id) : undefined}
          />
        ),
      },
    ],
    [onOpen, isAdmin],
  );
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      storageKey="inquiries"
      searchPlaceholder="Search name, phone, ref…"
      toolbar={(t) => (
        <>
          <ColumnSelectFilter
            table={t}
            column="status"
            label="Status"
            options={INQUIRY_STATUSES.map((s) => ({
              value: s,
              label: LABEL[s],
            }))}
          />
          <ColumnSelectFilter
            table={t}
            column="brokerId"
            label="Broker"
            options={[
              { value: "none", label: "Unassigned" },
              ...brokers.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </>
      )}
    />
  );
}

function InquiryDetail({
  inquiry,
  brokers,
  isAdmin,
  onChanged,
  onDeleted,
}: {
  inquiry: InquiryRow;
  brokers: { id: string; name: string }[];
  isAdmin: boolean;
  onChanged: (p: Partial<InquiryRow>) => void;
  onDeleted: () => void;
}) {
  const [notes, setNotes] = React.useState(inquiry.notes ?? "");
  const { run, pending } = useRunAction();
  const confirm = useConfirm();
  const router = useRouter();
  const save = (patch: {
    status?: InquiryRow["status"];
    assignedBrokerId?: string | null;
    notes?: string;
  }) =>
    run(
      () => updateInquiryAction({ id: inquiry.id, ...patch }),
      () => {
        onChanged({
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.assignedBrokerId !== undefined
            ? {
                brokerId: patch.assignedBrokerId,
                brokerName:
                  brokers.find((b) => b.id === patch.assignedBrokerId)?.name ??
                  null,
              }
            : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        });
        router.refresh();
      },
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="call" size="sm">
          <a href={telLink(inquiry.phone)}>
            <Phone /> {formatPhoneDisplay(inquiry.phone)}
          </a>
        </Button>
        <Button asChild variant="whatsapp" size="sm">
          <a
            href={whatsappLink(
              inquiry.phone,
              `Hello ${inquiry.name}, this is BrokerSodo${inquiry.listing ? ` about ${inquiry.listing.refCode}` : ""}.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon /> WhatsApp
          </a>
        </Button>
        {inquiry.preferredContact === "TELEGRAM" && (
          <span className="inline-flex items-center gap-1 rounded-pill bg-bg-2 px-3 text-xs font-semibold text-muted">
            <TelegramIcon className="size-3.5" /> prefers Telegram
          </span>
        )}
      </div>
      {inquiry.listing && (
        <Link
          href={`/admin/listings/${inquiry.listing.id}`}
          className="flex items-center gap-2 rounded-btn bg-bg-2 p-3 text-sm"
        >
          <span className="font-mono font-bold text-primary">
            {inquiry.listing.refCode}
          </span>
          <span className="truncate text-fg">{inquiry.listing.title}</span>
          <ExternalLink className="ml-auto size-4 text-muted" />
        </Link>
      )}
      {inquiry.message && (
        <blockquote className="rounded-btn border-l-4 border-yellow-500 bg-bg-2 p-3 text-sm whitespace-pre-line text-fg-2">
          {inquiry.message}
        </blockquote>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
          Status
          <Select
            value={inquiry.status}
            disabled={pending}
            onChange={(e) =>
              save({ status: e.target.value as InquiryRow["status"] })
            }
          >
            {INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LABEL[s]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
          Assigned broker
          <Select
            value={inquiry.brokerId ?? ""}
            disabled={pending}
            onChange={(e) => save({ assignedBrokerId: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
        Internal notes
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Called on Monday, viewing Thursday 3pm…"
        />
      </label>
      <div className="flex items-center justify-between">
        <Button
          size="sm"
          disabled={pending || notes === (inquiry.notes ?? "")}
          onClick={() => save({ notes })}
        >
          Save notes
        </Button>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="text-error"
            onClick={async () => {
              if (
                (
                  await confirm({
                    title: "Delete this inquiry?",
                    description: "This cannot be undone.",
                    confirmLabel: "Delete",
                    destructive: true,
                  })
                ).ok
              )
                run(() => deleteInquiryAction(inquiry.id), onDeleted);
            }}
          >
            <Trash2 /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}
