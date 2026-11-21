"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Opt = { slug: string; name: string };

/** Smart search: keyword + category + Buy/Rent toggle + area, on a glass panel. */
export function HeroSearch({ categories, areas }: { categories: Opt[]; areas: Opt[] }) {
  const t = useTranslations("hero");
  const router = useRouter();
  const [deal, setDeal] = React.useState<"sale" | "rent">("sale");
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("");
  const [area, setArea] = React.useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    qs.set("deal", deal);
    if (area) qs.set("area", area);
    const base = cat ? `/c/${cat}` : "/listings";
    router.push(`${base}?${qs.toString()}`);
  };

  const selectCls =
    "min-h-12 w-full cursor-pointer appearance-none rounded-btn border-[1.5px] border-line-strong bg-white px-3.5 text-[15px] font-medium text-navy-900 outline-none focus-visible:ring-3 focus-visible:ring-yellow-500";

  return (
    <form
      onSubmit={submit}
      role="search"
      className="w-full rounded-card border border-line bg-surface p-3 shadow-card sm:p-4"
    >
      <div className="mb-3 inline-flex gap-1 rounded-pill bg-navy-100 p-1" role="group" aria-label={`${t("buy")} / ${t("rent")}`}>
        {(["sale", "rent"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={deal === d}
            onClick={() => setDeal(d)}
            className={cn(
              "min-h-10 cursor-pointer rounded-pill px-6 text-[15px] font-bold transition-colors",
              deal === d ? "bg-red-500 text-white" : "text-navy-700 hover:bg-white",
            )}
          >
            {d === "sale" ? t("buy") : t("rent")}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="relative block sm:col-span-3">
          <span className="sr-only">{t("keyword")}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-navy-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("keywordPlaceholder")}
            className="min-h-12 w-full rounded-btn border-[1.5px] border-line-strong bg-white pr-3 pl-11 text-[15px] text-navy-900 outline-none placeholder:text-navy-400 focus-visible:ring-3 focus-visible:ring-yellow-500"
          />
        </label>
        <label>
          <span className="sr-only">{t("category")}</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={selectCls}>
            <option value="">{t("anyCategory")}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{t("area")}</span>
          <select value={area} onChange={(e) => setArea(e.target.value)} className={selectCls}>
            <option value="">{t("anyArea")}</option>
            {areas.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="primary" className="bg-red-500 text-white hover:bg-red-600">
          <Search /> {t("search")}
        </Button>
      </div>
    </form>
  );
}
