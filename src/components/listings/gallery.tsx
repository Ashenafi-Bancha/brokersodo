"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryImage = { id: string; url: string; width: number; height: number; alt: string | null; blurData: string | null; watermark: boolean };

const Lightbox = dynamic(() => import("./gallery-lightbox").then((m) => m.Lightbox), { ssr: false });

/** Swipeable gallery with thumbnails + fullscreen lightbox (pinch / tap to zoom). */
export function Gallery({ images, title, muted }: { images: GalleryImage[]; title: string; muted?: boolean }) {
  const t = useTranslations("listing");
  const [index, setIndex] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [lightboxLoaded, setLightboxLoaded] = React.useState(false);
  const track = React.useRef<HTMLDivElement>(null);

  const goTo = (i: number, smooth = true) => {
    const n = (i + images.length) % images.length;
    setIndex(n);
    const el = track.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };

  React.useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (images.length === 0) {
    return <div className="grid aspect-[4/3] place-items-center rounded-card bg-bg-2 bg-pattern text-muted">{t("noPhoto")}</div>;
  }

  return (
    <div className="flex flex-col gap-3" aria-roledescription="carousel" aria-label={t("gallery")}>
      <div className="relative overflow-hidden rounded-card bg-navy-900 shadow-card">
        <div ref={track} className="scrollbar-none flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setLightboxLoaded(true);
                setOpen(true);
              }}
              aria-label={t("openGallery", { n: i + 1, total: images.length })}
              className="relative size-full shrink-0 cursor-zoom-in snap-center"
            >
              <Image
                src={img.url}
                alt={img.alt || `${title} — ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 60vw"
                placeholder={img.blurData ? "blur" : "empty"}
                blurDataURL={img.blurData ?? undefined}
                className={cn("object-cover", muted && "saturate-50")}
              />
              {img.watermark && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brand/logo/svg/logo-horizontal-white.svg" alt="" aria-hidden className="pointer-events-none absolute right-3 bottom-3 w-[20%] opacity-80 drop-shadow" />
              )}
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => goTo(index - 1)} aria-label={t("prevPhoto")} className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/90 text-navy-900 shadow-pop sm:grid">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label={t("nextPhoto")} className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/90 text-navy-900 shadow-pop sm:grid">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-navy-900/75 px-3 py-1 text-xs font-bold text-white" aria-live="polite">
          <Expand className="size-3.5" /> {index + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t("openGallery", { n: i + 1, total: images.length })}
              aria-current={i === index}
              className={cn(
                "relative aspect-[4/3] w-20 shrink-0 cursor-pointer overflow-hidden rounded-sm ring-offset-2 ring-offset-bg transition sm:w-24",
                i === index ? "ring-3 ring-yellow-500" : "opacity-70 hover:opacity-100",
              )}
            >
              <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightboxLoaded && <Lightbox open={open} onOpenChange={setOpen} images={images} index={index} setIndex={(i) => goTo(i, false)} title={title} />}
    </div>
  );
}
