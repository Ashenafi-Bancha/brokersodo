"use client";
import * as React from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleSaved, useStoredIds } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export function FavoriteButton({ id, className, withLabel }: { id: string; className?: string; withLabel?: boolean }) {
  const t = useTranslations("listing");
  const saved = useStoredIds("saved").includes(id);
  const [pop, setPop] = React.useState(false);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={withLabel ? undefined : saved ? t("removeFromSaved") : t("addToSaved")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (toggleSaved(id)) {
          setPop(true);
          setTimeout(() => setPop(false), 360);
        }
      }}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 transition-colors",
        withLabel
          ? "min-h-12 rounded-btn border-2 border-line-strong px-4 font-bold text-fg hover:border-primary"
          : "size-10 rounded-full bg-white/90 text-navy-900 shadow-card backdrop-blur hover:bg-white",
        className,
      )}
    >
      <Heart className={cn("size-5", saved && "fill-red-500 text-red-500", pop && "animate-pop")} />
      {withLabel && <span>{saved ? t("saved") : t("save")}</span>}
    </button>
  );
}
