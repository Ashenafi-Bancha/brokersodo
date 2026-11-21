"use client";
import * as React from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/form-controls";
import { SortableList } from "./sortable-list";
import { ATTRIBUTE_TYPES, type AttributeField, type AttributeType } from "@/lib/validators/attribute-schema";
import { cn } from "@/lib/utils";

type Draft = AttributeField & { _id: string };
const uid = () => Math.random().toString(36).slice(2, 10);
const TYPE_LABEL: Record<AttributeType, string> = { text: "Text", number: "Number", select: "Dropdown", boolean: "Yes / No", year: "Year" };

function toKey(label: string) {
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "";
  const k = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
  return /^[a-z]/.test(k) ? k.slice(0, 40) : `f${k}`.slice(0, 40);
}

/**
 * Visual attribute-schema builder: add / edit / reorder fields, choose type,
 * options, unit, filterable, show-on-card. No code or migrations needed.
 */
export function SchemaBuilder({ value, onChange, errors }: { value: AttributeField[]; onChange: (v: AttributeField[]) => void; errors?: string[] }) {
  const [items, setItems] = React.useState<Draft[]>(() => value.map((f) => ({ ...f, _id: uid() })));
  const [open, setOpen] = React.useState<string | null>(null);
  const push = (next: Draft[]) => {
    setItems(next);
    onChange(next.map(({ _id: _x, ...f }) => f));
  };
  const update = (id: string, patch: Partial<AttributeField>) => push(items.map((i) => (i._id === id ? { ...i, ...patch } : i)));

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="rounded-btn bg-bg-2 p-4 text-sm text-muted">No fields yet. Add fields like “Year”, “Bedrooms” or “Transmission”.</p>}
      <SortableList
        items={items}
        getId={(i) => i._id}
        onReorder={push}
        renderItem={(f) => {
          const expanded = open === f._id;
          return (
            <div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setOpen(expanded ? null : f._id)} className="flex min-h-9 flex-1 cursor-pointer items-center gap-2 text-left" aria-expanded={expanded}>
                  <span className="font-semibold text-fg">{f.labelEn || "Untitled field"}</span>
                  <span className="rounded-pill bg-bg-2 px-2 py-0.5 text-[11px] font-bold text-muted">{TYPE_LABEL[f.type]}</span>
                  <span className="font-mono text-xs text-muted">{f.key}</span>
                  {f.filterable && <span className="rounded-pill bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-500 dark:bg-blue-800 dark:text-blue-100">filter</span>}
                  {f.showOnCard && <span className="rounded-pill bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-100">card</span>}
                  {f.required && <span className="text-xs font-bold text-primary">required</span>}
                  <ChevronDown className={cn("ml-auto size-4 text-muted transition-transform", expanded && "rotate-180")} />
                </button>
                <Button variant="ghost" size="icon-xs" aria-label={`Remove ${f.labelEn}`} onClick={() => push(items.filter((i) => i._id !== f._id))} className="text-error">
                  <Trash2 />
                </Button>
              </div>
              {expanded && (
                <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                    Label (English)
                    <Input
                      value={f.labelEn}
                      onChange={(e) => {
                        const labelEn = e.target.value;
                        const autoKey = !f.key || f.key === toKey(f.labelEn);
                        update(f._id, { labelEn, ...(autoKey ? { key: toKey(labelEn) } : {}) });
                      }}
                      className="min-h-10 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                    Label (Amharic)
                    <Input lang="am" value={f.labelAm ?? ""} onChange={(e) => update(f._id, { labelAm: e.target.value })} className="min-h-10 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                    Key (used in URLs and data — avoid changing once listings use it)
                    <Input value={f.key} onChange={(e) => update(f._id, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} className="min-h-10 font-mono text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                    Type
                    <Select value={f.type} onChange={(e) => update(f._id, { type: e.target.value as AttributeType, options: e.target.value === "select" ? (f.options?.length ? f.options : [{ value: "option1", labelEn: "Option 1" }]) : undefined })} className="min-h-10 text-sm">
                      {ATTRIBUTE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  {(f.type === "number" || f.type === "text") && (
                    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                      Unit (optional)
                      <Input value={f.unit ?? ""} placeholder="km, m², months…" onChange={(e) => update(f._id, { unit: e.target.value })} className="min-h-10 text-sm" />
                    </label>
                  )}
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                    {(
                      [
                        ["filterable", "Filterable on the browse page"],
                        ["showOnCard", "Show on listing cards"],
                        ["required", "Required"],
                      ] as const
                    ).map(([k, label]) => (
                      <label key={k} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-fg">
                        <Checkbox checked={!!f[k]} onChange={(e) => update(f._id, { [k]: e.target.checked })} /> {label}
                      </label>
                    ))}
                  </div>
                  {f.type === "select" && (
                    <OptionsEditor options={f.options ?? []} onChange={(options) => update(f._id, { options })} />
                  )}
                </div>
              )}
            </div>
          );
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="border-line"
        onClick={() => {
          const d: Draft = { _id: uid(), key: "", labelEn: "", labelAm: "", type: "text", filterable: false, showOnCard: false, required: false };
          push([...items, d]);
          setOpen(d._id);
        }}
      >
        <Plus /> Add field
      </Button>
      {errors?.length ? (
        <ul className="space-y-1 text-sm text-error" role="alert">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: NonNullable<AttributeField["options"]>; onChange: (o: NonNullable<AttributeField["options"]>) => void }) {
  return (
    <div className="space-y-2 rounded-btn bg-bg-2 p-3 sm:col-span-2">
      <p className="text-xs font-bold text-muted uppercase">Dropdown options</p>
      {options.map((o, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <Input aria-label="Option label (English)" placeholder="Label (EN)" value={o.labelEn} onChange={(e) => onChange(options.map((x, j) => (j === i ? { ...x, labelEn: e.target.value, value: x.value && x.value !== toKey(x.labelEn) ? x.value : toKey(e.target.value) || x.value } : x)))} className="min-h-9 text-sm" />
          <Input aria-label="Option label (Amharic)" lang="am" placeholder="Label (AM)" value={o.labelAm ?? ""} onChange={(e) => onChange(options.map((x, j) => (j === i ? { ...x, labelAm: e.target.value } : x)))} className="min-h-9 text-sm" />
          <Input aria-label="Option value" placeholder="value" value={o.value} onChange={(e) => onChange(options.map((x, j) => (j === i ? { ...x, value: e.target.value.replace(/\s/g, "-").toLowerCase() } : x)))} className="min-h-9 font-mono text-sm" />
          <Button variant="ghost" size="icon-xs" aria-label="Remove option" onClick={() => onChange(options.filter((_, j) => j !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <Button variant="link" size="xs" onClick={() => onChange([...options, { value: `option${options.length + 1}`, labelEn: `Option ${options.length + 1}`, labelAm: "" }])}>
        + Add option
      </Button>
    </div>
  );
}
