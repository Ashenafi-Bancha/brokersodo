"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { GraduationCap, Loader2, Lock, Users, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/ui/form-controls";
import { ServerError, Success } from "./simple-forms";
import { ChipGroup, ConsentBox, FormSection, useSubmit } from "./form-kit";
import {
  applicationSchema,
  jobPostSchema,
  seekerSchema,
  talentRequestSchema,
  type ApplicationInput,
  type JobPostInput,
  type SeekerInput,
  type TalentRequestInput,
} from "@/lib/validators/jobs";
import { EDUCATION_LEVELS, JOB_AUDIENCES, JOB_SECTORS, JOB_TYPES, LANGUAGES, SALARY_PERIODS, SEEKER_TYPES, WORK_MODES } from "@/lib/jobs-catalog";
import { applyToJobAction, createJobPostAction, createSeekerAction, createTalentRequestAction } from "@/server/actions/jobs-public";
import { myJobStateAction, postMyJobAction, saveMyTalentAction } from "@/server/actions/member";

type Opt = { id: string; name: string };

const AUDIENCE_ICONS = { ANY: <Users className="size-4" aria-hidden />, GRADUATE: <GraduationCap className="size-4" aria-hidden />, SKILLED: <Wrench className="size-4" aria-hidden /> };

function useCatalog() {
  const tc = useTranslations("catalog");
  const label = (group: string, v: string) => tc(`${group}.${v}` as "sector.OTHER");
  const options = (group: string, list: readonly string[]) => list.map((v) => ({ value: v, label: label(group, v) }));
  return { label, options };
}

function AreaSelect({ id, areas, placeholder, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; areas: Opt[]; placeholder: string }) {
  return (
    <Select id={id} {...props}>
      <option value="">{placeholder}</option>
      {areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </Select>
  );
}

function CatalogSelect({ id, group, list, placeholder, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string; group: string; list: readonly string[]; placeholder?: string }) {
  const { label } = useCatalog();
  return (
    <Select id={id} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {list.map((v) => (
        <option key={v} value={v}>
          {label(group, v)}
        </option>
      ))}
    </Select>
  );
}

/* ---------------- Employer: post a job ---------------- */

/** `member`: posting from an employer dashboard — employer and contact come from the account. */
export function JobPostForm({ areas, member }: { areas: Opt[]; member?: { company: string; name: string; phone: string } }) {
  const t = useTranslations("jobs");
  const tf = useTranslations("form");
  const { options } = useCatalog();
  const form = useForm<JobPostInput>({
    resolver: zodResolver(jobPostSchema),
    defaultValues: {
      title: "",
      employerName: member?.company ?? "",
      showEmployer: true,
      sector: "" as JobPostInput["sector"],
      jobType: "FULL_TIME",
      audience: "ANY",
      education: "NONE",
      minExperience: "",
      vacancies: "1",
      salaryMin: "",
      salaryMax: "",
      salaryPeriod: "MONTH",
      areaId: "",
      description: "",
      requirements: "",
      responsibilities: "",
      skills: "",
      workMode: "ONSITE",
      deadline: "",
      contactName: member?.name ?? "",
      contactPhone: member?.phone ?? "",
      consent: false,
      website: "",
    },
  });
  const { register, formState, watch, setValue } = form;
  const { onSubmit, done, serverError, err } = useSubmit<JobPostInput, { ref: string }>(form, member ? postMyJobAction : createJobPostAction);
  if (done) return <Success title={t("postedTitle")} body={t("postedBody", { ref: done.data?.ref ?? "" })} />;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-8 rounded-card bg-surface p-5 shadow-card sm:p-8">
      <Honeypot {...register("website")} />
      <FormSection title={t("sectionRole")}>
        <Field id="jp-title" label={t("jobTitle")} required error={err(e.title?.message)}>
          <Input id="jp-title" placeholder={t("jobTitlePlaceholder")} aria-invalid={!!e.title} {...register("title")} />
        </Field>
        {member ? (
          <p className="rounded-btn bg-bg-2 px-3 py-2 text-sm text-fg-2">
            {t("employerName")}: <strong className="text-fg">{member.company}</strong>
          </p>
        ) : (
          <Field id="jp-employer" label={t("employerName")} required error={err(e.employerName?.message)}>
            <Input id="jp-employer" autoComplete="organization" aria-invalid={!!e.employerName} {...register("employerName")} />
          </Field>
        )}
        <label className="flex cursor-pointer items-start gap-3 text-sm text-fg">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--primary)]" {...register("showEmployer")} />
          <span>
            <span className="font-semibold">{t("showEmployer")}</span>
            <span className="block text-muted">{t("showEmployerHint")}</span>
          </span>
        </label>
        <ChipGroup
          legend={t("audience")}
          required
          options={JOB_AUDIENCES.map((a) => ({ ...options("audience", [a])[0], icon: AUDIENCE_ICONS[a] }))}
          value={watch("audience")}
          onChange={(v) => setValue("audience", v as JobPostInput["audience"], { shouldValidate: true })}
          error={err(e.audience?.message)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="jp-sector" label={t("sector")} required error={err(e.sector?.message)}>
            <CatalogSelect id="jp-sector" group="sector" list={JOB_SECTORS} placeholder="—" aria-invalid={!!e.sector} {...register("sector")} />
          </Field>
          <Field id="jp-type" label={t("type")} required>
            <CatalogSelect id="jp-type" group="jobType" list={JOB_TYPES} {...register("jobType")} />
          </Field>
          <Field id="jp-mode" label={t("workMode")} required>
            <CatalogSelect id="jp-mode" group="workMode" list={WORK_MODES} {...register("workMode")} />
          </Field>
          <Field id="jp-edu" label={t("educationLabel")} required>
            <CatalogSelect id="jp-edu" group="education" list={EDUCATION_LEVELS} {...register("education")} />
          </Field>
          <Field id="jp-area" label={t("location")} optionalLabel={tf("optional")}>
            <AreaSelect id="jp-area" areas={areas} placeholder="—" {...register("areaId")} />
          </Field>
          <Field id="jp-exp" label={t("minExperience")} optionalLabel={tf("optional")} error={err(e.minExperience?.message)}>
            <Input id="jp-exp" inputMode="numeric" placeholder="0" {...register("minExperience")} />
          </Field>
          <Field id="jp-vac" label={t("vacanciesField")} error={err(e.vacancies?.message)}>
            <Input id="jp-vac" inputMode="numeric" {...register("vacancies")} />
          </Field>
        </div>
        <Field id="jp-desc" label={t("description")} required error={err(e.description?.message)}>
          <Textarea id="jp-desc" rows={6} placeholder={t("descriptionPlaceholder")} aria-invalid={!!e.description} {...register("description")} />
        </Field>
        <Field id="jp-resp" label={t("responsibilitiesField")} optionalLabel={tf("optional")}>
          <Textarea id="jp-resp" rows={4} placeholder={t("responsibilitiesPlaceholder")} {...register("responsibilities")} />
        </Field>
        <Field id="jp-req" label={t("requirementsField")} optionalLabel={tf("optional")}>
          <Textarea id="jp-req" rows={4} placeholder={t("requirementsPlaceholder")} {...register("requirements")} />
        </Field>
        <Field id="jp-skills" label={t("jobSkills")} optionalLabel={tf("optional")} hint={t("skillsHint")}>
          <Input id="jp-skills" placeholder={t("jobSkillsPlaceholder")} {...register("skills")} />
        </Field>
      </FormSection>

      <FormSection title={t("sectionPay")}>
        <p className="-mt-2 text-sm text-muted">{t("salaryHint")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="jp-smin" label={t("salaryMin")} error={err(e.salaryMin?.message)}>
            <Input id="jp-smin" inputMode="numeric" {...register("salaryMin")} />
          </Field>
          <Field id="jp-smax" label={t("salaryMax")} error={err(e.salaryMax?.message)}>
            <Input id="jp-smax" inputMode="numeric" {...register("salaryMax")} />
          </Field>
          <Field id="jp-sper" label={t("salaryPeriod")}>
            <CatalogSelect id="jp-sper" group="salaryPeriodName" list={SALARY_PERIODS} {...register("salaryPeriod")} />
          </Field>
        </div>
        <Field id="jp-deadline" label={t("deadlineField")} hint={t("deadlineHint")} error={err(e.deadline?.message)}>
          <Input id="jp-deadline" type="date" className="max-w-xs" aria-invalid={!!e.deadline} {...register("deadline")} />
        </Field>
      </FormSection>

      <FormSection title={t("sectionContact")}>
        <div className={member ? "hidden" : "grid gap-4 sm:grid-cols-2"}>
          <Field id="jp-cname" label={t("contactName")} required error={err(e.contactName?.message)}>
            <Input id="jp-cname" autoComplete="name" aria-invalid={!!e.contactName} {...register("contactName")} />
          </Field>
          <Field id="jp-cphone" label={t("contactPhone")} required hint={t("contactHint")} error={err(e.contactPhone?.message)}>
            <Input id="jp-cphone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!e.contactPhone} {...register("contactPhone")} />
          </Field>
        </div>
        <ConsentBox id="jp-consent" label={t("consentPost")} error={err(e.consent?.message)} {...register("consent")} />
      </FormSection>

      <ServerError msg={serverError} />
      <Button type="submit" size="lg" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("submitPost")}
      </Button>
    </form>
  );
}

/* ---------------- Job seeker: apply ---------------- */

export function ApplyForm({ jobId }: { jobId: string }) {
  const t = useTranslations("jobs");
  const tf = useTranslations("form");
  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { jobId, name: "", phone: "", education: "" as ApplicationInput["education"], field: "", experience: "", skills: "", message: "", consent: false, website: "" },
  });
  const { register, formState, setValue, getValues } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, applyToJobAction);
  const [applied, setApplied] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    myJobStateAction(jobId)
      .then((s) => {
        if (!live || !s.signedIn) return;
        if (s.applied) setApplied(true);
        if (s.name && !getValues("name")) setValue("name", s.name);
        if (s.phone && !getValues("phone")) setValue("phone", s.phone.replace(/^\+251/, "0"));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [jobId, getValues, setValue]);
  if (done) return <Success title={t("appliedTitle")} body={t("appliedBody")} />;
  if (applied) return <Success title={t("alreadyAppliedTitle")} body={t("alreadyAppliedBody")} />;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <Field id="ap-name" label={tf("name")} required error={err(e.name?.message)}>
        <Input id="ap-name" autoComplete="name" aria-invalid={!!e.name} {...register("name")} />
      </Field>
      <Field id="ap-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
        <Input id="ap-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!e.phone} {...register("phone")} />
      </Field>
      <Field id="ap-edu" label={t("education")} required error={err(e.education?.message)}>
        <CatalogSelect id="ap-edu" group="education" list={EDUCATION_LEVELS} placeholder="—" aria-invalid={!!e.education} {...register("education")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field id="ap-field" label={t("field")} optionalLabel={tf("optional")}>
          <Input id="ap-field" placeholder={t("fieldPlaceholder")} {...register("field")} />
        </Field>
        <Field id="ap-exp" label={t("experienceYears")} error={err(e.experience?.message)}>
          <Input id="ap-exp" inputMode="numeric" placeholder="0" {...register("experience")} />
        </Field>
      </div>
      <Field id="ap-skills" label={t("skills")} optionalLabel={tf("optional")}>
        <Input id="ap-skills" placeholder={t("skillsPlaceholder")} {...register("skills")} />
      </Field>
      <Field id="ap-msg" label={t("message")} optionalLabel={tf("optional")}>
        <Textarea id="ap-msg" rows={3} placeholder={t("messagePlaceholder")} {...register("message")} />
      </Field>
      <ConsentBox id="ap-consent" label={t("consentApply")} error={err(e.consent?.message)} {...register("consent")} />
      <ServerError msg={serverError} />
      <Button type="submit" block disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("submitApply")}
      </Button>
    </form>
  );
}

/* ---------------- Talent pool ---------------- */

/** `member`: editing your own talent profile from your account; `initial` fills the form. */
export function SeekerForm({ areas, defaultType, member, initial }: { areas: Opt[]; defaultType?: "GRADUATE" | "SKILLED"; member?: { phone: string }; initial?: Partial<SeekerInput> }) {
  const t = useTranslations("jobs");
  const tf = useTranslations("form");
  const { options } = useCatalog();
  const form = useForm<SeekerInput>({
    resolver: zodResolver(seekerSchema),
    defaultValues: {
      name: "",
      phone: "",
      seekerType: defaultType ?? "GRADUATE",
      profession: "",
      sector: "" as SeekerInput["sector"],
      education: "" as SeekerInput["education"],
      field: "",
      graduationYear: "",
      experience: "",
      skills: "",
      about: "",
      languages: [],
      certifications: "",
      projects: "",
      portfolioUrl: "",
      availability: "",
      makePublic: false,
      areaId: "",
      consent: false,
      website: "",
      ...(member ? { phone: member.phone.replace(/^\+251/, "0") } : {}),
      ...initial,
    },
  });
  const { register, formState, watch, setValue } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, member ? saveMyTalentAction : createSeekerAction);
  if (done) return member ? <Success title={tf("savedTitle")} body={t("profileSavedBody")} /> : <Success title={t("seekerDoneTitle")} body={t("seekerDoneBody")} />;
  const e = formState.errors;
  const type = watch("seekerType");
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card sm:p-8">
      <Honeypot {...register("website")} />
      <p className="flex items-center gap-2 rounded-btn bg-bg-2 px-3 py-2 text-sm font-medium text-fg-2">
        <Lock className="size-4 shrink-0 text-primary" aria-hidden /> {t("privateNote")}
      </p>
      <ChipGroup
        legend={t("iAm")}
        required
        options={SEEKER_TYPES.map((a) => ({ ...options("audience", [a])[0], icon: AUDIENCE_ICONS[a] }))}
        value={type}
        onChange={(v) => setValue("seekerType", v as SeekerInput["seekerType"], { shouldValidate: true })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sk-name" label={tf("name")} required error={err(e.name?.message)}>
          <Input id="sk-name" autoComplete="name" aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="sk-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
          <Input id="sk-phone" type="tel" inputMode="tel" autoComplete="tel" readOnly={!!member} aria-invalid={!!e.phone} {...register("phone")} />
        </Field>
        <Field id="sk-prof" label={t("profession")} required error={err(e.profession?.message)}>
          <Input id="sk-prof" placeholder={t("professionPlaceholder")} aria-invalid={!!e.profession} {...register("profession")} />
        </Field>
        <Field id="sk-sector" label={t("seekerSector")} required error={err(e.sector?.message)}>
          <CatalogSelect id="sk-sector" group="sector" list={JOB_SECTORS} placeholder="—" aria-invalid={!!e.sector} {...register("sector")} />
        </Field>
        <Field id="sk-edu" label={t("education")} required error={err(e.education?.message)}>
          <CatalogSelect id="sk-edu" group="education" list={EDUCATION_LEVELS} placeholder="—" aria-invalid={!!e.education} {...register("education")} />
        </Field>
        <Field id="sk-field" label={t("field")} optionalLabel={tf("optional")}>
          <Input id="sk-field" placeholder={t("fieldPlaceholder")} {...register("field")} />
        </Field>
        {type === "GRADUATE" ? (
          <Field id="sk-year" label={t("graduationYear")} optionalLabel={tf("optional")} error={err(e.graduationYear?.message)}>
            <Input id="sk-year" inputMode="numeric" placeholder={String(new Date().getFullYear())} {...register("graduationYear")} />
          </Field>
        ) : (
          <Field id="sk-exp" label={t("experienceYears")} error={err(e.experience?.message)}>
            <Input id="sk-exp" inputMode="numeric" placeholder="0" {...register("experience")} />
          </Field>
        )}
        <Field id="sk-area" label={t("area")} optionalLabel={tf("optional")}>
          <AreaSelect id="sk-area" areas={areas} placeholder="—" {...register("areaId")} />
        </Field>
      </div>
      <Field id="sk-skills" label={t("skills")} optionalLabel={tf("optional")} hint={t("skillsHint")}>
        <Input id="sk-skills" placeholder={t("skillsPlaceholder")} {...register("skills")} />
      </Field>
      <Field id="sk-about" label={t("about")} optionalLabel={tf("optional")}>
        <Textarea id="sk-about" rows={3} placeholder={t("aboutPlaceholder")} {...register("about")} />
      </Field>
      <ChipGroup
        legend={t("languages")}
        multiple
        options={options("language", LANGUAGES)}
        value={watch("languages") ?? []}
        onChange={(v) => setValue("languages", v as SeekerInput["languages"], { shouldValidate: true })}
      />
      <Field id="sk-projects" label={t("projects")} optionalLabel={tf("optional")}>
        <Textarea id="sk-projects" rows={3} placeholder={t("projectsPlaceholder")} {...register("projects")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sk-certs" label={t("certifications")} optionalLabel={tf("optional")}>
          <Input id="sk-certs" placeholder={t("certificationsPlaceholder")} {...register("certifications")} />
        </Field>
        <Field id="sk-link" label={t("portfolioUrl")} optionalLabel={tf("optional")} error={err(e.portfolioUrl?.message)}>
          <Input id="sk-link" type="url" inputMode="url" placeholder="linkedin.com/in/…" aria-invalid={!!e.portfolioUrl} {...register("portfolioUrl")} />
        </Field>
        <Field id="sk-avail" label={t("availability")} optionalLabel={tf("optional")}>
          <Input id="sk-avail" placeholder={t("availabilityPlaceholder")} {...register("availability")} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-btn border-[1.5px] border-yellow-500 bg-yellow-50 p-4 text-sm text-fg">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--primary)]" {...register("makePublic")} />
        <span>
          <span className="font-semibold">{t("makePublic")}</span>
          <span className="block text-fg-2">{t("makePublicHint")}</span>
        </span>
      </label>
      <ConsentBox id="sk-consent" label={t("consentSeeker")} error={err(e.consent?.message)} {...register("consent")} />
      <ServerError msg={serverError} />
      <Button type="submit" size="lg" disabled={formState.isSubmitting} className="self-start">
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {member ? tf("saveChanges") : t("submitSeeker")}
      </Button>
    </form>
  );
}

/* ---------------- Employer asks about a candidate ---------------- */

export function TalentRequestForm({ seekerId }: { seekerId: string }) {
  const t = useTranslations("talent");
  const tf = useTranslations("form");
  const form = useForm<TalentRequestInput>({
    resolver: zodResolver(talentRequestSchema),
    defaultValues: { seekerId, employerName: "", contactName: "", phone: "", message: "", website: "" },
  });
  const { register, formState } = form;
  const { onSubmit, done, serverError, err } = useSubmit(form, createTalentRequestAction);
  if (done) return <Success title={t("requestDoneTitle")} body={t("requestDoneBody")} />;
  const e = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <Field id="tr-emp" label={t("employerName")} required error={err(e.employerName?.message)}>
        <Input id="tr-emp" autoComplete="organization" aria-invalid={!!e.employerName} {...register("employerName")} />
      </Field>
      <Field id="tr-cname" label={tf("name")} required error={err(e.contactName?.message)}>
        <Input id="tr-cname" autoComplete="name" aria-invalid={!!e.contactName} {...register("contactName")} />
      </Field>
      <Field id="tr-phone" label={tf("phone")} required hint={tf("phoneHint")} error={err(e.phone?.message)}>
        <Input id="tr-phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!e.phone} {...register("phone")} />
      </Field>
      <Field id="tr-msg" label={t("requestMessage")} optionalLabel={tf("optional")}>
        <Textarea id="tr-msg" rows={3} placeholder={t("requestPlaceholder")} {...register("message")} />
      </Field>
      <ServerError msg={serverError} />
      <Button type="submit" block disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="animate-spin" />} {t("requestSubmit")}
      </Button>
    </form>
  );
}
