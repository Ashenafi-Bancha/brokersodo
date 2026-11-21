/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** Official BrokerSodo logo from the brand kit. Full colour on light, "on-navy" on dark. */
export function Logo({ className, priority }: { className?: string; priority?: boolean }) {
  // Lazy + display:none means the browser downloads only the variant for the active theme.
  const common = { width: 849, height: 162, decoding: "async" as const, loading: "lazy" as const };
  return (
    <span className={cn("inline-flex", className)}>
      <img
        src="/brand/logo/svg/logo-horizontal-full-colour.svg"
        alt="BrokerSodo"
        {...common}
        fetchPriority={priority ? "high" : undefined}
        className="h-full w-auto dark:hidden"
      />
      <img src="/brand/logo/svg/logo-horizontal-on-navy.svg" {...common} alt="" aria-hidden className="hidden h-full w-auto dark:block" />
    </span>
  );
}

export function LogoWhite({ className }: { className?: string }) {
  return <img src="/brand/logo/svg/logo-horizontal-white.svg" alt="BrokerSodo" width={849} height={162} className={cn("h-full w-auto", className)} />;
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
