"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Phone,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { WhatsAppIcon } from "@/components/layout/icons";
import { DataTable, ColumnSelectFilter, type ColumnDef } from "./data-table";
import { StatusBadge } from "./status-badge";
import { useConfirm, useRunAction } from "./confirm";
import { RowActions } from "./row-actions";
import {
  deleteSubmissionAction,
  rejectSubmissionAction,
  reopenSubmissionAction,
  saveSubmissionNotesAction,
} from "@/server/actions/admin-inbox";
import { formatETB, formatPhoneDisplay, relativeTime } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/contact";

export type SubmissionRow = {
  id: string;
  title: string;
  name: string;
  phone: string;
  category: string;
  dealType: string;
  price: number | null;
  area: string;
  photos: number;
  status: string;
  createdAt: string;
  thumb: string | null;
};

export function SubmissionsTable({
  rows,
  isAdmin,
}: {
  rows: SubmissionRow[];
  isAdmin: boolean;
}) {
  const columns = React.useMemo<ColumnDef<SubmissionRow, unknown>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Submission",
        enableHiding: false,
        cell: ({ row: { original: r } }) => (
          <Link
            href={`/admin/submissions/${r.id}`}
            className="group flex items-center gap-3"
          >
            <span className="size-12 shrink-0 overflow-hidden rounded-sm bg-line">
              {r.thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.thumb}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              )}
            </span>
            <span className="min-w-0">
              <span className="line-clamp-1 font-semibold text-fg group-hover:underline">
                {r.title}
              </span>
              <span className="text-xs text-muted">
                {r.name} · {r.photos} photo{r.photos === 1 ? "" : "s"}
              </span>
            </span>
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, v) => !v || row.getValue(id) === v,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      { accessorKey: "category", header: "Category" },
      {
        accessorKey: "dealType",
        header: "Deal",
        cell: ({ getValue }) => (getValue() === "RENT" ? "Rent" : "Sale"),
      },
      {
        accessorKey: "price",
        header: "Expected",
        cell: ({ getValue }) =>
          getValue() == null ? (
            "—"
          ) : (
            <span className="whitespace-nowrap tabular-nums">
              {formatETB(Number(getValue()))}
            </span>
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
            label={r.title}
            editHref={`/admin/submissions/${r.id}`}
            onDelete={isAdmin ? () => deleteSubmissionAction(r.id) : undefined}
            deleteText="This permanently removes the submission and its photos. It cannot be undone."
          />
        ),
      },
    ],
    [isAdmin],
  );
  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      storageKey="submissions"
      searchPlaceholder="Search title, name, phone…"
      emptyText="No submissions yet."
      toolbar={(t) => (
        <ColumnSelectFilter
          table={t}
          column="status"
          label="Status"
          options={["PENDING", "APPROVED", "REJECTED"].map((s) => ({
            value: s,
            label: s.charAt(0) + s.slice(1).toLowerCase(),
          }))}
        />
      )}
    />
  );
}

export function SubmissionActions({
  id,
  title,
  status,
  name,
  phone,
  notes,
  linkedListingId,
  isAdmin,
}: {
  id: string;
  title: string;
  status: string;
  name: string;
  phone: string;
  notes: string | null;
  linkedListingId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [n, setN] = React.useState(notes ?? "");
  return (
    <div className="space-y-5">
      <div className="grid gap-2">
        {status === "PENDING" && (
          <Button asChild block>
            <Link href={`/admin/listings/new?fromSubmission=${id}`}>
              <ArrowRightLeft /> Convert to listing
            </Link>
          </Button>
        )}
        {status === "APPROVED" && linkedListingId && (
          <Button asChild variant="secondary" block>
            <Link href={`/admin/listings/${linkedListingId}`}>
              Open linked listing
            </Link>
          </Button>
        )}
        {status === "PENDING" ? (
          <Button
            variant="outline"
            className="border-line text-error"
            block
            disabled={pending}
            onClick={async () => {
              const r = await confirm({
                title: "Reject this submission?",
                confirmLabel: "Reject",
                destructive: true,
                input: {
                  type: "textarea",
                  label: "Reason (internal)",
                  required: true,
                },
              });
              if (r.ok)
                run(
                  () => rejectSubmissionAction({ id, reason: r.value }),
                  () => router.refresh(),
                );
            }}
          >
            <XCircle /> Reject
          </Button>
        ) : (
          status === "REJECTED" && (
            <Button
              variant="outline"
              className="border-line"
              block
              disabled={pending}
              onClick={() =>
                run(
                  () => reopenSubmissionAction(id),
                  () => router.refresh(),
                )
              }
            >
              <RotateCcw /> Reopen
            </Button>
          )
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="call" size="sm">
          <a href={telLink(phone)}>
            <Phone /> Call
          </a>
        </Button>
        <Button asChild variant="whatsapp" size="sm">
          <a
            href={whatsappLink(
              phone,
              `Hello ${name}, this is BrokerSodo about the property you submitted.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon /> WhatsApp
          </a>
        </Button>
      </div>
      <p className="text-center text-sm font-semibold text-fg">
        {formatPhoneDisplay(phone)}
      </p>
      <label className="flex flex-col gap-1 text-sm font-semibold text-fg">
        Staff notes
        <Textarea
          rows={4}
          value={n}
          onChange={(e) => setN(e.target.value)}
          placeholder="Verification notes, documents checked…"
        />
      </label>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || n === (notes ?? "")}
        onClick={() =>
          run(
            () => saveSubmissionNotesAction(id, n),
            () => router.refresh(),
          )
        }
      >
        Save notes
      </Button>
      {isAdmin && (
        <Button
          variant="outline"
          className="border-error/40 text-error hover:bg-red-50 dark:hover:bg-error/20"
          block
          disabled={pending}
          onClick={async () => {
            const r = await confirm({
              title: `Delete “${title}”?`,
              description:
                "This permanently removes the submission and its photos. It cannot be undone.",
              confirmLabel: "Delete",
              destructive: true,
            });
            if (r.ok)
              run(
                () => deleteSubmissionAction(id),
                () => router.push("/admin/submissions"),
              );
          }}
        >
          <Trash2 /> Delete submission
        </Button>
      )}
    </div>
  );
}
