"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/form-controls";
import { ServerError, Success } from "./simple-forms";
import { ChipGroup, ConsentBox, FormSection, useSubmit } from "./form-kit";
import { tutorRequestSchema, tutorReviewSchema, tutorSchema, type TutorInput, type TutorRequestInput, type TutorReviewInput } from "@/lib/validators/jobs";
import { EDUCATION_LEVELS, LANGUAGES, TUTOR_LEVELS, TUTOR_MODES, TUTOR_SUBJECTS } from "@/lib/jobs-catalog";
import { createTutorAction, createTutorRequestAction, createTutorReviewAction } from "@/server/actions/jobs-public";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

function useOptions() {
  const tc = useTranslations("catalog");
  return (group: string, list: readonly string[]) => list.map((v) => ({ value: v, label: tc(`${group}.${v}` as "subject.MATHS") }));
}

function OptionSelect({ id, options, placeholder, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Select id={id} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/* ---------------- Tutor joins ---------------- */

export function TutorJoinForm({ areas }: { areas: Opt[] }) {
  const t = useTranslations("tutors");
  const tf = useTranslations("form");
  const options = useOptions();
  const form = useForm<TutorInput>({
    resolver: zodResolver(tutorSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      subjects: [],
      levels: [],
      modes: ["HOME"],
      education: "" as TutorInput["education"],
      field: "",
      experienceYears: "",
      bio: "",
      availability: "",
      hourlyRate: "",
      monthlyRate: "",
      languages: ["AMHARIC"],
      areaId: "",
      consent: false,
      website: "",
    },
  });
  const { register, formState, watch, setValue } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, createTutorAction);
  if (done) return <Success title={t("joinDoneTitle")} body={t("joinDoneBody")} />;
  const e = formState.errors;
  const pick = (k: "subjects" | "levels" | "modes" | "languages") => (v: string | string[]) => setValue(k, v as TutorInput[typeof k], { shouldValidate: formState.isSubmitted });
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-8 rounded-card bg-surface p-5 shadow-card sm:p-8">
      <Honeypot {...register("website")} />
      <FormSection title={t("subjects")}>
        <ChipGroup legend={t("subjectsPick")} hint={t("chooseHint")} required multiple options={options("subject", TUTOR_SUBJECTS)} value={watch("subjects") ?? []} onChange={pick("subjects")} error={err(e.subjects?.message)} />
        <ChipGroup legend={t("levelsPick")} hint={t("chooseHint")} required multiple options={options("level", TUTOR_LEVELS)} value={watch("levels") ?? []} onChange={pick("levels")} error={err(e.levels?.message)} />
        <ChipGroup legend={t("modesPick")} required multiple options={options("mode", TUTOR_MODES)} value={watch("modes") ?? []} onChange={pick("modes")} error={err(e.modes?.message)} />
        <ChipGroup legend={t("languagesPick")} multiple options={options("language", LANGUAGES)} value={watch("languages") ?? []} onChange={pick("languages")} />
      </FormSection>
      <FormSection title={t("educationLabel")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="tj-edu" label={t("education")} required error={err(e.education?.message)}>
            <OptionSelect id="tj-edu" options={options("education", EDUCATION_LEVELS)} placeholder="—" aria-invalid={!!e.education} {...register("education")} />
          </Field>
          <Field id="tj-field" label={t("field")} optionalLabel={tf("optional")}>
            <Input id="tj-field" placeholder={t("fieldPlaceholder")} {...register("field")} />
          </Field>
          <Field id="tj-exp" label={t("experienceYears")} error={err(e.experienceYears?.message)}>
            <Input id="tj-exp" inputMode="numeric" placeholder="0" {...register("experienceYears")} />
          </Field>
          <Field id="tj-rate" label={t("hourlyRate")} optionalLabel={tf("optional")} error={err(e.hourlyRate?.message)}>
            <Input id="tj-rate" inputMode="numeric" {...register("hourlyRate")} />
          </Field>
          <Field id="tj-mrate" label={t("monthlyRate")} optionalLabel={tf("optional")} error={err(e.monthlyRate?.message)}>
            <Input id="tj-mrate" inputMode="numeric" {...register("monthlyRate")} />
          </Field>
          <Field id="tj-area" label={t("area")} optionalLabel={tf("optional")}>
            <OptionSelect id="tj-area" options={areas.map((a) => ({ value: a.id, label: a.name }))} placeholder="—" {...register("areaId")} />
          </Field>
          <Field id="tj-avail" label={t("availabilityField")} optionalLabel={tf("optional")}>
            <Input id="tj-avail" placeholder={t("availabilityPlaceholder")} {...register("availability")} />
          </Field>
        </div>
        <Field id="tj-bio" label={t("bio")} required error={err(e.bio?.message)}>
          <Textarea id="tj-bio" rows={5} placeholder={t("bioPlaceholder")} aria-invalid={!!e.bio} {...register("bio")} />
        </Field>
      </FormSection>
      <FormSection title={tf("phone")}>
        <p className="flex items-center gap-2 rounded-btn bg-bg-2 px-3 py-2 text-sm font-medium text-fg-2">
          <Lock className="size-4 shrink-0 text-primary" aria-hidden /> {t("phoneHint")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="tj-name" label={t("fullName")} required hint={t("fullNameHint")} error={err(e.fullName?.message)}>
            <Input id="tj-name" autoComplete="name" aria-invalid={!!e.fullName} {...register("fullName")} />
          </Field>
          <Field id="tj-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
            <Input id="tj-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!e.phone} {...register("phone")} />
          </Field>
        </div>
        <ConsentBox id="tj-consent" label={t("consentTutor")} error={err(e.consent?.message)} {...register("consent")} />
      </FormSection>
      <ServerError msg={serverError} />
      <Button type="submit" size="lg" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("submitJoin")}
      </Button>
    </form>
  );
}

/* ---------------- Family asks for a tutor ---------------- */

export function TutorRequestForm({
  areas,
  tutor,
  defaults,
  compact,
}: {
  areas: Opt[];
  tutor?: { id: string; subjects: string[]; levels: string[]; modes: string[] };
  defaults?: { subject?: string; level?: string; mode?: string; areaId?: string };
  compact?: boolean;
}) {
  const t = useTranslations("tutors");
  const tf = useTranslations("form");
  const options = useOptions();
  // On a tutor's page, only offer what that tutor teaches.
  const subjects = tutor && !tutor.subjects.includes("ALL_SUBJECTS") ? tutor.subjects : TUTOR_SUBJECTS;
  const levels = tutor ? tutor.levels : TUTOR_LEVELS;
  const modes = tutor ? tutor.modes : TUTOR_MODES;
  const form = useForm<TutorRequestInput>({
    resolver: zodResolver(tutorRequestSchema),
    defaultValues: {
      tutorId: tutor?.id ?? "",
      name: "",
      phone: "",
      subject: (defaults?.subject ?? (subjects.length === 1 ? subjects[0] : "")) as TutorRequestInput["subject"],
      level: (defaults?.level ?? (levels.length === 1 ? levels[0] : "")) as TutorRequestInput["level"],
      mode: (defaults?.mode ?? modes[0]) as TutorRequestInput["mode"],
      areaId: defaults?.areaId ?? "",
      schedule: "",
      budget: "",
      message: "",
      website: "",
    },
  });
  const { register, formState, watch, setValue } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, createTutorRequestAction);
  if (done) return <Success title={t("requestDoneTitle")} body={t("requestDoneBody")} />;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className={compact ? "relative flex flex-col gap-4" : "relative flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card sm:p-8"}>
      <Honeypot {...register("website")} />
      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <Field id="tr-subject" label={t("subject")} required error={err(e.subject?.message)}>
          <OptionSelect id="tr-subject" options={options("subject", subjects)} placeholder="—" aria-invalid={!!e.subject} {...register("subject")} />
        </Field>
        <Field id="tr-level" label={t("level")} required error={err(e.level?.message)}>
          <OptionSelect id="tr-level" options={options("level", levels)} placeholder="—" aria-invalid={!!e.level} {...register("level")} />
        </Field>
      </div>
      <ChipGroup
        legend={t("mode")}
        required
        options={options("mode", modes)}
        value={watch("mode")}
        onChange={(v) => setValue("mode", v as TutorRequestInput["mode"], { shouldValidate: true })}
        error={err(e.mode?.message)}
      />
      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <Field id="tr-area" label={t("area")} optionalLabel={tf("optional")}>
          <OptionSelect id="tr-area" options={areas.map((a) => ({ value: a.id, label: a.name }))} placeholder="—" {...register("areaId")} />
        </Field>
        <Field id="tr-budget" label={t("budget")} optionalLabel={tf("optional")} error={err(e.budget?.message)}>
          <Input id="tr-budget" inputMode="numeric" {...register("budget")} />
        </Field>
      </div>
      <Field id="tr-schedule" label={t("schedule")} optionalLabel={tf("optional")}>
        <Input id="tr-schedule" placeholder={t("schedulePlaceholder")} {...register("schedule")} />
      </Field>
      {!compact && (
        <Field id="tr-msg" label={t("message")} optionalLabel={tf("optional")}>
          <Textarea id="tr-msg" rows={3} placeholder={t("messagePlaceholder")} {...register("message")} />
        </Field>
      )}
      <div className={compact ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
        <Field id="tr-name" label={t("parentName")} required error={err(e.name?.message)}>
          <Input id="tr-name" autoComplete="name" aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="tr-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
          <Input id="tr-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!e.phone} {...register("phone")} />
        </Field>
      </div>
      <ServerError msg={serverError} />
      <Button type="submit" block={compact} size={compact ? "default" : "lg"} disabled={formState.isSubmitting} className={compact ? undefined : "self-start"}>
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("submitRequest")}
      </Button>
    </form>
  );
}

/* ---------------- Family reviews a tutor ---------------- */

export function TutorReviewForm({ tutorId }: { tutorId: string }) {
  const t = useTranslations("tutors");
  const tf = useTranslations("form");
  const form = useForm<TutorReviewInput>({
    resolver: zodResolver(tutorReviewSchema),
    defaultValues: { tutorId, name: "", phone: "", rating: 0, comment: "", consent: false, website: "" },
  });
  const { register, formState, watch, setValue } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, createTutorReviewAction);
  if (done) return <Success title={t("reviewDoneTitle")} body={t("reviewDoneBody")} />;
  const e = formState.errors;
  const rating = Number(watch("rating")) || 0;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <fieldset aria-invalid={!!e.rating || undefined}>
        <legend className="mb-1 text-sm font-semibold text-fg">
          {t("yourRating")} <span className="text-primary">*</span>
        </legend>
        <div className="flex gap-1" role="radiogroup" aria-label={t("yourRating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={t("stars", { count: n })}
              onClick={() => setValue("rating", n, { shouldValidate: formState.isSubmitted })}
              className="grid size-11 cursor-pointer place-items-center rounded-btn hover:bg-yellow-50"
            >
              <Star className={cn("size-7", n <= rating ? "fill-yellow-500 text-yellow-500" : "text-line-strong")} aria-hidden />
            </button>
          ))}
        </div>
        {e.rating && <p className="mt-1 text-sm font-semibold text-error">{err(e.rating.message)}</p>}
      </fieldset>
      <Field id="rv-comment" label={t("reviewComment")} required error={err(e.comment?.message)}>
        <Textarea id="rv-comment" rows={4} placeholder={t("reviewPlaceholder")} aria-invalid={!!e.comment} {...register("comment")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="rv-name" label={tf("name")} required hint={t("reviewNameHint")} error={err(e.name?.message)}>
          <Input id="rv-name" autoComplete="name" aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="rv-phone" label={tf("phone")} required hint={t("reviewPhoneHint")} error={err(e.phone?.message)}>
          <Input id="rv-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!e.phone} {...register("phone")} />
        </Field>
      </div>
      <ConsentBox id="rv-consent" label={t("consentReview")} error={err(e.consent?.message)} {...register("consent")} />
      <ServerError msg={serverError} />
      <Button type="submit" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("submitReview")}
      </Button>
    </form>
  );
}
