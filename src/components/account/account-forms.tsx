"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/form-controls";
import { PasswordInput } from "@/components/ui/password-input";
import { ServerError, Success } from "@/components/forms/simple-forms";
import { ConsentBox, useSubmit } from "@/components/forms/form-kit";
import { useFormError } from "@/components/forms/use-form-error";
import {
  accountNameSchema,
  changePasswordSchema,
  companySchema,
  signInSchema,
  signUpSchema,
  type ChangePasswordInput,
  type CompanyInput,
  type SignInInput,
  type SignUpInput,
} from "@/lib/validators/member";
import { useCatalogList } from "@/lib/use-catalog";
import { changePasswordAction, signInAction, signUpAction, updateAccountNameAction } from "@/server/actions/member-auth";
import {
  cancelMyTutorRequestAction,
  closeMyJobAction,
  deleteMyCvAction,
  myJobStateAction,
  respondToTutorRequestAction,
  saveMyCompanyAction,
  setMyApplicantStatusAction,
  toggleSavedJobAction,
  uploadMyCvAction,
  withdrawMyApplicationAction,
} from "@/server/actions/member";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

/** After sign-in/up: a full navigation so every server component sees the new session. */
function goTo(next: string) {
  window.location.assign(next);
}

export function SignInForm({ next, signUpHref }: { next: string; signUpHref: string }) {
  const t = useTranslations("account");
  const tf = useTranslations("form");
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { phone: "", password: "" } });
  const { register, formState } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, signInAction);
  React.useEffect(() => {
    if (done) goTo(next);
  }, [done, next]);
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field id="si-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
        <Input id="si-phone" type="tel" inputMode="tel" autoComplete="username" aria-invalid={!!e.phone} {...register("phone")} />
      </Field>
      <Field id="si-pw" label={t("password")} required error={err(e.password?.message)}>
        <PasswordInput id="si-pw" autoComplete="current-password" aria-invalid={!!e.password} {...register("password")} />
      </Field>
      <ServerError msg={serverError} />
      <Button type="submit" size="lg" block disabled={formState.isSubmitting || !!done}>
        {(formState.isSubmitting || done) && <Loader2 className="animate-spin" />} {t("signIn")}
      </Button>
      <p className="text-center text-sm text-fg-2">
        {t("noAccount")}{" "}
        <a href={signUpHref} className="font-bold text-primary hover:underline">
          {t("createAccount")}
        </a>
      </p>
      <p className="text-center text-xs text-muted">{t("forgotHint")}</p>
    </form>
  );
}

export function SignUpForm({ next, signInHref, termsHref }: { next: string; signInHref: string; termsHref: string }) {
  const t = useTranslations("account");
  const tf = useTranslations("form");
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", phone: "", password: "", confirm: "", terms: false, website: "" },
  });
  const { register, formState } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, signUpAction);
  React.useEffect(() => {
    if (done) goTo(next);
  }, [done, next]);
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <Field id="su-name" label={tf("name")} required error={err(e.name?.message)}>
        <Input id="su-name" autoComplete="name" aria-invalid={!!e.name} {...register("name")} />
      </Field>
      <Field id="su-phone" label={tf("phone")} required hint={t("phoneLoginHint")} error={err(e.phone?.message)}>
        <Input id="su-phone" type="tel" inputMode="tel" autoComplete="username" aria-invalid={!!e.phone} {...register("phone")} />
      </Field>
      <Field id="su-pw" label={t("password")} required hint={t("passwordHint")} error={err(e.password?.message)}>
        <PasswordInput id="su-pw" autoComplete="new-password" aria-invalid={!!e.password} {...register("password")} />
      </Field>
      <Field id="su-confirm" label={t("confirmPassword")} required error={err(e.confirm?.message)}>
        <PasswordInput id="su-confirm" autoComplete="new-password" aria-invalid={!!e.confirm} {...register("confirm")} />
      </Field>
      <ConsentBox
        id="su-terms"
        label={
          <>
            {t("termsLabel")}{" "}
            <a href={termsHref} target="_blank" className="font-semibold text-primary underline">
              {t("termsLink")}
            </a>
          </>
        }
        error={err(e.terms?.message)}
        {...register("terms")}
      />
      <ServerError msg={serverError} />
      <Button type="submit" size="lg" block disabled={formState.isSubmitting || !!done}>
        {(formState.isSubmitting || done) && <Loader2 className="animate-spin" />} {t("createAccount")}
      </Button>
      <p className="text-center text-sm text-fg-2">
        {t("haveAccount")}{" "}
        <a href={signInHref} className="font-bold text-primary hover:underline">
          {t("signIn")}
        </a>
      </p>
    </form>
  );
}

export function NameForm({ name }: { name: string }) {
  const t = useTranslations("account");
  const tf = useTranslations("form");
  const router = useRouter();
  const form = useForm<{ name: string }>({ resolver: zodResolver(accountNameSchema), defaultValues: { name } });
  const { onSubmit, done, serverError, err } = useSubmit(form, updateAccountNameAction);
  React.useEffect(() => {
    if (done) router.refresh();
  }, [done, router]);
  const e = form.formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field id="ac-name" label={tf("name")} error={err(e.name?.message)} className="flex-1">
        <Input id="ac-name" autoComplete="name" {...form.register("name")} />
      </Field>
      <Button type="submit" variant="secondary" disabled={form.formState.isSubmitting}>
        {done ? t("saved") : tf("saveChanges")}
      </Button>
      <ServerError msg={serverError} />
    </form>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations("account");
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { current: "", password: "", confirm: "" } });
  const { register, formState } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, changePasswordAction);
  if (done) return <Success title={t("passwordChangedTitle")} body={t("passwordChangedBody")} />;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field id="cp-current" label={t("currentPassword")} required error={err(e.current?.message)}>
        <PasswordInput id="cp-current" autoComplete="current-password" {...register("current")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cp-new" label={t("newPassword")} required hint={t("passwordHint")} error={err(e.password?.message)}>
          <PasswordInput id="cp-new" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field id="cp-confirm" label={t("confirmPassword")} required error={err(e.confirm?.message)}>
          <PasswordInput id="cp-confirm" autoComplete="new-password" {...register("confirm")} />
        </Field>
      </div>
      <ServerError msg={serverError} />
      <Button type="submit" variant="secondary" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("changePassword")}
      </Button>
    </form>
  );
}

export function CompanyForm({ areas, initial }: { areas: Opt[]; initial?: Partial<CompanyInput> }) {
  const t = useTranslations("account");
  const tf = useTranslations("form");
  const tc = useTranslations("catalog");
  const sectors = useCatalogList("sector");
  const router = useRouter();
  const form = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "", sector: "" as CompanyInput["sector"], about: "", website: "", areaId: "", ...initial },
  });
  const { register, formState } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, saveMyCompanyAction);
  React.useEffect(() => {
    if (done) router.refresh();
  }, [done, router]);
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="co-name" label={t("companyName")} required error={err(e.name?.message)}>
          <Input id="co-name" autoComplete="organization" aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="co-sector" label={t("companySector")} required error={err(e.sector?.message)}>
          <Select id="co-sector" aria-invalid={!!e.sector} {...register("sector")}>
            <option value="">—</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {tc(`sector.${s}` as "sector.OTHER")}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="co-area" label={t("companyArea")} optionalLabel={tf("optional")}>
          <Select id="co-area" {...register("areaId")}>
            <option value="">—</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="co-web" label={t("companyWebsite")} optionalLabel={tf("optional")}>
          <Input id="co-web" inputMode="url" placeholder="facebook.com/…" {...register("website")} />
        </Field>
      </div>
      <Field id="co-about" label={t("companyAbout")} optionalLabel={tf("optional")}>
        <Textarea id="co-about" rows={3} {...register("about")} />
      </Field>
      <ServerError msg={serverError} />
      <Button type="submit" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {done ? t("saved") : tf("saveChanges")}
      </Button>
    </form>
  );
}

/* ---------------- Small dashboard actions ---------------- */

type Res = { ok: boolean; error?: string };

function useRun() {
  const router = useRouter();
  const err = useFormError();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const run = (fn: () => Promise<Res>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(err(r.error) ?? "Error");
    });
  return { run, pending, error };
}

export function ActionButton({
  label,
  action,
  variant = "outline",
  confirmText,
}: {
  label: string;
  action: () => Promise<Res>;
  variant?: "outline" | "primary" | "secondary" | "ghost";
  confirmText?: string;
}) {
  const { run, pending, error } = useRun();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        size="sm"
        variant={variant}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          run(action);
        }}
      >
        {pending && <Loader2 className="animate-spin" />} {label}
      </Button>
      {error && <span className="text-xs text-error">{error}</span>}
    </span>
  );
}

export const respondTo = (id: string, answer: "ACCEPTED" | "DECLINED") => () => respondToTutorRequestAction(id, answer);
export const cancelRequest = (id: string) => () => cancelMyTutorRequestAction(id);
export const withdrawApplication = (id: string) => () => withdrawMyApplicationAction(id);
export const closeJob = (id: string) => () => closeMyJobAction(id);

export function TutorRequestAnswer({ id }: { id: string }) {
  const t = useTranslations("account");
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton label={t("accept")} variant="primary" action={respondTo(id, "ACCEPTED")} />
      <ActionButton label={t("decline")} action={respondTo(id, "DECLINED")} />
    </div>
  );
}

export function CancelRequestButton({ id }: { id: string }) {
  const t = useTranslations("account");
  return <ActionButton label={t("cancelRequest")} action={cancelRequest(id)} confirmText={t("cancelRequestConfirm")} />;
}

export function WithdrawButton({ id }: { id: string }) {
  const t = useTranslations("account");
  return <ActionButton label={t("withdraw")} action={withdrawApplication(id)} confirmText={t("withdrawConfirm")} />;
}

export function CloseJobButton({ id }: { id: string }) {
  const t = useTranslations("account");
  return <ActionButton label={t("closeJob")} action={closeJob(id)} confirmText={t("closeJobConfirm")} />;
}

export function ApplicantStatusSelect({ id, status, options }: { id: string; status: string; options: { value: string; label: string }[] }) {
  const t = useTranslations("account");
  const { run, pending, error } = useRun();
  return (
    <span className="inline-flex flex-col gap-1">
      <Select
        aria-label={t("applicantStatus")}
        className="min-h-10 text-sm"
        value={status}
        disabled={pending || status === "WITHDRAWN"}
        onChange={(e) => run(() => setMyApplicantStatusAction(id, e.target.value))}
      >
        {!options.some((o) => o.value === status) && <option value={status}>{status}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {error && <span className="text-xs text-error">{error}</span>}
    </span>
  );
}

/** Save button on a job page. Visitors who are not signed in are sent to sign in first. */
export function SaveJobButton({ jobId, signInHref }: { jobId: string; signInHref: string }) {
  const t = useTranslations("account");
  const [saved, setSaved] = React.useState(false);
  const [pending, start] = React.useTransition();
  React.useEffect(() => {
    let live = true;
    myJobStateAction(jobId)
      .then((s) => live && setSaved(s.saved))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [jobId]);
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={saved}
      disabled={pending}
      className={cn(saved && "border-yellow-500 bg-yellow-50")}
      onClick={() =>
        start(async () => {
          const r = await toggleSavedJobAction(jobId);
          if (r.ok) setSaved(!!r.data?.saved);
          else if (r.error === "signIn") window.location.assign(signInHref);
        })
      }
    >
      {saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />} {saved ? t("savedJob") : t("saveJob")}
    </Button>
  );
}

/** Upload, replace, view or remove the CV on your talent profile. */
export function CvUpload({ cv }: { cv: { id: string; fileName: string; size: number } | null }) {
  const t = useTranslations("account");
  const err = useFormError();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const upload = (file: File) =>
    start(async () => {
      setError(null);
      if (file.size > 3 * 1024 * 1024) return setError(err("cvTooBig") ?? "");
      const fd = new FormData();
      fd.set("cv", file);
      const r = await uploadMyCvAction(fd);
      if (r.ok) router.refresh();
      else setError(err(r.error) ?? r.error);
      if (input.current) input.current.value = "";
    });
  return (
    <div className="flex flex-col gap-3">
      {cv ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <FileText className="size-5 text-primary" aria-hidden />
          <a href={`/api/cv/${cv.id}`} target="_blank" rel="noopener" className="font-semibold text-fg underline-offset-2 hover:underline">
            {cv.fileName}
          </a>
          <span className="text-muted">{Math.max(1, Math.round(cv.size / 1024))} KB</span>
        </p>
      ) : (
        <p className="text-sm text-fg-2">{t("cvNone")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          id="cv-file"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? <Loader2 className="animate-spin" /> : <Upload />} {cv ? t("cvReplace") : t("cvUpload")}
        </Button>
        {cv && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(t("cvDeleteConfirm"))) return;
              start(async () => {
                await deleteMyCvAction();
                router.refresh();
              });
            }}
          >
            <Trash2 /> {t("cvDelete")}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">{t("cvHint")}</p>
      {error && (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
