"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Save, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SortableList } from "./sortable-list";
import { RichTextEditor } from "./rich-text";
import { useConfirm, useRunAction } from "./confirm";
import { faqSchema, pageSchema, testimonialSchema, type FaqInput, type PageInput, type TestimonialInput } from "@/lib/validators/admin";
import {
  deleteFaqAction,
  deleteTestimonialAction,
  reorderFaqsAction,
  reorderTestimonialsAction,
  saveFaqAction,
  savePageAction,
  saveTestimonialAction,
} from "@/server/actions/admin-content";
import { cn } from "@/lib/utils";

type TestimonialRow = TestimonialInput & { id: string };
type FaqRow = FaqInput & { id: string };

/** Generic sortable list + dialog editor for small content collections. */
function CollectionManager<T extends { id: string }>({
  rows,
  addLabel,
  renderRow,
  renderForm,
  onReorder,
  onDelete,
}: {
  rows: T[];
  addLabel: string;
  renderRow: (r: T) => React.ReactNode;
  renderForm: (r: T | null, done: () => void) => React.ReactNode;
  onReorder: (ids: string[]) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, pending } = useRunAction();
  const [items, setItems] = React.useState(rows);
  const [dirty, setDirty] = React.useState(false);
  const [editing, setEditing] = React.useState<T | "new" | null>(null);
  React.useEffect(() => setItems(rows), [rows]);
  const done = () => {
    setEditing(null);
    router.refresh();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> {addLabel}
        </Button>
        {dirty && (
          <Button size="sm" variant="highlight" disabled={pending} onClick={() => run(() => onReorder(items.map((i) => i.id)), () => { setDirty(false); router.refresh(); })}>
            Save order
          </Button>
        )}
      </div>
      <SortableList
        items={items}
        getId={(i) => i.id}
        onReorder={(n) => {
          setItems(n);
          setDirty(true);
        }}
        renderItem={(r) => (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">{renderRow(r)}</div>
            <Button variant="ghost" size="icon-xs" aria-label="Edit" onClick={() => setEditing(r)}>
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-error"
              aria-label="Delete"
              onClick={async () => {
                if ((await confirm({ title: "Delete this item?", confirmLabel: "Delete", destructive: true })).ok) run(() => onDelete(r.id), () => router.refresh());
              }}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title={editing === "new" ? addLabel : "Edit"} className="max-w-xl">
            {renderForm(editing === "new" ? null : editing, done)}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

export function TestimonialsManager({ rows }: { rows: TestimonialRow[] }) {
  return (
    <CollectionManager
      rows={rows}
      addLabel="Add testimonial"
      onReorder={(ids) => reorderTestimonialsAction({ ids })}
      onDelete={deleteTestimonialAction}
      renderRow={(t) => (
        <div className={cn(!t.isActive && "opacity-50")}>
          <p className="font-semibold text-fg">
            {t.name} <span className="font-normal text-muted">{t.role && `· ${t.role}`}</span>
            <span className="ml-2 inline-flex">
              {Array.from({ length: Number(t.rating) || 5 }, (_, i) => (
                <Star key={i} className="size-3 fill-yellow-500 text-yellow-500" />
              ))}
            </span>
          </p>
          <p className="line-clamp-1 text-sm text-fg-2">“{t.quoteEn}”</p>
        </div>
      )}
      renderForm={(t, done) => <TestimonialForm row={t} onDone={done} />}
    />
  );
}

function TestimonialForm({ row, onDone }: { row: TestimonialRow | null; onDone: () => void }) {
  const { register, handleSubmit, control, formState } = useForm<TestimonialInput>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: row ?? { name: "", role: "", quoteEn: "", quoteAm: "", rating: 5, avatar: "", isActive: true },
  });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        const r = await saveTestimonialAction(row?.id ?? null, v);
        if (r.ok) {
          toast.success(r.message ?? "Saved");
          onDone();
        } else toast.error(r.error);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="t-name" label="Name" required error={e.name?.message}>
          <Input id="t-name" {...register("name")} />
        </Field>
        <Field id="t-role" label="Role / deal" optionalLabel="optional">
          <Input id="t-role" placeholder="Sold a Toyota Vitz" {...register("role")} />
        </Field>
      </div>
      <Field id="t-quoteEn" label="Quote (English)" required error={e.quoteEn?.message}>
        <Textarea id="t-quoteEn" rows={3} {...register("quoteEn")} />
      </Field>
      <Field id="t-quoteAm" label="Quote (Amharic)" optionalLabel="optional">
        <Textarea id="t-quoteAm" lang="am" rows={2} {...register("quoteAm")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="t-rating" label="Rating">
          <Select id="t-rating" {...register("rating")}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </Select>
        </Field>
        <Controller control={control} name="isActive" render={({ field }) => <Switch id="t-active" label="Show on site" checked={!!field.value} onCheckedChange={field.onChange} className="self-end pb-2" />} />
      </div>
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save
      </Button>
    </form>
  );
}

export function FaqManager({ rows }: { rows: FaqRow[] }) {
  return (
    <CollectionManager
      rows={rows}
      addLabel="Add FAQ"
      onReorder={(ids) => reorderFaqsAction({ ids })}
      onDelete={deleteFaqAction}
      renderRow={(f) => (
        <div className={cn(!f.isActive && "opacity-50")}>
          <p className="font-semibold text-fg">{f.questionEn}</p>
          <p className="line-clamp-1 text-sm text-muted">{f.answerEn}</p>
        </div>
      )}
      renderForm={(f, done) => <FaqForm row={f} onDone={done} />}
    />
  );
}

function FaqForm({ row, onDone }: { row: FaqRow | null; onDone: () => void }) {
  const { register, handleSubmit, control, formState } = useForm<FaqInput>({
    resolver: zodResolver(faqSchema),
    defaultValues: row ?? { questionEn: "", questionAm: "", answerEn: "", answerAm: "", isActive: true },
  });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        const r = await saveFaqAction(row?.id ?? null, v);
        if (r.ok) {
          toast.success(r.message ?? "Saved");
          onDone();
        } else toast.error(r.error);
      })}
    >
      <Field id="f-qEn" label="Question (English)" required error={e.questionEn?.message}>
        <Input id="f-qEn" {...register("questionEn")} />
      </Field>
      <Field id="f-aEn" label="Answer (English)" required error={e.answerEn?.message}>
        <Textarea id="f-aEn" rows={4} {...register("answerEn")} />
      </Field>
      <Field id="f-qAm" label="Question (Amharic)" optionalLabel="optional">
        <Input id="f-qAm" lang="am" {...register("questionAm")} />
      </Field>
      <Field id="f-aAm" label="Answer (Amharic)" optionalLabel="optional">
        <Textarea id="f-aAm" lang="am" rows={3} {...register("answerAm")} />
      </Field>
      <Controller control={control} name="isActive" render={({ field }) => <Switch id="f-active" label="Show on site" checked={!!field.value} onCheckedChange={field.onChange} />} />
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save
      </Button>
    </form>
  );
}

export function PageEditor({ pages }: { pages: (PageInput & { id: string })[] }) {
  const router = useRouter();
  const [slug, setSlug] = React.useState(pages[0]?.slug ?? "about");
  const page = pages.find((p) => p.slug === slug)!;
  const [lang, setLang] = React.useState<"en" | "am">("en");
  const { register, handleSubmit, control, formState, reset } = useForm<PageInput>({ resolver: zodResolver(pageSchema), defaultValues: page });
  React.useEffect(() => reset(page), [page, reset]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pages">
        {pages.map((p) => (
          <button key={p.slug} type="button" role="tab" aria-selected={p.slug === slug} onClick={() => setSlug(p.slug)} className={cn("min-h-9 cursor-pointer rounded-pill px-4 text-sm font-bold", p.slug === slug ? "bg-navy-900 text-white dark:bg-yellow-500 dark:text-navy-900" : "bg-bg-2 text-muted")}>
            /{p.slug}
          </button>
        ))}
      </div>
      <form
        key={slug}
        noValidate
        className="space-y-4 rounded-card bg-surface p-5 shadow-card"
        onSubmit={handleSubmit(async (v) => {
          const r = await savePageAction(v);
          if (r.ok) {
            toast.success(r.message ?? "Saved");
            router.refresh();
          } else toast.error(r.error);
        })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="p-titleEn" label="Title (English)" required error={formState.errors.titleEn?.message}>
            <Input id="p-titleEn" {...register("titleEn")} />
          </Field>
          <Field id="p-titleAm" label="Title (Amharic)" optionalLabel="optional">
            <Input id="p-titleAm" lang="am" {...register("titleAm")} />
          </Field>
        </div>
        <div className="inline-flex gap-1 rounded-pill bg-bg-2 p-1" role="tablist" aria-label="Body language">
          {(["en", "am"] as const).map((l) => (
            <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={cn("min-h-9 cursor-pointer rounded-pill px-4 text-sm font-bold", lang === l ? "bg-navy-900 text-white dark:bg-yellow-500 dark:text-navy-900" : "text-muted")}>
              {l === "en" ? "English" : "አማርኛ"}
            </button>
          ))}
        </div>
        <Controller control={control} name={lang === "en" ? "bodyEn" : "bodyAm"} render={({ field }) => <RichTextEditor key={`${slug}-${lang}`} id={`p-body-${lang}`} lang={lang} minHeight={320} value={(field.value as string) ?? ""} onChange={field.onChange} />} />
        <div className="flex items-center justify-between gap-3">
          <Controller control={control} name="isActive" render={({ field }) => <Switch id="p-active" label="Published" checked={!!field.value} onCheckedChange={field.onChange} />} />
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save page
          </Button>
        </div>
      </form>
    </div>
  );
}
