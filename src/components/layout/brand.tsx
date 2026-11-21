/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** Official BrokerSodo logo. It has a white background, so dark mode shows it on a white plate. */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("inline-flex", className)}>
      <img
        src="/brand/logo-horizontal.webp"
        alt="BrokerSodo"
        width={720}
        height={190}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className="h-full w-auto dark:rounded-sm dark:bg-white dark:p-0.5"
      />
    </span>
  );
}

export const CATEGORY_ICONS = [
  "car",
  "motorbike",
  "bajaj",
  "house",
  "rentals",
  "land",
  "machinery",
  "electronics",
  "printer",
  "other",
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICONS)[number];

/** Brand kit category icon: navy in light mode, white in dark mode (or forced). */
export function CategoryIcon({
  icon,
  className,
  tone = "auto",
}: {
  icon: string;
  className?: string;
  tone?: "auto" | "navy" | "white";
}) {
  const key = (CATEGORY_ICONS as readonly string[]).includes(icon) ? icon : "other";
  const navy = `/brand/icons/svg/ic-${key}-navy.svg`;
  const white = `/brand/icons/svg/ic-${key}-white.svg`;
  if (tone === "navy") return <img src={navy} alt="" width={96} height={96} className={className} />;
  if (tone === "white") return <img src={white} alt="" width={96} height={96} className={className} />;
  return (
    <span className={cn("relative inline-block", className)}>
      <img src={navy} alt="" width={96} height={96} loading="lazy" decoding="async" className="size-full dark:hidden" />
      <img src={white} alt="" width={96} height={96} loading="lazy" decoding="async" className="hidden size-full dark:block" />
    </span>
  );
}
