import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card bg-surface shadow-card", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-sm bg-line before:absolute before:inset-0 before:-translate-x-full before:animate-[bs-shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent dark:before:via-white/5",
        className,
      )}
      {...props}
    />
  );
}

/** Brand cart loader. */
export function BrandLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-label={label} className={cn("inline-block", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-cart.webp" alt="" width={512} height={525} className="h-12 w-auto animate-look dark:rounded-sm dark:bg-white dark:p-0.5" />
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
  as: As = "h2",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div data-reveal className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <As className="font-brand text-h3 text-fg sm:text-h2">{title}</As>
        {subtitle ? <p className="mt-1.5 text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Brand gradient "swoosh" bar. */
export function SwooshBar({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-2 bg-brand-gradient", className)} />;
}

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}
