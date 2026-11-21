"use client";
import { useLocale } from "next-intl";
import { Checkbox, Field, Input, Select } from "@/components/ui/form-controls";
import { fieldLabel, type AttributeField, type AttributeValue } from "@/lib/validators/attribute-schema";

/**
 * Renders inputs from a category's attributeSchema.
 * Used by the public /sell form and the admin listing editor.
 */
export function AttributeFields({
  fields,
  values,
  onChange,
  errors,
  idPrefix = "attr",
  optionalLabel,
  anyLabel = "—",
  locale: forcedLocale,
}: {
  fields: AttributeField[];
  values: Record<string, AttributeValue | undefined>;
  onChange: (key: string, value: AttributeValue | undefined) => void;
  errors?: Record<string, string[] | undefined>;
  idPrefix?: string;
  optionalLabel?: string;
  anyLabel?: string;
  locale?: string;
}) {
  const ctxLocale = useLocale();
  const locale = forcedLocale ?? ctxLocale;
  if (fields.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const label = `${fieldLabel(f, locale)}${f.unit ? ` (${f.unit})` : ""}`;
        const err = errors?.[f.key]?.[0];
        const v = values[f.key];
        if (f.type === "boolean") {
          return (
            <label key={f.key} className="flex min-h-12 cursor-pointer items-center gap-3 self-end rounded-btn border-[1.5px] border-line-strong px-3.5 font-semibold text-fg">
              <Checkbox checked={v === true} onChange={(e) => onChange(f.key, e.target.checked)} />
              {label}
            </label>
          );
        }
        return (
          <Field key={f.key} id={id} label={label} required={f.required} optionalLabel={f.required ? undefined : optionalLabel} error={err}>
            {f.type === "select" ? (
              <Select id={id} value={v === undefined ? "" : String(v)} onChange={(e) => onChange(f.key, e.target.value || undefined)} aria-invalid={!!err}>
                <option value="">{anyLabel}</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {(locale === "am" && o.labelAm) || o.labelEn}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id={id}
                type={f.type === "text" ? "text" : "number"}
                inputMode={f.type === "text" ? undefined : "numeric"}
                min={f.type === "year" ? 1900 : f.type === "number" ? 0 : undefined}
                max={f.type === "year" ? new Date().getFullYear() + 1 : undefined}
                value={v === undefined ? "" : String(v)}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChange(f.key, raw === "" ? undefined : f.type === "text" ? raw : Number(raw));
                }}
                aria-invalid={!!err}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
