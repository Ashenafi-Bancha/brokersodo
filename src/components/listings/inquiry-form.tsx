"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Honeypot, Input, Textarea } from "@/components/ui/form-controls";
import { inquirySchema, type InquiryInput } from "@/lib/validators/public-forms";
import { createInquiryAction } from "@/server/actions/public";
import { useFormError } from "@/components/forms/use-form-error";
import { CONTACT_METHODS } from "@/lib/validators/common";
import { cn } from "@/lib/utils";

export function InquiryForm({ listingId, refCode, idPrefix = "inq" }: { listingId?: string; refCode?: string; idPrefix?: string }) {
  const t = useTranslations("form");
  const ti = useTranslations("inquiry");
  const err = useFormError();
  const [done, setDone] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const form = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { listingId, name: "", phone: "", message: "", preferredContact: "CALL", source: listingId ? "listing" : "home", website: "" },
  });
  const { register, handleSubmit, formState, setError, watch, setValue, reset } = form;
  const preferred = watch("preferredContact");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await createInquiryAction(values);
    if (res.ok) {
      setDone(true);
      return;
    }
    if (res.fieldErrors) {
      for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) setError(k as keyof InquiryInput, { message: v[0] });
    }
    setServerError(err(res.error) ?? t("errors.generic"));
  });

  if (done) {
    return (
      <div
        className="flex animate-[bs-pop_0.35s_ease-out] flex-col items-center gap-3 rounded-card bg-[#DCFCE7] p-6 text-center dark:bg-sold/20"
        role="status"
      >
        <CheckCircle2 className="size-10 text-sold" />
        <p className="text-lg font-bold text-fg">{ti("successTitle")}</p>
        <p className="text-sm text-fg-2">{refCode ? ti("successBody", { ref: refCode }) : ti("successBodyGeneric")}</p>
        <Button
          variant="link"
          onClick={() => {
            reset();
            setDone(false);
          }}
        >
          {ti("again")}
        </Button>
      </div>
    );
  }

  const id = (f: string) => `${idPrefix}-${f}`;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <Field id={id("name")} label={t("name")} required error={err(formState.errors.name?.message)}>
        <Input id={id("name")} autoComplete="name" aria-invalid={!!formState.errors.name} {...register("name")} />
      </Field>
      <Field id={id("phone")} label={t("phone")} required hint={t("phoneHint")} error={err(formState.errors.phone?.message)}>
        <Input
          id={id("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09…"
          aria-invalid={!!formState.errors.phone}
          aria-describedby={formState.errors.phone ? `${id("phone")}-error` : `${id("phone")}-hint`}
          {...register("phone")}
        />
      </Field>
      <Field id={id("message")} label={t("message")} optionalLabel={t("optional")} error={err(formState.errors.message?.message)}>
        <Textarea id={id("message")} rows={3} placeholder={t("messagePlaceholder")} {...register("message")} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-fg">{t("preferredContact")}</legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={preferred === m}
              onClick={() => setValue("preferredContact", m)}
              className={cn(
                "min-h-[38px] cursor-pointer rounded-pill border-[1.5px] px-4 text-sm font-semibold transition-colors",
                preferred === m ? "border-yellow-500 bg-yellow-500 text-navy-900" : "border-line-strong text-fg hover:border-fg",
              )}
            >
              {t(`contact.${m}`)}
            </button>
          ))}
        </div>
      </fieldset>
      {serverError && (
        <p role="alert" className="rounded-btn bg-red-50 px-3 py-2 text-sm font-medium text-error dark:bg-error/20 dark:text-red-200">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={formState.isSubmitting} block>
        {formState.isSubmitting ? (
          <>
            <Loader2 className="animate-spin" /> {t("sending")}
          </>
        ) : (
          t("submit")
        )}
      </Button>
      <p className="text-center text-xs text-muted">{t("privacy")}</p>
    </form>
  );
}
