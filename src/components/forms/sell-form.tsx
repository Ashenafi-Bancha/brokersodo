"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import imageCompression from "browser-image-compression";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Lock, PartyPopper, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/form-controls";
import { CategoryIcon } from "@/components/layout/brand";
import { AttributeFields } from "./attribute-fields";
import { useFormError } from "./use-form-error";
import { submissionSchema, type SubmissionInput } from "@/lib/validators/public-forms";
import type { AttributeField, AttributeValue } from "@/lib/validators/attribute-schema";
import { createSubmissionAction, uploadSubmissionPhotoAction } from "@/server/actions/public";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string; icon: string; fields: AttributeField[] };
type Area = { id: string; name: string };
type Photo = { url: string; publicId?: string | null; width: number; height: number };

const STEPS = ["category", "details", "photos", "contact"] as const;
const MAX_PHOTOS = 10;

export function SellForm({ categories, areas }: { categories: Cat[]; areas: Area[] }) {
  const t = useTranslations("sell");
  const tf = useTranslations("form");
  const locale = useLocale();
  const err = useFormError();
  const [step, setStep] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState<{ busy: boolean; label?: string }>({ busy: false });
  const topRef = React.useRef<HTMLDivElement>(null);

  const form = useForm<SubmissionInput>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { categoryId: "", dealType: "SALE", rentPeriod: "MONTH", title: "", details: "", attributes: {}, expectedPrice: "", areaId: "", photos: [], name: "", phone: "", website: "" },
    mode: "onTouched",
  });
  const { register, watch, setValue, trigger, formState, control, handleSubmit, setError } = form;
  const categoryId = watch("categoryId");
  const dealType = watch("dealType");
  const photos = (watch("photos") ?? []) as Photo[];
  const attributes = (watch("attributes") ?? {}) as Record<string, AttributeValue | undefined>;
  const cat = categories.find((c) => c.id === categoryId);

  const stepFields: Record<number, (keyof SubmissionInput)[]> = {
    0: ["categoryId", "dealType"],
    1: ["title", "details", "expectedPrice", "areaId", "rentPeriod"],
    2: ["photos"],
    3: ["name", "phone"],
  };

  const go = async (dir: 1 | -1) => {
    if (dir === 1 && !(await trigger(stepFields[step]))) return;
    setStep((s) => Math.min(Math.max(s + dir, 0), STEPS.length - 1));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, room);
    const next = [...photos];
    for (const [i, file] of list.entries()) {
      try {
        setUploading({ busy: true, label: `${t("compressing")} ${i + 1}/${list.length}` });
        // Compress on the phone before upload — saves the visitor's data on slow 3G/4G.
        const small = await imageCompression(file, { maxSizeMB: 0.6, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/webp", initialQuality: 0.8 });
        setUploading({ busy: true, label: `${t("uploading")} ${i + 1}/${list.length}` });
        const fd = new FormData();
        fd.append("file", new File([small], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }));
        const res = await uploadSubmissionPhotoAction(fd);
        if (res.ok && res.data) next.push({ url: res.data.url, publicId: res.data.publicId, width: res.data.width, height: res.data.height });
        else if (!res.ok) setServerError(err(res.error) ?? tf("errors.generic"));
      } catch {
        setServerError(tf("errors.generic"));
      }
    }
    setValue("photos", next, { shouldValidate: true });
    setUploading({ busy: false });
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await createSubmissionAction(values);
    if (res.ok) {
      setDone(true);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) setError(k as keyof SubmissionInput, { message: v[0] });
    setServerError(err(res.error) ?? tf("errors.generic"));
  });

  if (done) {
    return (
      <div ref={topRef} className="flex flex-col items-center rounded-card bg-surface px-6 py-14 text-center shadow-card" role="status">
        <span className="grid size-20 place-items-center rounded-full bg-yellow-500">
          <PartyPopper className="size-10 text-navy-900" />
        </span>
        <h2 className="mt-6 font-brand text-h3 text-fg">{t("successTitle")}</h2>
        <p className="mt-3 max-w-md text-muted">{t("successBody")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>{t("another")}</Button>
          <Button asChild variant="outline">
            <Link href="/listings">{t("browse")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/* Progress */}
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label={t("stepOf", { n: step + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-col gap-2" aria-current={i === step ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-brand-gradient" : "bg-line")} />
            <span className={cn("flex items-center gap-1 text-xs font-bold sm:text-sm", i === step ? "text-fg" : "text-muted")}>
              {i < step ? <Check className="size-3.5 text-sold" /> : <span className="font-brand text-primary">{i + 1}</span>}
              <span className="truncate">{t(`steps.${s}`)}</span>
            </span>
          </li>
        ))}
      </ol>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) void go(1);
          else void onSubmit(e);
        }}
        noValidate
        className="relative rounded-card bg-surface p-5 shadow-card sm:p-8"
      >
        <Honeypot {...register("website")} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
            {step === 0 && (
              <div className="flex flex-col gap-6">
                <fieldset>
                  <legend className="mb-3 text-lg font-bold text-fg">{t("chooseCategory")}</legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={categoryId === c.id}
                        onClick={() => {
                          setValue("categoryId", c.id, { shouldValidate: true });
                          setValue("attributes", {});
                          if (c.icon === "rentals") setValue("dealType", "RENT");
                        }}
                        className={cn(
                          "flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 p-3 text-center text-sm font-bold transition-colors",
                          categoryId === c.id ? "border-yellow-500 bg-yellow-100 text-navy-900 dark:bg-navy-700 dark:text-white" : "border-line text-fg hover:border-line-strong",
                        )}
                      >
                        <CategoryIcon icon={c.icon} className="size-9" />
                        {c.name}
                      </button>
                    ))}
                  </div>
                  {formState.errors.categoryId && <p role="alert" className="mt-2 text-sm font-medium text-error">{err(formState.errors.categoryId.message)}</p>}
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-fg">{t("dealType")}</legend>
                  <div className="inline-flex gap-1 rounded-pill bg-yellow-500 p-1">
                    {(["SALE", "RENT"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={dealType === d}
                        onClick={() => setValue("dealType", d)}
                        className={cn("min-h-10 cursor-pointer rounded-pill px-6 font-bold", dealType === d ? "bg-red-500 text-white" : "text-navy-900 hover:bg-yellow-400")}
                      >
                        {d === "SALE" ? t("sale") : t("rent")}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-5">
                <Field id="s-title" label={t("titleLabel")} required error={err(formState.errors.title?.message)}>
                  <Input id="s-title" placeholder={t("titlePlaceholder")} aria-invalid={!!formState.errors.title} {...register("title")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="s-price" label={t("expectedPrice")} optionalLabel={tf("optional")} error={err(formState.errors.expectedPrice?.message)}>
                    <Input id="s-price" inputMode="numeric" placeholder="e.g. 1,250,000" {...register("expectedPrice")} />
                  </Field>
                  {dealType === "RENT" ? (
                    <Field id="s-period" label={t("rentPeriod")}>
                      <Select id="s-period" {...register("rentPeriod")}>
                        {(["DAY", "MONTH", "YEAR"] as const).map((p) => (
                          <option key={p} value={p}>
                            {t(`period.${p}`)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : (
                    <Field id="s-area" label={t("area")} optionalLabel={tf("optional")}>
                      <Select id="s-area" {...register("areaId")}>
                        <option value="">—</option>
                        {areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </div>
                {dealType === "RENT" && (
                  <Field id="s-area2" label={t("area")} optionalLabel={tf("optional")}>
                    <Select id="s-area2" {...register("areaId")}>
                      <option value="">—</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                {cat && cat.fields.length > 0 && (
                  <AttributeFields
                    idPrefix="s-attr"
                    fields={cat.fields.map((f) => ({ ...f, required: false }))}
                    values={attributes}
                    optionalLabel={tf("optional")}
                    onChange={(k, v) => {
                      const next = { ...attributes };
                      if (v === undefined) delete next[k];
                      else next[k] = v;
                      setValue("attributes", next as Record<string, string | number | boolean>);
                    }}
                    locale={locale}
                  />
                )}
                <Field id="s-details" label={t("detailsLabel")} optionalLabel={tf("optional")}>
                  <Textarea id="s-details" rows={5} placeholder={t("detailsPlaceholder")} {...register("details")} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-lg font-bold text-fg">{t("photosLabel")}</p>
                  <p className="text-sm text-muted">{t("photosHint")}</p>
                </div>
                <Controller
                  control={control}
                  name="photos"
                  render={() => (
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {photos.map((p, i) => (
                        <li key={p.url} className="relative aspect-square overflow-hidden rounded-btn bg-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="" className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setValue("photos", photos.filter((_, j) => j !== i))}
                            aria-label={t("removePhoto")}
                            className="absolute top-1 right-1 grid size-8 cursor-pointer place-items-center rounded-full bg-navy-900/80 text-white"
                          >
                            <X className="size-4" />
                          </button>
                        </li>
                      ))}
                      {photos.length < MAX_PHOTOS && (
                        <li>
                          <label className={cn("flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-btn border-2 border-dashed border-line-strong text-center text-xs font-bold text-muted hover:border-primary hover:text-primary", uploading.busy && "pointer-events-none opacity-60")}>
                            {uploading.busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-7" />}
                            <span className="px-1">{uploading.busy ? uploading.label : t("addPhotos")}</span>
                            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} disabled={uploading.busy} />
                          </label>
                        </li>
                      )}
                    </ul>
                  )}
                />
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-5">
                <Field id="s-name" label={tf("name")} required error={err(formState.errors.name?.message)}>
                  <Input id="s-name" autoComplete="name" aria-invalid={!!formState.errors.name} {...register("name")} />
                </Field>
                <Field id="s-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(formState.errors.phone?.message)}>
                  <Input id="s-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="09…" aria-invalid={!!formState.errors.phone} {...register("phone")} />
                </Field>
                <p className="flex items-start gap-2 rounded-btn bg-bg-2 p-3 text-sm text-fg-2">
                  <Lock className="mt-0.5 size-4 shrink-0 text-sold" /> {t("privacyNote")}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {serverError && (
          <p role="alert" className="mt-5 rounded-btn bg-red-50 px-3 py-2 text-sm font-medium text-error dark:bg-error/20 dark:text-red-200">
            {serverError}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => go(-1)}>
              <ChevronLeft /> {t("back")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={formState.isSubmitting || uploading.busy}>
            {step < STEPS.length - 1 ? (
              <>
                {t("next")} <ChevronRight />
              </>
            ) : formState.isSubmitting ? (
              <>
                <Loader2 className="animate-spin" /> {tf("sending")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
