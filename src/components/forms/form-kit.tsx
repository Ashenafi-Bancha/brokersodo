"use client";
import * as React from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { useFormError } from "./use-form-error";
import { cn } from "@/lib/utils";

type Result = { ok: true; data?: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/** Submit a public form to a server action; maps field errors back into the form. */
export function useSubmit<T extends FieldValues, D = unknown>(form: UseFormReturn<T>, action: (v: unknown) => Promise<Result>) {
  const tf = useTranslations("form");
  const err = useFormError();
  const [done, setDone] = React.useState<{ data?: D } | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const res = await action(values);
    if (res.ok) {
      setDone({ data: res.data as D | undefined });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (res.fieldErrors)
      for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) form.setError(k as Path<T>, { message: v[0] });
    setServerError(err(res.error) ?? tf("errors.generic"));
  });
  return { onSubmit, done, serverError, err };
}

/** Pill buttons that act as radio buttons (single) or checkboxes (multiple). */
export function ChipGroup({
  legend,
  options,
  value,
  onChange,
  multiple,
  hint,
  error,
  required,
}: {
  legend: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multiple?: boolean;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const toggle = (v: string) => {
    if (!multiple) return onChange(v);
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(options.map((o) => o.value).filter((o) => next.has(o)));
  };
  return (
    <fieldset aria-invalid={!!error || undefined}>
      <legend className="mb-1 text-sm font-semibold text-fg">
        {legend}
        {required && (
          <span aria-hidden className="ml-0.5 text-primary">
            *
          </span>
        )}
      </legend>
      {hint && <p className="mb-2 text-[13px] text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => toggle(o.value)}
              className={cn(
                "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-pill border-[1.5px] px-4 text-sm font-semibold transition-colors",
                on ? "border-red-500 bg-red-500 text-white" : "border-line-strong text-fg hover:border-fg",
              )}
            >
              {on && multiple ? <Check className="size-4" aria-hidden /> : o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function ConsentBox({ id, label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: React.ReactNode; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-btn bg-bg-2 p-3 text-sm text-fg">
        <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--primary)]" aria-invalid={!!error} {...props} />
        <span>{label}</span>
      </label>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-line pb-2 text-lg font-bold text-fg">{title}</h2>
      {children}
    </section>
  );
}
