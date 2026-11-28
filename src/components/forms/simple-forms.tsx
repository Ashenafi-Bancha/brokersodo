"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/form-controls";
import { useFormError } from "./use-form-error";
import { contactSchema, wantedResponseSchema, wantedSchema, type ContactInput, type WantedInput, type WantedResponseInput } from "@/lib/validators/public-forms";
import { CONTACT_METHODS } from "@/lib/validators/common";
import { createContactMessageAction, createWantedAction, createWantedResponseAction } from "@/server/actions/public";
import { cn } from "@/lib/utils";

export function Success({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-card bg-[#DCFCE7] p-8 text-center dark:bg-sold/20">
      <CheckCircle2 className="size-12 text-sold" />
      <p className="text-xl font-bold text-fg">{title}</p>
      <p className="text-fg-2">{body}</p>
    </div>
  );
}

export function ServerError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p role="alert" className="rounded-btn bg-red-50 px-3 py-2 text-sm font-medium text-error dark:bg-error/20 dark:text-red-200">
      {msg}
    </p>
  );
}

export function WantedForm({ categories, areas }: { categories: { id: string; name: string }[]; areas: { id: string; name: string }[] }) {
  const t = useTranslations("wanted");
  const tf = useTranslations("form");
  const ts = useTranslations("sell");
  const tb = useTranslations("browse");
  const err = useFormError();
  const [done, setDone] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState, setError, watch, setValue } = useForm<WantedInput>({
    resolver: zodResolver(wantedSchema),
    defaultValues: { name: "", phone: "", categoryId: "", dealType: "SALE", description: "", budgetMin: "", budgetMax: "", areaId: "", website: "" },
  });
  const deal = watch("dealType");
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await createWantedAction(values);
    if (res.ok) return setDone(true);
    if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) setError(k as keyof WantedInput, { message: v[0] });
    setServerError(err(res.error) ?? tf("errors.generic"));
  });
  if (done) return <Success title={t("successTitle")} body={t("successBody")} />;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card sm:p-8">
      <Honeypot {...register("website")} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-fg">{t("dealType")}</legend>
        <div className="inline-flex gap-1 rounded-pill bg-yellow-500 p-1">
          {(["SALE", "RENT"] as const).map((d) => (
            <button key={d} type="button" aria-pressed={deal === d} onClick={() => setValue("dealType", d)} className={cn("min-h-10 cursor-pointer rounded-pill px-6 font-bold", deal === d ? "bg-red-500 text-white" : "text-navy-900 hover:bg-yellow-400")}>
              {d === "SALE" ? tb("buy") : tb("rent")}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="w-cat" label={t("category")}>
          <Select id="w-cat" {...register("categoryId")}>
            <option value="">{t("anyCategory")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="w-area" label={ts("area")} optionalLabel={tf("optional")}>
          <Select id="w-area" {...register("areaId")}>
            <option value="">—</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="w-desc" label={t("description")} required error={err(e.description?.message)}>
        <Textarea id="w-desc" rows={4} placeholder={t("descriptionPlaceholder")} aria-invalid={!!e.description} {...register("description")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="w-min" label={t("budgetMin")} optionalLabel={tf("optional")} error={err(e.budgetMin?.message)}>
          <Input id="w-min" inputMode="numeric" {...register("budgetMin")} />
        </Field>
        <Field id="w-max" label={t("budgetMax")} optionalLabel={tf("optional")} error={err(e.budgetMax?.message)}>
          <Input id="w-max" inputMode="numeric" {...register("budgetMax")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="w-name" label={tf("name")} required error={err(e.name?.message)}>
          <Input id="w-name" autoComplete="name" aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="w-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
          <Input id="w-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!e.phone} {...register("phone")} />
        </Field>
      </div>
      <ServerError msg={serverError} />
      <Button type="submit" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("submit")}
      </Button>
    </form>
  );
}

export function ContactForm() {
  const tf = useTranslations("form");
  const ti = useTranslations("inquiry");
  const err = useFormError();
  const [done, setDone] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState, setError, watch, setValue } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", phone: "", message: "", preferredContact: "CALL", website: "" },
  });
  const pref = watch("preferredContact");
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await createContactMessageAction(values);
    if (res.ok) return setDone(true);
    if (res.fieldErrors) for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) setError(k as keyof ContactInput, { message: v[0] });
    setServerError(err(res.error) ?? tf("errors.generic"));
  });
  if (done) return <Success title={ti("successTitle")} body={ti("successBodyGeneric")} />;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="c-name" label={tf("name")} required error={err(e.name?.message)}>
          <Input id="c-name" autoComplete="name" aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="c-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
          <Input id="c-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!e.phone} {...register("phone")} />
        </Field>
      </div>
      <Field id="c-msg" label={tf("message")} required error={err(e.message?.message)}>
        <Textarea id="c-msg" rows={4} aria-invalid={!!e.message} {...register("message")} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-fg">{tf("preferredContact")}</legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT_METHODS.map((m) => (
            <button key={m} type="button" aria-pressed={pref === m} onClick={() => setValue("preferredContact", m)} className={cn("min-h-[38px] cursor-pointer rounded-pill border-[1.5px] px-4 text-sm font-semibold", pref === m ? "border-yellow-500 bg-yellow-500 text-navy-900" : "border-line-strong text-fg")}>
              {tf(`contact.${m}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <ServerError msg={serverError} />
      <Button type="submit" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {tf("submit")}
      </Button>
    </form>
  );
}

/** "I have this": an owner answers a public Wanted post. Goes to BrokerSodo staff. */
export function WantedResponseForm({ wantedId }: { wantedId: string }) {
  const t = useTranslations("wanted");
  const tf = useTranslations("form");
  const err = useFormError();
  const form = useForm<WantedResponseInput>({ resolver: zodResolver(wantedResponseSchema), defaultValues: { wantedId, name: "", phone: "", message: "", website: "" } });
  const { register, formState } = form;
  const [done, setDone] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const r = await createWantedResponseAction(values);
    if (r.ok) setDone(true);
    else setServerError(err(r.error) ?? tf("errors.generic"));
  });
  if (done) return <Success title={t("responseDoneTitle")} body={t("responseDoneBody")} />;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="relative mt-3 flex flex-col gap-3">
      <Honeypot {...register("website")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`wr-name-${wantedId}`} label={tf("name")} required error={err(e.name?.message)}>
          <Input id={`wr-name-${wantedId}`} autoComplete="name" {...register("name")} />
        </Field>
        <Field id={`wr-phone-${wantedId}`} label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
          <Input id={`wr-phone-${wantedId}`} type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
        </Field>
      </div>
      <Field id={`wr-msg-${wantedId}`} label={t("responseMessage")} optionalLabel={tf("optional")}>
        <Textarea id={`wr-msg-${wantedId}`} rows={2} placeholder={t("responsePlaceholder")} {...register("message")} />
      </Field>
      <ServerError msg={serverError} />
      <Button type="submit" size="sm" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("responseSubmit")}
      </Button>
    </form>
  );
}
