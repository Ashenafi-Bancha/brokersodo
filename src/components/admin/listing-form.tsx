"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, Loader2, Lock, MapPin, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Switch } from "@/components/ui/switch";
import { AttributeFields } from "@/components/forms/attribute-fields";
import { MapPicker } from "@/components/listings/map-lazy";
import { RichTextEditor } from "./rich-text";
import { ImageManager, type ManagedImage } from "./image-manager";
import { listingFormSchema, type ListingFormInput } from "@/lib/validators/admin";
import { CONDITIONS, LISTING_STATUSES, RENT_PERIODS } from "@/lib/validators/common";
import type { AttributeField, AttributeValue } from "@/lib/validators/attribute-schema";
import { saveListingAction } from "@/server/actions/admin-listings";
import { cn } from "@/lib/utils";

export type ListingFormOptions = {
  categories: { id: string; name: string; refPrefix: string; fields: AttributeField[] }[];
  areas: { id: string; name: string }[];
  staff: { id: string; name: string; role: string }[];
};

type Props = ListingFormOptions & {
  id?: string;
  refCode?: string;
  slug?: string;
  initial: ListingFormInput;
};

function Section({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card bg-surface p-5 shadow-card sm:p-6", className)}>
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function ListingForm({ id, refCode, slug, initial, categories, areas, staff }: Props) {
  const router = useRouter();
  const [images, setImages] = React.useState<ManagedImage[]>(() => (initial.images ?? []).map((i) => ({ ...i, isCover: !!i.isCover, key: i.url })));
  const [lang, setLang] = React.useState<"en" | "am">("en");
  const form = useForm<ListingFormInput>({ resolver: zodResolver(listingFormSchema), defaultValues: initial });
  const { register, control, watch, setValue, handleSubmit, formState, setError } = form;
  const categoryId = watch("categoryId");
  const dealType = watch("dealType");
  const priceOnRequest = watch("priceOnRequest");
  const featured = watch("featured");
  const attributes = (watch("attributes") ?? {}) as Record<string, AttributeValue | undefined>;
  const category = categories.find((c) => c.id === categoryId);
  const errors = formState.errors;
  const attrErrors = React.useMemo(() => {
    const out: Record<string, string[]> = {};
    const a = (errors as Record<string, unknown>)["attributes"] as Record<string, { message?: string }> | undefined;
    if (a) for (const [k, v] of Object.entries(a)) if (v?.message) out[k] = [v.message];
    return out;
  }, [errors]);

  const submit = (status?: ListingFormInput["status"]) =>
    handleSubmit(async () => {
      const values = form.getValues();
      const payload = { ...values, status: status ?? values.status, images: images.map(({ key: _k, ...img }) => img) };
      const res = await saveListingAction(id ?? null, payload);
      if (!res.ok) {
        toast.error(res.error);
        for (const [k, v] of Object.entries(res.fieldErrors ?? {})) {
          if (!v?.[0]) continue;
          if (k.startsWith("attributes.")) setError(k as `attributes.${string}`, { message: v[0] });
          else setError(k as keyof ListingFormInput, { message: v[0] });
        }
        return;
      }
      toast.success(res.message ?? "Saved");
      if (status) setValue("status", status);
      if (!id && res.data) router.replace(`/admin/listings/${res.data.id}`);
      else router.refresh();
    }, () => toast.error("Please check the highlighted fields."))();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      noValidate
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="min-w-0 space-y-6">
        <Section title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="categoryId" label="Category" required error={errors.categoryId?.message}>
              <Select
                id="categoryId"
                {...register("categoryId", {
                  onChange: () => setValue("attributes", {}),
                })}
                aria-invalid={!!errors.categoryId}
              >
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.refPrefix})
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="status" label="Status">
              <Select id="status" {...register("status")}>
                {LISTING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-fg">Deal type</legend>
              <div className="inline-flex gap-1 rounded-pill bg-bg-2 p-1">
                {(["SALE", "RENT"] as const).map((d) => (
                  <button key={d} type="button" aria-pressed={dealType === d} onClick={() => setValue("dealType", d)} className={cn("min-h-10 cursor-pointer rounded-pill px-5 text-sm font-bold", dealType === d ? "bg-red-500 text-white" : "text-muted hover:text-fg")}>
                    {d === "SALE" ? "For sale" : "For rent"}
                  </button>
                ))}
              </div>
            </fieldset>
            {dealType === "RENT" && (
              <Field id="rentPeriod" label="Rent period" error={errors.rentPeriod?.message} className="min-w-40">
                <Select id="rentPeriod" {...register("rentPeriod")}>
                  {RENT_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      Per {p.toLowerCase()}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          <Field id="titleEn" label="Title (English)" required error={errors.titleEn?.message}>
            <Input id="titleEn" {...register("titleEn")} aria-invalid={!!errors.titleEn} placeholder="e.g. Toyota Vitz 2012, automatic" />
          </Field>
          <Field id="titleAm" label="Title (Amharic)" optionalLabel="optional">
            <Input id="titleAm" lang="am" {...register("titleAm")} />
          </Field>
        </Section>

        <Section title="Price">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="price" label="Price (ETB)" required={!priceOnRequest} error={errors.price?.message} hint="Whole Birr. You can type 1.2m or 250k.">
              <Input id="price" inputMode="numeric" disabled={!!priceOnRequest} {...register("price")} aria-invalid={!!errors.price} />
            </Field>
            <Field id="condition" label="Condition" optionalLabel="optional">
              <Select id="condition" {...register("condition")}>
                <option value="">—</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller control={control} name="isNegotiable" render={({ field }) => <Switch id="isNegotiable" label="Negotiable" checked={!!field.value} onCheckedChange={field.onChange} />} />
            <Controller control={control} name="priceOnRequest" render={({ field }) => <Switch id="priceOnRequest" label="Price on request" description="Hide the price on the site" checked={!!field.value} onCheckedChange={field.onChange} />} />
          </div>
        </Section>

        <Section title="Details" description={category ? `Fields for ${category.name}. Edit them in Categories → schema builder.` : "Choose a category first."}>
          {category ? (
            <AttributeFields
              idPrefix="a"
              fields={category.fields}
              values={attributes}
              errors={attrErrors}
              optionalLabel="optional"
              locale="en"
              onChange={(k, v) => {
                const next = { ...attributes };
                if (v === undefined) delete next[k];
                else next[k] = v;
                setValue("attributes", next, { shouldDirty: true });
              }}
            />
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
        </Section>

        <Section title="Description">
          <div className="inline-flex gap-1 rounded-pill bg-bg-2 p-1" role="tablist" aria-label="Description language">
            {(["en", "am"] as const).map((l) => (
              <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={cn("min-h-9 cursor-pointer rounded-pill px-4 text-sm font-bold", lang === l ? "bg-red-500 text-white" : "text-muted")}>
                {l === "en" ? "English" : "አማርኛ (optional)"}
              </button>
            ))}
          </div>
          <Controller
            control={control}
            name={lang === "en" ? "descriptionEn" : "descriptionAm"}
            render={({ field }) => (
              <RichTextEditor key={lang} id={`desc-${lang}`} lang={lang} value={(field.value as string) ?? ""} onChange={field.onChange} placeholder={lang === "en" ? "Condition, features, documents, what's included…" : "መግለጫ…"} />
            )}
          />
          <Field id="videoUrl" label="YouTube video" optionalLabel="optional" error={errors.videoUrl?.message}>
            <Input id="videoUrl" type="url" placeholder="https://youtu.be/…" {...register("videoUrl")} />
          </Field>
        </Section>

        <Section title="Photos" description="Drag to reorder. The cover photo is shown on cards. Public photos get the BrokerSodo watermark automatically.">
          <ImageManager images={images} onChange={setImages} />
        </Section>

        <Section title="Location" description="Approximate only — the public map shows a privacy circle, never an exact pin.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="areaId" label="Area">
              <Select id="areaId" {...register("areaId")}>
                <option value="">—</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="addressHint" label="Public address hint" optionalLabel="optional" hint="Vague, e.g. “Near Arada market”">
              <Input id="addressHint" {...register("addressHint")} />
            </Field>
          </div>
          <Controller
            control={control}
            name="lat"
            render={({ field }) => {
              const lat = field.value === "" || field.value == null ? null : Number(field.value);
              const lngRaw = watch("lng");
              const lng = lngRaw === "" || lngRaw == null ? null : Number(lngRaw);
              return (
                <div>
                  <div className="h-64 overflow-hidden rounded-card border border-line">
                    <MapPicker
                      lat={lat}
                      lng={lng}
                      onChange={(la, ln) => {
                        field.onChange(la);
                        setValue("lng", ln, { shouldDirty: true });
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                    <MapPin className="size-3.5" /> Click the map to set the approximate location.
                    {lat != null && lng != null && (
                      <>
                        <span className="font-mono">
                          {lat.toFixed(4)}, {lng.toFixed(4)}
                        </span>
                        <button type="button" className="font-bold text-primary" onClick={() => { field.onChange(null); setValue("lng", null); }}>
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                  {errors.lat?.message && <p className="mt-1 text-sm text-error">{errors.lat.message}</p>}
                </div>
              );
            }}
          />
        </Section>

        <Section title="Private — staff only" description="Owner details are never shown on the public site or sent to the browser on public pages." className="border-2 border-red-500">
          <div className="flex items-center gap-2 rounded-btn bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-200">
            <Lock className="size-4" /> Private owner information
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ownerName" label="Owner name" optionalLabel="optional">
              <Input id="ownerName" autoComplete="off" {...register("ownerName")} />
            </Field>
            <Field id="ownerPhone" label="Owner phone" optionalLabel="optional" error={errors.ownerPhone?.message}>
              <Input id="ownerPhone" type="tel" autoComplete="off" {...register("ownerPhone")} />
            </Field>
          </div>
          <Field id="ownerNotes" label="Internal notes" optionalLabel="optional">
            <Textarea id="ownerNotes" rows={3} {...register("ownerNotes")} />
          </Field>
        </Section>
      </div>

      <aside className="space-y-6">
        <div className="space-y-6 xl:sticky xl:top-24">
          <section className="rounded-card bg-surface p-5 shadow-card">
            {refCode && (
              <p className="mb-3 text-sm text-muted">
                Ref <span className="font-mono font-bold text-fg">{refCode}</span>
              </p>
            )}
            <div className="grid gap-2">
              <Button type="submit" disabled={formState.isSubmitting} block>
                {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save
              </Button>
              {watch("status") !== "PUBLISHED" && (
                <Button variant="secondary" disabled={formState.isSubmitting} onClick={() => void submit("PUBLISHED")} block>
                  <Send /> Save & publish
                </Button>
              )}
              {id && (
                <Button asChild variant="outline" block className="border-line">
                  <Link href={`/admin/listings/${id}/preview`} target="_blank">
                    <Eye /> Preview
                  </Link>
                </Button>
              )}
              {slug && watch("status") !== "DRAFT" && watch("status") !== "ARCHIVED" && (
                <a href={`/listings/${slug}`} target="_blank" rel="noopener noreferrer" className="text-center text-sm font-semibold text-primary hover:underline">
                  View on site ↗
                </a>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-card bg-surface p-5 shadow-card">
            <h2 className="font-bold text-fg">Trust & promotion</h2>
            <Controller control={control} name="isVerified" render={({ field }) => <Switch id="isVerified" label="Verified" description="Owner and documents checked" checked={!!field.value} onCheckedChange={field.onChange} />} />
            <Controller control={control} name="isInspected" render={({ field }) => <Switch id="isInspected" label="Inspected" description="Physically inspected by a broker" checked={!!field.value} onCheckedChange={field.onChange} />} />
            <Controller control={control} name="featured" render={({ field }) => <Switch id="featured" label="Featured" description="Shown in the homepage carousel" checked={!!field.value} onCheckedChange={field.onChange} />} />
            {featured && (
              <Field id="featuredUntil" label="Featured until" optionalLabel="optional">
                <Input id="featuredUntil" type="date" {...register("featuredUntil")} />
              </Field>
            )}
          </section>

          <section className="rounded-card bg-surface p-5 shadow-card">
            <Field id="assignedBrokerId" label="Assigned broker">
              <Select id="assignedBrokerId" {...register("assignedBrokerId")}>
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role.toLowerCase()})
                  </option>
                ))}
              </Select>
            </Field>
          </section>
        </div>
      </aside>
    </form>
  );
}
