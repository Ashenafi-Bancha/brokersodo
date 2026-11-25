"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm, useRunAction } from "./confirm";

type Result = { ok: boolean; error?: string; message?: string };

/**
 * Edit (pencil) and Delete (trash) icon buttons for one row of an admin list.
 * Delete always asks first; the server still checks the user's role.
 */
export function RowActions({
  label,
  editHref,
  onEdit,
  onDelete,
  deleteTitle,
  deleteText = "This permanently removes it. It cannot be undone.",
  onDeleted,
}: {
  /** Short name of the record, used in tooltips and the confirm box, e.g. "TEST Contact". */
  label: string;
  editHref?: string;
  onEdit?: () => void;
  /** Leave out to hide the delete button (for example for brokers). */
  onDelete?: () => Promise<Result>;
  deleteTitle?: string;
  deleteText?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const editClass = "text-fg-2 hover:bg-bg-2 hover:text-primary";
  return (
    <div className="flex items-center justify-end gap-0.5">
      {editHref ? (
        <Button asChild variant="ghost" size="icon-xs" className={editClass} title={`Edit ${label}`}>
          <Link href={editHref} aria-label={`Edit ${label}`}>
            <Pencil />
          </Link>
        </Button>
      ) : onEdit ? (
        <Button variant="ghost" size="icon-xs" className={editClass} onClick={onEdit} aria-label={`Edit ${label}`} title={`Edit ${label}`}>
          <Pencil />
        </Button>
      ) : null}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-error hover:bg-red-50 dark:hover:bg-error/20"
          disabled={pending}
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
          onClick={async () => {
            const r = await confirm({ title: deleteTitle ?? `Delete ${label}?`, description: deleteText, confirmLabel: "Delete", destructive: true });
            if (r.ok) run(onDelete, () => (onDeleted ? onDeleted() : router.refresh()));
          }}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
