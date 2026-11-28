"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import imageCompression from "browser-image-compression";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { ServerError } from "@/components/forms/simple-forms";
import { useFormError } from "@/components/forms/use-form-error";
import { STORE_TYPES, type StoreImage } from "@/lib/stores";
import { storeItemSchema, storeSchema, type StoreInput, type StoreItemInput } from "@/lib/validators/stores";
import { formatETB } from "@/lib/format";
import { deleteMyStoreItemAction, saveMyStoreAction, saveMyStoreItemAction, uploadStoreImageAction } from "@/server/actions/stores";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

/** Compress in the browser (saves mobile data), then upload. */
function useImageUpload() {
  const t = useTranslations("stores");
  const err = useFormError();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const upload = async (file: File, max = 1600): Promise<StoreImage | null> => {
    setError(null);
    setBusy(true);
    try {
      const small = await imageCompression(file, { maxSizeMB: 0.6, maxWidthOrHeight: max, useWebWorker: true, fileType: "image/webp", initialQuality: 0.82 });
      const fd = new FormData();
      fd.append("file", new File([small], "photo.webp", { type: "image/webp" }));
      const r = await uploadStoreImageAction(fd);
      if (r.ok && r.data) return r.data;
      setError(err(!r.ok ? r.error : "generic") ?? t("uploadFailed"));
      return null;
    } catch {
      setError(t("uploadFailed"));
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { upload, busy, error };
}

function ImagePicker({ label, value, onChange, shape }: { label: string; value: StoreImage | null | undefined; onChange: (v: StoreImage | null) => void; shape: "square" | "wide" }) {
  const t = useTranslations("stores");
  const { upload, busy, error } = useImageUpload();
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-fg">{label}</span>
      <div className={cn("relative overflow-hidden rounded-btn border-2 border-dashed border-line-strong bg-bg-2", shape === "square" ? "size-28" : "aspect-[16/6] w-full")}>
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt="" className="size-full object-cover" />
            <button type="button" onClick={() => onChange(null)} aria-label={t("removePhoto")} className="absolute top-1 right-1 grid size-8 cursor-pointer place-items-center rounded-full bg-white/90 text-navy-900 shadow">
              <X className="size-4" />
            </button>
          </>
        ) : (
          <label className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 text-xs font-bold text-muted hover:text-primary">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            {busy ? t("uploading") : t("addPhoto")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) {
                  const img = await upload(f, shape === "square" ? 600 : 1600);
                  if (img) onChange(img);
                }
              }}
            />
          </label>
        )}
      </div>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}

export function StoreForm({ areas, initial }: { areas: Opt[]; initial?: Partial<StoreInput> }) {
  const t = useTranslations("stores");
  const tf = useTranslations("form");
  const err = useFormError();
  const router = useRouter();
  const form = useForm<StoreInput>({
    resolver: zodResolver(storeSchema),
    defaultValues: { name: "", type: "" as StoreInput["type"], tagline: "", description: "", phone: "", telegram: "", whatsapp: "", areaId: "", address: "", openingHours: "", logo: null, cover: null, ...initial },
  });
  const { register, formState, watch, setValue } = form;
  const [saved, setSaved] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const onSubmit = form.handleSubmit(async (v) => {
    setServerError(null);
    setSaved(false);
    const r = await saveMyStoreAction(v);
    if (r.ok) {
      setSaved(true);
      router.refresh();
    } else {
      if (r.fieldErrors) for (const [k, m] of Object.entries(r.fieldErrors)) if (m?.[0]) form.setError(k as keyof StoreInput, { message: m[0] });
      setServerError(err(r.error) ?? tf("errors.generic"));
    }
  });
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <ImagePicker label={t("logo")} shape="square" value={watch("logo") as StoreImage | null} onChange={(v) => setValue("logo", v, { shouldDirty: true })} />
        <ImagePicker label={t("cover")} shape="wide" value={watch("cover") as StoreImage | null} onChange={(v) => setValue("cover", v, { shouldDirty: true })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="st-name" label={t("name")} required error={err(e.name?.message)}>
          <Input id="st-name" autoComplete="organization" aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="st-type" label={t("typeLabel")} required error={err(e.type?.message)}>
          <Select id="st-type" aria-invalid={!!e.type} {...register("type")}>
            <option value="">—</option>
            {STORE_TYPES.map((s) => (
              <option key={s} value={s}>
                {t(`type.${s}` as "type.SHOP")}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="st-tagline" label={t("tagline")} optionalLabel={tf("optional")}>
        <Input id="st-tagline" placeholder={t("taglinePlaceholder")} {...register("tagline")} />
      </Field>
      <Field id="st-desc" label={t("description")} optionalLabel={tf("optional")}>
        <Textarea id="st-desc" rows={4} placeholder={t("descriptionPlaceholder")} {...register("description")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="st-phone" label={t("phone")} required hint={t("phoneHint")} error={err(e.phone?.message)}>
          <Input id="st-phone" type="tel" inputMode="tel" aria-invalid={!!e.phone} {...register("phone")} />
        </Field>
        <Field id="st-wa" label="WhatsApp" optionalLabel={tf("optional")} error={err(e.whatsapp?.message)}>
          <Input id="st-wa" type="tel" inputMode="tel" {...register("whatsapp")} />
        </Field>
        <Field id="st-tg" label="Telegram" optionalLabel={tf("optional")} error={err(e.telegram?.message)}>
          <Input id="st-tg" placeholder="@mycafe" {...register("telegram")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="st-area" label={t("area")} optionalLabel={tf("optional")}>
          <Select id="st-area" {...register("areaId")}>
            <option value="">—</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="st-addr" label={t("address")} optionalLabel={tf("optional")}>
          <Input id="st-addr" placeholder={t("addressPlaceholder")} {...register("address")} />
        </Field>
        <Field id="st-hours" label={t("hours")} optionalLabel={tf("optional")}>
          <Input id="st-hours" placeholder={t("hoursPlaceholder")} {...register("openingHours")} />
        </Field>
      </div>
      <ServerError msg={serverError} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />} {tf("saveChanges")}
        </Button>
        {saved && <span className="text-sm font-semibold text-sold">{t("saved")}</span>}
      </div>
    </form>
  );
}

export type ItemRow = { id: string; section: string; name: string; description: string | null; price: number | null; priceNote: string | null; image: StoreImage | null; isSpecial: boolean; isAvailable: boolean; sortOrder: number };

/** Add, edit and remove the store's products, menu items or services. */
export function ItemManager({ items, sections }: { items: ItemRow[]; sections: string[] }) {
  const t = useTranslations("stores");
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const nextOrder = items.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 10;
  return (
    <div className="flex flex-col gap-3">
      {editing === "new" ? (
        <ItemEditor sections={sections} item={null} nextOrder={nextOrder} onDone={() => setEditing(null)} />
      ) : (
        <Button type="button" variant="secondary" className="self-start" onClick={() => setEditing("new")}>
          <Plus /> {t("addItem")}
        </Button>
      )}
      {items.length === 0 && editing !== "new" && <p className="rounded-btn bg-bg-2 p-4 text-sm text-fg-2">{t("noItemsYet")}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((i) =>
          editing === i.id ? (
            <li key={i.id}>
              <ItemEditor sections={sections} item={i} nextOrder={nextOrder} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={i.id} className={cn("flex items-center gap-3 rounded-btn border border-line p-2.5", !i.isAvailable && "opacity-60")}>
              {i.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.image.url} alt="" className="size-12 shrink-0 rounded-btn object-cover" />
              ) : (
                <span className="size-12 shrink-0 rounded-btn bg-bg-2" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold text-fg">
                  {i.isSpecial && <Sparkles className="size-4 text-primary" aria-label={t("special")} />}
                  <span className="truncate">{i.name}</span>
                </p>
                <p className="text-xs text-muted">
                  {[i.section, i.price != null ? formatETB(i.price) : t("priceOnRequest"), i.priceNote, !i.isAvailable ? t("hidden") : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`${t("edit")} ${i.name}`} onClick={() => setEditing(i.id)}>
                <Pencil />
              </Button>
              <DeleteItem id={i.id} name={i.name} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function DeleteItem({ id, name }: { id: string; name: string }) {
  const t = useTranslations("stores");
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className="text-error"
      aria-label={`${t("delete")} ${name}`}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("deleteConfirm", { name }))) return;
        start(async () => {
          await deleteMyStoreItemAction(id);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}

function ItemEditor({ item, sections, nextOrder, onDone }: { item: ItemRow | null; sections: string[]; nextOrder: number; onDone: () => void }) {
  const t = useTranslations("stores");
  const tf = useTranslations("form");
  const err = useFormError();
  const router = useRouter();
  const form = useForm<StoreItemInput>({
    resolver: zodResolver(storeItemSchema),
    defaultValues: item
      ? { id: item.id, section: item.section, name: item.name, description: item.description ?? "", price: item.price != null ? String(item.price) : "", priceNote: item.priceNote ?? "", image: item.image, isSpecial: item.isSpecial, isAvailable: item.isAvailable, sortOrder: item.sortOrder }
      : { id: null, section: sections[0] ?? "", name: "", description: "", price: "", priceNote: "", image: null, isSpecial: false, isAvailable: true, sortOrder: nextOrder },
  });
  const { register, formState, watch, setValue } = form;
  const [serverError, setServerError] = React.useState<string | null>(null);
  const onSubmit = form.handleSubmit(async (v) => {
    setServerError(null);
    const r = await saveMyStoreItemAction(v);
    if (r.ok) {
      router.refresh();
      onDone();
    } else setServerError(err(r.error) ?? tf("errors.generic"));
  });
  const e = formState.errors;
  const listId = React.useId();
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-card border-2 border-yellow-500 bg-yellow-50/50 p-4">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <ImagePicker label={t("itemPhoto")} shape="square" value={watch("image") as StoreImage | null} onChange={(v) => setValue("image", v)} />
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <Field id="it-name" label={t("itemName")} required error={err(e.name?.message)}>
            <Input id="it-name" {...register("name")} />
          </Field>
          <Field id="it-section" label={t("section")} optionalLabel={tf("optional")} hint={t("sectionHint")}>
            <Input id="it-section" list={listId} {...register("section")} />
            <datalist id={listId}>
              {sections.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field id="it-price" label={t("price")} optionalLabel={tf("optional")} error={err(e.price?.message)}>
            <Input id="it-price" inputMode="numeric" placeholder={t("pricePlaceholder")} {...register("price")} />
          </Field>
          <Field id="it-note" label={t("priceNote")} optionalLabel={tf("optional")}>
            <Input id="it-note" placeholder={t("priceNotePlaceholder")} {...register("priceNote")} />
          </Field>
        </div>
      </div>
      <Field id="it-desc" label={t("itemDescription")} optionalLabel={tf("optional")}>
        <Textarea id="it-desc" rows={2} {...register("description")} />
      </Field>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" {...register("isSpecial")} /> {t("markSpecial")}
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" {...register("isAvailable")} /> {t("available")}
        </label>
      </div>
      <ServerError msg={serverError} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />} {tf("saveChanges")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
