"use client";
import * as React from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import type { GalleryImage } from "./gallery";
import { cn } from "@/lib/utils";

/** Fullscreen viewer; loaded the first time a photo is opened. */
export function Lightbox({
  open,
  onOpenChange,
  images,
  index,
  setIndex,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  images: GalleryImage[];
  index: number;
  setIndex: (i: number) => void;
  title: string;
}) {
  const t = useTranslations("listing");
  const [zoom, setZoom] = React.useState(false);
  const touch = React.useRef<number | null>(null);
  const img = images[index];
  const step = React.useCallback((d: number) => {
    setZoom(false);
    setIndex((index + d + images.length) % images.length);
  }, [index, images.length, setIndex]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setZoom(false); onOpenChange(o); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/95" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col focus:outline-none">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{t("gallery")}</Dialog.Description>
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm font-bold">
              {index + 1} / {images.length}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setZoom((z) => !z)} aria-label={zoom ? "Zoom out" : "Zoom in"} className="grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 hover:bg-white/20">
                {zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
              </button>
              <Dialog.Close aria-label={t("closeGallery")} className="grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <X className="size-5" />
              </Dialog.Close>
            </div>
          </div>
          <div
            className={cn("relative flex-1", zoom ? "overflow-auto" : "overflow-hidden")}
            style={{ touchAction: zoom ? "auto" : "pinch-zoom pan-y" }}
            onTouchStart={(e) => (touch.current = e.touches.length === 1 ? e.touches[0].clientX : null)}
            onTouchEnd={(e) => {
              if (zoom || touch.current == null) return;
              const dx = e.changedTouches[0].clientX - touch.current;
              if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
              touch.current = null;
            }}
          >
            {img && (
              <div className={cn("relative", zoom ? "h-[200%] w-[200%]" : "size-full")} onDoubleClick={() => setZoom((z) => !z)}>
                <Image src={img.url} alt={img.alt || title} fill sizes={zoom ? "200vw" : "100vw"} className="object-contain" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-3 p-4">
              <button type="button" onClick={() => step(-1)} aria-label={t("prevPhoto")} className="grid size-12 cursor-pointer place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" onClick={() => step(1)} aria-label={t("nextPhoto")} className="grid size-12 cursor-pointer place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronRight className="size-6" />
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
