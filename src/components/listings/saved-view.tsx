"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Heart, History } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ListingCard, ListingCardSkeleton } from "./listing-card";
import { clearStored, useStoredIds } from "@/lib/favorites";
import { getSavedListingsAction } from "@/server/actions/saved";
import type { PublicListingCard } from "@/server/queries/selects";

function useListings(ids: string[]) {
  const [data, setData] = React.useState<PublicListingCard[] | null>(null);
  const key = ids.join(",");
  React.useEffect(() => {
    let alive = true;
    if (!key) {
      setData([]);
      return;
    }
    getSavedListingsAction(key.split(","))
      .then((r) => alive && setData(r))
      .catch(() => alive && setData([]));
    return () => {
      alive = false;
    };
  }, [key]);
  return data;
}

export function SavedView() {
  const t = useTranslations("saved");
  const savedIds = useStoredIds("saved");
  const recentIds = useStoredIds("recent");
  const saved = useListings(savedIds);
  const recent = useListings(recentIds.filter((id) => !savedIds.includes(id)).slice(0, 8));

  return (
    <div className="space-y-14">
      <section>
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-fg">
          <Heart className="size-5 text-red-500" /> {t("title")} {savedIds.length > 0 && <span className="text-muted">({savedIds.length})</span>}
        </h2>
        {saved === null ? (
          <Grid>{Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}</Grid>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center rounded-card bg-surface px-6 py-14 text-center shadow-card">
            <Heart className="size-12 text-line-strong" aria-hidden />
            <p className="mt-4 font-semibold text-fg">{t("empty")}</p>
            <Button asChild className="mt-5">
              <Link href="/listings">{t("emptyCta")}</Link>
            </Button>
          </div>
        ) : (
          <Grid>
            {saved.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </Grid>
        )}
      </section>

      {recent && recent.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-fg">
              <History className="size-5 text-muted" /> {t("recentlyViewed")}
            </h2>
            <Button variant="link" onClick={() => clearStored("recent")}>
              {t("clear")}
            </Button>
          </div>
          <Grid>
            {recent.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </Grid>
        </section>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
