"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Archive,
  BookmarkCheck,
  Copy,
  Eye,
  FileEdit,
  MoreHorizontal,
  Send,
  Trash2,
  CheckCircle2,
  KeyRound,
  Undo2, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm, useRunAction } from "./confirm";
import {
  changeListingStatusAction,
  deleteListingAction,
  duplicateListingAction,
} from "@/server/actions/admin-listings";

type Mini = {
  id: string;
  refCode: string;
  status: string;
  dealType: "SALE" | "RENT";
};

/** Shared quick-status logic (row menu + edit page toolbar). */
export function useListingStatusActions() {
  const confirm = useConfirm();
  const router = useRouter();
  const { run, pending } = useRunAction();
  const today = new Date().toISOString().slice(0, 10);

  const setStatus = async (
    l: Mini,
    action: "publish" | "negotiating" | "reserve" | "sold" | "rented" | "archive" | "draft",
  ) => {
    let date: string | undefined;
    if (action === "sold" || action === "rented") {
      const r = await confirm({
        title: `Mark ${l.refCode} as ${action}?`,
        description:
          "It stays visible with a ribbon and appears in “Recently sold”.",
        confirmLabel: `Mark ${action}`,
        input: {
          type: "date",
          label: action === "sold" ? "Date sold" : "Date rented",
          defaultValue: today,
          required: true,
        },
      });
      if (!r.ok) return;
      date = r.value;
    } else if (action === "archive") {
      const r = await confirm({
        title: `Archive ${l.refCode}?`,
        description: "It will be removed from the public site.",
        confirmLabel: "Archive",
      });
      if (!r.ok) return;
    }
    run(
      () => changeListingStatusAction({ ids: [l.id], action, date }),
      () => router.refresh(),
    );
  };
  const duplicate = (l: Mini) =>
    run(
      () => duplicateListingAction(l.id),
      (d) => d && router.push(`/admin/listings/${d.id}`),
    );
  const remove = async (l: Mini, after?: () => void) => {
    const r = await confirm({
      title: `Delete ${l.refCode} permanently?`,
      description: "This cannot be undone. Consider archiving instead.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (r.ok)
      run(
        () => deleteListingAction(l.id),
        () => (after ? after() : router.refresh()),
      );
  };
  return { setStatus, duplicate, remove, pending };
}

export function ListingRowMenu({
  listing,
  isAdmin,
}: {
  listing: Mini;
  isAdmin: boolean;
}) {
  const { setStatus, duplicate, remove, pending } = useListingStatusActions();
  const item =
    "flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-bg-2";
  const closed = listing.status === "SOLD" || listing.status === "RENTED";
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        asChild
        variant="subtle"
        size="xs"
        title={`Edit ${listing.refCode}`}
      >
        <Link
          href={`/admin/listings/${listing.id}`}
          aria-label={`Edit ${listing.refCode}`}
        >
          <FileEdit /> <span className="hidden sm:inline">Edit</span>
        </Link>
      </Button>
      {isAdmin && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-error hover:bg-red-50 dark:hover:bg-error/20"
          disabled={pending}
          onClick={() => remove(listing)}
          aria-label={`Delete ${listing.refCode}`}
          title={`Delete ${listing.refCode}`}
        >
          <Trash2 />
        </Button>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Actions for ${listing.refCode}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-48 rounded-btn bg-surface p-1 shadow-pop"
          >
            <DropdownMenu.Item asChild className={item}>
              <Link href={`/admin/listings/${listing.id}`}>
                <FileEdit className="size-4" /> Edit
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild className={item}>
              <Link
                href={`/admin/listings/${listing.id}/preview`}
                target="_blank"
              >
                <Eye className="size-4" /> Preview
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            {listing.status !== "PUBLISHED" && (
              <DropdownMenu.Item
                className={item}
                onSelect={() => setStatus(listing, "publish")}
              >
                <Send className="size-4" /> {closed ? "Re-publish" : "Publish"}
              </DropdownMenu.Item>
            )}
            {(listing.status === "PUBLISHED" || listing.status === "RESERVED") && (
              <DropdownMenu.Item
                className={item}
                onSelect={() => setStatus(listing, "negotiating")}
              >
                <Handshake className="size-4" /> Under negotiation
              </DropdownMenu.Item>
            )}
            {(listing.status === "PUBLISHED" || listing.status === "UNDER_NEGOTIATION") && (
              <DropdownMenu.Item
                className={item}
                onSelect={() => setStatus(listing, "reserve")}
              >
                <BookmarkCheck className="size-4" /> Reserve
              </DropdownMenu.Item>
            )}
            {!closed && (
              <DropdownMenu.Item
                className={item}
                onSelect={() =>
                  setStatus(
                    listing,
                    listing.dealType === "RENT" ? "rented" : "sold",
                  )
                }
              >
                {listing.dealType === "RENT" ? (
                  <KeyRound className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}{" "}
                Mark {listing.dealType === "RENT" ? "rented" : "sold"}
              </DropdownMenu.Item>
            )}
            {listing.status !== "DRAFT" && (
              <DropdownMenu.Item
                className={item}
                onSelect={() => setStatus(listing, "draft")}
              >
                <Undo2 className="size-4" /> Back to draft
              </DropdownMenu.Item>
            )}
            {listing.status !== "ARCHIVED" && (
              <DropdownMenu.Item
                className={item}
                onSelect={() => setStatus(listing, "archive")}
              >
                <Archive className="size-4" /> Archive
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item
              className={item}
              onSelect={() => duplicate(listing)}
            >
              <Copy className="size-4" /> Duplicate
            </DropdownMenu.Item>
            {isAdmin && (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item
                  className={`${item} text-error`}
                  onSelect={() => remove(listing)}
                >
                  <Trash2 className="size-4" /> Delete
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/** Toolbar on the edit page. */
export function ListingQuickActions({
  listing,
  isAdmin,
}: {
  listing: Mini;
  isAdmin: boolean;
}) {
  const { setStatus, duplicate, remove, pending } = useListingStatusActions();
  const router = useRouter();
  const closed = listing.status === "SOLD" || listing.status === "RENTED";
  return (
    <div className="flex flex-wrap gap-2">
      {listing.status !== "PUBLISHED" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setStatus(listing, "publish")}
        >
          <Send /> Publish
        </Button>
      )}
      {(listing.status === "PUBLISHED" || listing.status === "RESERVED") && (
        <Button
          size="sm"
          variant="outline"
          className="border-line"
          disabled={pending}
          onClick={() => setStatus(listing, "negotiating")}
        >
          <Handshake /> Under negotiation
        </Button>
      )}
      {(listing.status === "PUBLISHED" || listing.status === "UNDER_NEGOTIATION") && (
        <Button
          size="sm"
          variant="outline"
          className="border-line"
          disabled={pending}
          onClick={() => setStatus(listing, "reserve")}
        >
          <BookmarkCheck /> Reserve
        </Button>
      )}
      {!closed && (
        <Button
          size="sm"
          variant="outline"
          className="border-line"
          disabled={pending}
          onClick={() =>
            setStatus(listing, listing.dealType === "RENT" ? "rented" : "sold")
          }
        >
          <CheckCircle2 /> Mark{" "}
          {listing.dealType === "RENT" ? "rented" : "sold"}
        </Button>
      )}
      {listing.status !== "ARCHIVED" && (
        <Button
          size="sm"
          variant="outline"
          className="border-line"
          disabled={pending}
          onClick={() => setStatus(listing, "archive")}
        >
          <Archive /> Archive
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="border-line"
        disabled={pending}
        onClick={() => duplicate(listing)}
      >
        <Copy /> Duplicate
      </Button>
      {isAdmin && (
        <Button
          size="sm"
          variant="outline"
          className="border-error/40 text-error hover:bg-red-50 dark:hover:bg-error/20"
          disabled={pending}
          onClick={() => remove(listing, () => router.push("/admin/listings"))}
        >
          <Trash2 /> Delete
        </Button>
      )}
    </div>
  );
}
