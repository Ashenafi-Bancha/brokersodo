import { useLocale, useTranslations } from "next-intl";
import { formatETB, rentSuffix } from "@/lib/format";
import { cn } from "@/lib/utils";

type PriceInput = {
  price: number | null;
  priceOnRequest: boolean;
  dealType: "SALE" | "RENT";
  rentPeriod: "DAY" | "MONTH" | "YEAR" | null;
  status?: string;
};

/** Brand kit .bs-price: Montserrat 900 italic, red (navy for rentals), struck-through grey when sold. */
export function Price({ listing, size = "md", className }: { listing: PriceInput; size?: "md" | "lg"; className?: string }) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const closed = listing.status === "SOLD" || listing.status === "RENTED";
  const sizeCls = size === "lg" ? "text-[32px] sm:text-[36px]" : "text-[22px]";
  if (listing.priceOnRequest || listing.price == null) {
    return <span className={cn("font-brand text-fg", size === "lg" ? "text-2xl" : "text-lg", className)}>{t("priceOnRequest")}</span>;
  }
  return (
    <span
      className={cn(
        "font-brand leading-tight tabular-nums",
        sizeCls,
        closed ? "text-navy-300 line-through" : listing.dealType === "RENT" ? "text-blue-500 dark:text-yellow-500" : "text-price",
        className,
      )}
    >
      {formatETB(listing.price)}
      {listing.dealType === "RENT" && (
        <small className="ml-1 font-sans text-sm font-semibold text-muted not-italic">{rentSuffix(listing.rentPeriod, locale)}</small>
      )}
    </span>
  );
}
