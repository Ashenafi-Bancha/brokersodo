import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, ShieldCheck, Star, Search as SearchIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ListingStatusBadge } from "./status-badge";
import { CategoryIcon } from "@/components/layout/brand";
import { FavoriteButton } from "./favorite-button";
import { Price } from "./price";
import { relativeTime } from "@/lib/format";
import { isStoredVariant } from "@/lib/image";
import { cn, localized } from "@/lib/utils";
import { formatAttributeValue, parseAttributeSchema } from "@/lib/validators/attribute-schema";
import type { PublicListingCard } from "@/server/queries/selects";

/**
 * Listing card (brand kit .bs-card). Works as a server or client component.
 * SOLD / RENTED / RESERVED listings show a ribbon and are muted.
 */
export function ListingCard({
  listing,
  layout = "grid",
  priority,
  className,
}: {
  listing: PublicListingCard;
  layout?: "grid" | "list";
  priority?: boolean;
  className?: string;
}) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const title = localized(listing, "title", locale);
  const cover = listing.images[0];
  const closed = listing.status === "SOLD" || listing.status === "RENTED";
  const reserved = listing.status === "RESERVED";
  const featuredActive = listing.featured && (!listing.featuredUntil || new Date(listing.featuredUntil) > new Date());
  const fields = parseAttributeSchema(listing.category.attributeSchema).filter((f) => f.showOnCard);
  const attrs = (listing.attributes ?? {}) as Record<string, unknown>;
  const keyAttrs = fields
    .map((f) => formatAttributeValue(f, attrs[f.key], locale))
    .filter(Boolean)
    .slice(0, 3);
  const areaName = listing.area ? localized(listing.area, "name", locale) : null;
  const src = cover?.url ?? null;

  return (
    <article
      data-reveal
      className={cn(
        "group relative flex overflow-hidden rounded-card bg-surface shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-pop focus-within:shadow-pop motion-reduce:hover:translate-y-0",
        layout === "grid" ? "flex-col" : "flex-row",
        featuredActive && !closed && "outline-3 outline-yellow-500",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-line",
          layout === "grid" ? "aspect-[4/3] w-full" : "aspect-[4/3] w-36 sm:w-64",
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={cover?.alt || title}
            fill
            sizes={layout === "grid" ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" : "256px"}
            placeholder={cover?.blurData ? "blur" : "empty"}
            blurDataURL={cover?.blurData ?? undefined}
            priority={priority}
            className={cn("object-cover transition-transform duration-500 group-hover:scale-[1.04]", (closed || reserved) && "saturate-50")}
          />
        ) : (
          <div className="grid size-full place-items-center bg-pattern">
            <CategoryIcon icon={listing.category.icon} className="size-16 opacity-60" />
          </div>
        )}
        {src && !isStoredVariant(src) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/logo-horizontal.webp" loading="lazy" alt="" aria-hidden className="pointer-events-none absolute right-2.5 bottom-2.5 w-[22%] rounded-[4px] bg-white/90 p-0.5" />
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {featuredActive && !closed ? (
            <Badge variant="featured">
              <Star className="size-3 fill-current" /> {t("featured")}
            </Badge>
          ) : (
            <Badge variant={listing.dealType === "RENT" ? "rent" : "sale"}>{listing.dealType === "RENT" ? t("rent") : t("sale")}</Badge>
          )}
          {(reserved || listing.status === "UNDER_NEGOTIATION") && <ListingStatusBadge status={listing.status} />}
        </div>
        {!closed && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <FavoriteButton id={listing.id} />
          </div>
        )}
        {closed && (
          <div className="absolute inset-0 grid place-items-center bg-navy-900/55">
            <span className="-rotate-6 font-brand text-[28px] text-white drop-shadow">
              {listing.status === "RENTED" ? t("rented") : t("sold")}
            </span>
          </div>
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5 p-4", layout === "list" && "sm:p-5")}>
        <Price listing={listing} />
        <h3 className="line-clamp-2 font-bold text-fg">
          <Link href={`/listings/${listing.slug}`} prefetch={false} className="after:absolute after:inset-0 focus-visible:outline-none">
            {title}
          </Link>
        </h3>
        {keyAttrs.length > 0 && <p className="truncate text-[13px] font-medium text-fg-2">{keyAttrs.join(" · ")}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {listing.status === "PUBLISHED" && <ListingStatusBadge status="PUBLISHED" />}
          {listing.isNegotiable && !closed && <Badge variant="negotiable">{t("negotiable")}</Badge>}
          {listing.isVerified && (
            <Badge variant="verified">
              <ShieldCheck className="size-3" /> {t("verified")}
            </Badge>
          )}
          {listing.isInspected && (
            <Badge variant="inspected">
              <SearchIcon className="size-3" /> {t("inspected")}
            </Badge>
          )}
        </div>
        <p className="flex items-center justify-between gap-2 text-[13px] text-muted">
          <span className="flex min-w-0 items-center gap-1 truncate">
            {areaName && (
              <>
                <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{areaName}</span>
              </>
            )}
          </span>
          <span className="shrink-0 font-mono text-[11px] tracking-tight">{listing.refCode}</span>
        </p>
        {listing.publishedAt && (
          <p className="text-[12px] text-muted" suppressHydrationWarning>
            {relativeTime(listing.publishedAt, locale)}
          </p>
        )}
      </div>
    </article>
  );
}

export function ListingGrid({ listings, layout = "grid", priorityCount = 0 }: { listings: PublicListingCard[]; layout?: "grid" | "list"; priorityCount?: number }) {
  return (
    <ul className={cn(layout === "grid" ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "flex flex-col gap-4")}>
      {listings.map((l, i) => (
        <li key={l.id} className="flex">
          <ListingCard listing={l} layout={layout} priority={i < priorityCount} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="aspect-[4/3] animate-pulse bg-line" />
      <div className="space-y-2 p-4">
        <div className="h-6 w-1/2 animate-pulse rounded bg-line" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-line" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
      </div>
    </div>
  );
}
