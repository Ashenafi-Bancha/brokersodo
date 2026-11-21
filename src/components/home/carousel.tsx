"use client";
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lightweight scroll-snap carousel (no library): swipe on mobile, arrows on desktop. */
export function Carousel({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  const ref = React.useRef<HTMLUListElement>(null);
  const [edge, setEdge] = React.useState({ start: true, end: false });
  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);
  React.useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  const btn =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-surface text-fg shadow-pop transition-opacity hover:bg-bg-2 disabled:pointer-events-none disabled:opacity-0 md:grid";
  return (
    <div className={cn("relative", className)} role="region" aria-roledescription="carousel" aria-label={label}>
      <button type="button" className={cn(btn, "-left-4")} onClick={() => scroll(-1)} disabled={edge.start} aria-label="Previous">
        <ChevronLeft className="size-5" />
      </button>
      <ul
        ref={ref}
        className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pt-1 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        {React.Children.map(children, (child) => (
          <li className="flex w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[calc(25%-12px)]">{child}</li>
        ))}
      </ul>
      <button type="button" className={cn(btn, "-right-4")} onClick={() => scroll(1)} disabled={edge.end} aria-label="Next">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
