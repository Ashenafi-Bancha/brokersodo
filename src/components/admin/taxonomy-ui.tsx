"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Switch } from "@/components/ui/switch";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/layout/brand";
import { SortableList } from "./sortable-list";
import { SchemaBuilder } from "./schema-builder";
import { useConfirm, useRunAction } from "./confirm";
import { areaFormSchema, categoryFormSchema, type AreaFormInput, type CategoryFormInput } from "@/lib/validators/admin";
import type { AttributeField } from "@/lib/validators/attribute-schema";
import {
  deleteAreaAction,
  deleteCategoryAction,
  reorderAreasAction,
  reorderCategoriesAction,
  saveAreaAction,
  saveCategoryAction,
} from "@/server/actions/admin-taxonomy";
import { slugify, cn } from "@/lib/utils";

type CatRow = { id: string; nameEn: string; nameAm: string | null; slug: string; icon: string; isActive: boolean; count: number; fields: number };

export function CategoryList({ rows }: { rows: CatRow[] }) {
  const [items, setItems] = React.useState(rows);
  const [dirty, setDirty] = React.useState(false);
  const { run, pending } = useRunAction();
  const router = useRouter();
  React.useEffect(() => setItems(rows), [rows]);
  return (
    <div className="space-y-3">
      {dirty && (
        <div className="flex items-center gap-3 rounded-btn bg-yellow-100 p-3 text-sm font-semibold text-navy-900">
          Order changed.
          <Button size="xs" disabled={pending} onClick={() => run(() => reorderCategoriesAction({ ids: items.map((i) => i.id) }), () => { setDirty(false); router.refresh(); })}>
            Save order
          </Button>
        </div>
      )}
      <SortableList
        items={items}
        getId={(i) => i.id}
        onReorder={(n) => {
          setItems(n);
          setDirty(true);
        }}
        renderItem={(c) => (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-btn bg-yellow-100 dark:bg-navy-700">
              <CategoryIcon icon={c.icon} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold text-fg", !c.isActive && "text-muted line-through")}>
                {c.nameEn} {c.nameAm && <span className="font-normal text-muted">· {c.nameAm}</span>}
              </p>
              <p className="text-xs text-muted">
                /c/{c.slug} · {c.count} listings · {c.fields} fields
              </p>
            </div>
            <Button asChild variant="outline" size="xs" className="border-line">
              <Link href={`/admin/categories/${c.id}`}>
                <Pencil /> Edit
              </Link>
            </Button>
          </div>
        )}
      />
    </div>
  );
}

export function CategoryForm({ id, initial, parents }: { id?: string; initial: CategoryFormInput; parents: { id: string; nameEn: string }[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const form = useForm<CategoryFormInput>({ resolver: zodResolver(categoryFormSchema), defaultValues: initial });
  const { register, control, handleSubmit, formState, watch, setValue, setError } = form;
  const icon = watch("icon");
  const schemaErrors = React.useMemo(() => {
    const e = formState.errors.attributeSchema as unknown;
    const out: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (!v || typeof v !== "object") return;
      const m = (v as { message?: string }).message;
      if (m) out.push(`${path ? `${path}: ` : ""}${m}`);
      for (const [k, c] of Object.entries(v)) if (k !== "message" && k !== "ref" && k !== "type") walk(c, path ? `${path}.${k}` : `Field ${Number(k) + 1}`);
    };
    walk(e, "");
    return out;
  }, [formState.errors.attributeSchema]);

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveCategoryAction(id ?? null, values);
    if (!res.ok) {
      toast.error(res.error);
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) if (v?.[0]) setError(k as keyof CategoryFormInput, { message: v[0] });
      return;
    }
    toast.success(res.message ?? "Saved");
    if (!id && res.data) router.replace(`/admin/categories/${res.data.id}`);
    else router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-card bg-surface p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-fg">Category</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nameEn" label="Name (English)" required error={formState.errors.nameEn?.message}>
              <Input id="nameEn" {...register("nameEn", { onChange: (e) => !id && setValue("slug", slugify(e.target.value)) })} />
            </Field>
            <Field id="nameAm" label="Name (Amharic)" optionalLabel="optional">
              <Input id="nameAm" lang="am" {...register("nameAm")} />
            </Field>
            <Field id="slug" label="URL slug" required hint="Used in /c/<slug>. Changing it breaks old links." error={formState.errors.slug?.message}>
              <Input id="slug" {...register("slug")} className="font-mono" />
            </Field>
            <Field id="refPrefix" label="Ref-code prefix" required hint="1–3 capital letters, e.g. V → BS-V-0142" error={formState.errors.refPrefix?.message}>
              <Input id="refPrefix" maxLength={3} {...register("refPrefix", { onChange: (e) => setValue("refPrefix", e.target.value.toUpperCase()) })} className="font-mono uppercase" />
            </Field>
            <Field id="parentId" label="Parent category" optionalLabel="optional">
              <Select id="parentId" {...register("parentId")}>
                <option value="">None (top level)</option>
                {parents.filter((p) => p.id !== id).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameEn}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="image" label="Image URL" optionalLabel="optional">
              <Input id="image" {...register("image")} placeholder="https://…" />
            </Field>
          </div>
          <Field id="descriptionEn" label="Description (English)" optionalLabel="optional" hint="Shown on the category page and in search results.">
            <Textarea id="descriptionEn" rows={2} {...register("descriptionEn")} />
          </Field>
          <Field id="descriptionAm" label="Description (Amharic)" optionalLabel="optional">
            <Textarea id="descriptionAm" lang="am" rows={2} {...register("descriptionAm")} />
          </Field>
        </section>

        <section className="space-y-4 rounded-card bg-surface p-5 shadow-card sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-fg">Attribute schema</h2>
            <p className="text-sm text-muted">The fields staff fill in for this category. They power the specs table, card highlights and browse filters.</p>
          </div>
          <Controller control={control} name="attributeSchema" render={({ field }) => <SchemaBuilder value={(field.value ?? []) as AttributeField[]} onChange={field.onChange} errors={schemaErrors} />} />
        </section>
      </div>

      <aside className="space-y-6">
        <div className="space-y-6 xl:sticky xl:top-24">
          <section className="space-y-4 rounded-card bg-surface p-5 shadow-card">
            <Button type="submit" block disabled={formState.isSubmitting}>
              {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save category
            </Button>
            <Controller control={control} name="isActive" render={({ field }) => <Switch id="isActive" label="Active" description="Inactive categories are hidden from the site" checked={!!field.value} onCheckedChange={field.onChange} />} />
            {id && (
              <Button
                variant="ghost"
                size="sm"
                className="text-error"
                disabled={pending}
                onClick={async () => {
                  if ((await confirm({ title: "Delete this category?", description: "Only possible when it has no listings.", confirmLabel: "Delete", destructive: true })).ok)
                    run(() => deleteCategoryAction(id), () => router.push("/admin/categories"));
                }}
              >
                <Trash2 /> Delete category
              </Button>
            )}
          </section>
          <section className="rounded-card bg-surface p-5 shadow-card">
            <p className="mb-3 text-sm font-semibold text-fg">Icon</p>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Category icon">
              {CATEGORY_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  role="radio"
                  aria-checked={icon === ic}
                  aria-label={ic}
                  title={ic}
                  onClick={() => setValue("icon", ic, { shouldDirty: true })}
                  className={cn("grid aspect-square cursor-pointer place-items-center rounded-btn border-2", icon === ic ? "border-yellow-500 bg-yellow-100 dark:bg-navy-700" : "border-line hover:border-line-strong")}
                >
                  <CategoryIcon icon={ic} className="size-7" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </form>
  );
}

type AreaRow = { id: string; nameEn: string; nameAm: string | null; slug: string; city: string; isActive: boolean; count: number };

export function AreasManager({ rows }: { rows: AreaRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [items, setItems] = React.useState(rows);
  const [dirty, setDirty] = React.useState(false);
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  React.useEffect(() => setItems(rows), [rows]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3">
        {dirty && (
          <div className="flex items-center gap-3 rounded-btn bg-yellow-100 p-3 text-sm font-semibold text-navy-900">
            Order changed.
            <Button size="xs" disabled={pending} onClick={() => run(() => reorderAreasAction({ ids: items.map((i) => i.id) }), () => { setDirty(false); router.refresh(); })}>
              Save order
            </Button>
          </div>
        )}
        <SortableList
          items={items}
          getId={(i) => i.id}
          onReorder={(n) => {
            setItems(n);
            setDirty(true);
          }}
          renderItem={(a) => (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className={cn("font-semibold text-fg", !a.isActive && "text-muted line-through")}>
                  {a.nameEn} {a.nameAm && <span className="font-normal text-muted">· {a.nameAm}</span>}
                </p>
                <p className="text-xs text-muted">
                  {a.city} · {a.slug} · {a.count} listings
                </p>
              </div>
              <Button variant="outline" size="xs" className="border-line" onClick={() => setEditing(a.id)}>
                <Pencil /> Edit
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-error"
                aria-label={`Delete ${a.nameEn}`}
                onClick={async () => {
                  if ((await confirm({ title: `Delete “${a.nameEn}”?`, description: a.count ? `${a.count} listings will lose their area.` : undefined, confirmLabel: "Delete", destructive: true })).ok)
                    run(() => deleteAreaAction(a.id), () => router.refresh());
                }}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        />
      </div>
      <aside>
        <div className="rounded-card bg-surface p-5 shadow-card lg:sticky lg:top-24">
          {editing ? (
            <AreaForm
              key={editing}
              id={editing === "new" ? undefined : editing}
              initial={(() => {
                const a = items.find((i) => i.id === editing);
                return a ? { nameEn: a.nameEn, nameAm: a.nameAm ?? "", slug: a.slug, city: a.city, isActive: a.isActive } : { nameEn: "", nameAm: "", slug: "", city: "Wolaita Sodo", isActive: true };
              })()}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted">Areas let buyers filter by neighbourhood. Replace the sample areas with real ones.</p>
              <Button onClick={() => setEditing("new")}>
                <Plus /> Add area
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function AreaForm({ id, initial, onDone }: { id?: string; initial: AreaFormInput; onDone: () => void }) {
  const { register, handleSubmit, formState, setValue, control } = useForm<AreaFormInput>({ resolver: zodResolver(areaFormSchema), defaultValues: initial });
  const onSubmit = handleSubmit(async (v) => {
    const res = await saveAreaAction(id ?? null, v);
    if (res.ok) {
      toast.success(res.message ?? "Saved");
      onDone();
    } else toast.error(res.error);
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <h2 className="text-lg font-bold text-fg">{id ? "Edit area" : "New area"}</h2>
      <Field id="a-nameEn" label="Name (English)" required error={formState.errors.nameEn?.message}>
        <Input id="a-nameEn" {...register("nameEn", { onChange: (e) => !id && setValue("slug", slugify(e.target.value)) })} />
      </Field>
      <Field id="a-nameAm" label="Name (Amharic)" optionalLabel="optional">
        <Input id="a-nameAm" lang="am" {...register("nameAm")} />
      </Field>
      <Field id="a-slug" label="Slug" required error={formState.errors.slug?.message}>
        <Input id="a-slug" className="font-mono" {...register("slug")} />
      </Field>
      <Field id="a-city" label="City">
        <Input id="a-city" {...register("city")} />
      </Field>
      <Controller control={control} name="isActive" render={({ field }) => <Switch id="a-active" label="Active" checked={!!field.value} onCheckedChange={field.onChange} />} />
      <div className="flex gap-2">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
