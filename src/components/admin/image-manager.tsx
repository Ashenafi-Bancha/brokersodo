"use client";
import * as React from "react";
import imageCompression from "browser-image-compression";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadListingImageAction } from "@/server/actions/admin-listings";
import type { ListingImageInput } from "@/lib/validators/admin";
import { cn } from "@/lib/utils";

export type ManagedImage = ListingImageInput & { key: string };

/** Drag-and-drop multi-upload with reorder, choose cover, alt text and delete. */
export function ImageManager({ images, onChange, max = 30 }: { images: ManagedImage[]; onChange: (imgs: ManagedImage[]) => void; max?: number }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const latest = React.useRef(images);
  latest.current = images;

  const upload = async (files: File[]) => {
    const list = files.filter((f) => f.type.startsWith("image/")).slice(0, max - latest.current.length);
    if (!list.length) return;
    for (const [i, file] of list.entries()) {
      setBusy(`Uploading ${i + 1}/${list.length}…`);
      try {
        const small = await imageCompression(file, { maxSizeMB: 1.2, maxWidthOrHeight: 2000, useWebWorker: true, fileType: "image/webp", initialQuality: 0.85 });
        const fd = new FormData();
        fd.append("file", new File([small], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }));
        const res = await uploadListingImageAction(fd);
        if (res.ok && res.data) {
          const d = res.data;
          const next = [...latest.current, { key: d.url, url: d.url, publicId: d.publicId, width: d.width, height: d.height, blurData: d.blurData ?? null, alt: "", isCover: latest.current.length === 0 }];
          latest.current = next;
          onChange(next);
        } else if (!res.ok) toast.error(res.error);
      } catch {
        toast.error(`Could not upload ${file.name}`);
      }
    }
    setBusy(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = images.findIndex((i) => i.key === e.active.id);
    const to = images.findIndex((i) => i.key === e.over!.id);
    onChange(arrayMove(images, from, to));
  };
  const update = (key: string, patch: Partial<ManagedImage>) => onChange(images.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const setCover = (key: string) => onChange(images.map((i) => ({ ...i, isCover: i.key === key })));
  const remove = (key: string) => {
    const next = images.filter((i) => i.key !== key);
    if (next.length && !next.some((i) => i.isCover)) next[0] = { ...next[0], isCover: true };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void upload(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-primary bg-red-50 dark:bg-navy-700" : "border-line-strong hover:border-primary",
          busy && "pointer-events-none opacity-70",
        )}
      >
        {busy ? <Loader2 className="size-8 animate-spin text-primary" /> : <UploadCloud className="size-8 text-muted" />}
        <span className="font-semibold text-fg">{busy ?? "Drop photos here or click to upload"}</span>
        <span className="text-xs text-muted">JPG, PNG, WebP or HEIC · compressed in the browser · up to {max} photos</span>
        <input type="file" accept="image/*" multiple className="sr-only" disabled={!!busy} onChange={(e) => { void upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </label>

      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images.map((i) => i.key)} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {images.map((img, idx) => (
                <SortableImage key={img.key} img={img} index={idx} onCover={() => setCover(img.key)} onRemove={() => remove(img.key)} onAlt={(alt) => update(img.key, { alt })} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {images.length === 0 && !busy && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <ImagePlus className="size-4" /> No photos yet. Listings with photos get far more inquiries.
        </p>
      )}
    </div>
  );
}

function SortableImage({ img, index, onCover, onRemove, onAlt }: { img: ManagedImage; index: number; onCover: () => void; onRemove: () => void; onAlt: (v: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.key });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("overflow-hidden rounded-btn bg-surface shadow-card", isDragging && "z-10 shadow-pop ring-2 ring-yellow-500", img.isCover && "ring-2 ring-red-500")}>
      <div className="relative aspect-[4/3] bg-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.alt ?? ""} className="size-full object-cover" />
        <button type="button" {...attributes} {...listeners} aria-label={`Drag to reorder photo ${index + 1}`} className="absolute top-1.5 left-1.5 grid size-8 cursor-grab place-items-center rounded-full bg-navy-900/75 text-white active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
        {img.isCover && <span className="absolute bottom-1.5 left-1.5 rounded-pill bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">Cover</span>}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          {!img.isCover && (
            <button type="button" onClick={onCover} aria-label="Make cover photo" title="Make cover" className="grid size-8 cursor-pointer place-items-center rounded-full bg-white/90 text-navy-900">
              <Star className="size-4" />
            </button>
          )}
          <button type="button" onClick={onRemove} aria-label="Delete photo" title="Delete" className="grid size-8 cursor-pointer place-items-center rounded-full bg-white/90 text-error">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <input value={img.alt ?? ""} onChange={(e) => onAlt(e.target.value)} placeholder="Alt text (describe the photo)" aria-label={`Alt text for photo ${index + 1}`} maxLength={200} className="w-full border-t border-line bg-transparent px-2.5 py-2 text-xs outline-none focus:bg-bg-2" />
    </li>
  );
}
