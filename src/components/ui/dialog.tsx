"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-[2px]",
        className,
      )}
    />
  );
}

export function DialogContent({
  className,
  children,
  title,
  description,
  hideClose,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  hideClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-surface p-6 shadow-pop focus:outline-none",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="pr-8 text-xl font-bold text-fg">{title}</DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : ""}</DialogPrimitive.Description>
        )}
        <div className="mt-4">{children}</div>
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-muted hover:bg-bg-2 hover:text-fg"
            aria-label="Close"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Bottom sheet on mobile, side drawer on desktop. */
export function SheetContent({
  className,
  children,
  title,
  side = "bottom",
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> & {
  title: React.ReactNode;
  side?: "bottom" | "left" | "right";
}) {
  const sideCls =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[24px] pb-safe"
      : side === "left"
        ? "inset-y-0 left-0 h-dvh w-[86vw] max-w-sm"
        : "inset-y-0 right-0 h-dvh w-[86vw] max-w-sm";
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn("fixed z-50 flex flex-col bg-surface shadow-pop focus:outline-none", sideCls, className)}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          {side === "bottom" && <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-line-strong" />}
          <DialogPrimitive.Title className="text-lg font-bold text-fg">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : ""}</DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="grid size-10 place-items-center rounded-full text-muted hover:bg-bg-2 hover:text-fg"
            aria-label="Close"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
