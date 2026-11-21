import * as React from "react";
import { cn } from "@/lib/utils";

/* Brand kit inputs: 48px, 1.5px line-strong border, navy focus border + soft yellow ring. */
const fieldBase =
  "w-full rounded-btn border-[1.5px] border-line-strong bg-bg text-base text-fg placeholder:text-muted/70 transition-[border-color,box-shadow] outline-none focus:border-[var(--input-focus)] focus:shadow-[0_0_0_3px_var(--color-yellow-100)] dark:focus:shadow-[0_0_0_3px_rgba(255,194,14,.25)] aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, "min-h-12 px-3.5", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-28 px-3.5 py-3 leading-relaxed", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

/** Native select: tiny JS, best UX on phones. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldBase, "min-h-12 cursor-pointer appearance-none pr-10 pl-3.5", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-semibold text-fg", className)} {...props} />;
}

export const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn("size-5 shrink-0 cursor-pointer rounded-[6px] accent-[var(--primary)]", className)}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";

/** Label + control + hint/error wrapper with proper aria wiring. */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  optionalLabel,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-primary">
            *
          </span>
        ) : optionalLabel ? (
          <span className="ml-1 font-normal text-muted">({optionalLabel})</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Honeypot for public forms — hidden from humans and screen readers. */
export function Honeypot(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  );
}
