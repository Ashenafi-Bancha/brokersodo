import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Brand kit badges (bs-badge--*). */
export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[12px] leading-none font-extrabold tracking-[0.02em] whitespace-nowrap",
  {
    variants: {
      variant: {
        sale: "bg-red-500 font-brand text-white uppercase",
        rent: "bg-blue-500 font-brand text-white uppercase",
        featured: "rounded-pill bg-yellow-500 text-navy-900",
        verified: "rounded-pill bg-navy-900 text-white dark:bg-white dark:text-navy-900",
        inspected: "rounded-pill bg-blue-50 text-blue-500 dark:bg-blue-800 dark:text-blue-100",
        negotiable: "rounded-pill border-2 border-current text-fg",
        reserved: "border-2 border-amber-500 bg-reserved-bg text-reserved",
        sold: "-rotate-3 bg-sold font-brand text-white uppercase",
        new: "rounded-pill bg-brand-gradient font-brand text-navy-900 uppercase",
        neutral: "rounded-pill bg-bg-2 text-fg-2",
        draft: "rounded-pill bg-navy-100 text-navy-600 dark:bg-navy-700 dark:text-navy-100",
        published: "rounded-pill bg-[#DCFCE7] text-sold dark:bg-sold/25 dark:text-[#86efac]",
        archived: "rounded-pill bg-navy-100 text-navy-400 dark:bg-navy-700 dark:text-navy-300",
        info: "rounded-pill bg-[#DBEAFE] text-info dark:bg-info/25 dark:text-[#93c5fd]",
        danger: "rounded-pill bg-red-50 text-error dark:bg-error/25 dark:text-red-200",
        warning: "rounded-pill bg-amber-50 text-reserved dark:bg-amber-900 dark:text-amber-200",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
