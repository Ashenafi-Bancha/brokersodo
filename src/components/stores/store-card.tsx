import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Clock, MapPin, Star, Store as StoreIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { storeImage } from "@/lib/stores";
import { cn, localized } from "@/lib/utils";
import type { PublicStore } from "@/server/queries/stores";

export function StoreLogo({ logo, name, className }: { logo: unknown; name: string; className?: string }) {
  const img = storeImage(logo);
  return (
    <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-card bg-yellow-100 font-brand text-navy-900", className)}>
      {img ? <Image src={img.url} alt="" fill sizes="96px" className="object-cover" /> : <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

export function StoreCard({ store, className }: { store: PublicStore; className?: string }) {
  const t = useTranslations("stores");
  const locale = useLocale();
  const cover = storeImage(store.cover);
  const area = store.area ? localized(store.area, "name", locale) : null;
  return (
    <article
      data-reveal
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-pop focus-within:shadow-pop motion-reduce:hover:translate-y-0",
        store.featured && "outline-3 outline-yellow-500",
        className,
      )}
    >
      <div className="relative aspect-[16/7] bg-pattern">
        {cover ? (
          <Image src={cover.url} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" placeholder={cover.blurData ? "blur" : "empty"} blurDataURL={cover.blurData ?? undefined} className="object-cover" />
        ) : (
          <div className="grid size-full place-items-center bg-brand-gradient">
            <StoreIcon className="size-10 text-navy-900/70" aria-hidden />
          </div>
        )}
        {store.featured && (
          <Badge variant="featured" className="absolute top-3 left-3">
            <Star className="size-3 fill-current" aria-hidden /> {t("featured")}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="-mt-10 flex items-end gap-3">
          <StoreLogo logo={store.logo} name={store.name} className="size-16 border-4 border-surface text-2xl shadow-card" />
          <span className="mb-1 rounded-pill bg-bg-2 px-2.5 py-1 text-xs font-bold text-fg-2">{t(`type.${store.type}` as "type.SHOP")}</span>
        </div>
        <h3 className="text-lg font-bold text-fg">
          <Link prefetch={false} href={`/stores/${store.slug}`} className="after:absolute after:inset-0 hover:text-primary">
            {store.name}
          </Link>
        </h3>
        {store.tagline && <p className="line-clamp-2 text-sm text-fg-2">{store.tagline}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden /> {area ?? "Wolaita Sodo"}
          </span>
          {store.openingHours ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <Clock className="size-4 shrink-0" aria-hidden /> <span className="truncate">{store.openingHours}</span>
            </span>
          ) : (
            <span>{t("itemsCount", { count: store._count.items })}</span>
          )}
        </div>
      </div>
    </article>
  );
}
