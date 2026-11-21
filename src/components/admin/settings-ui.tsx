"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Loader2, Pencil, Plus, Save, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MapPicker } from "@/components/listings/map-lazy";
import { StatusBadge } from "./status-badge";
import { settingsSchema, userCreateSchema, userUpdateSchema, type SettingsInput, type UserCreateInput, type UserUpdateInput } from "@/lib/validators/admin";
import { createUserAction, saveSettingsAction, updateUserAction } from "@/server/actions/admin-content";
import { relativeTime } from "@/lib/format";

type Section = "contact" | "homepage" | "social" | "seo";

/** Site settings (singleton). `sections` lets the Content page reuse the homepage part. */
export function SettingsForm({ initial, sections = ["contact", "homepage", "social", "seo"] }: { initial: SettingsInput; sections?: Section[] }) {
  const router = useRouter();
  const { register, handleSubmit, formState, setError, watch, setValue } = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema), defaultValues: initial });
  const e = formState.errors;
  const has = (s: Section) => sections.includes(s);
  const card = "space-y-4 rounded-card bg-surface p-5 shadow-card sm:p-6";
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={handleSubmit(
        async (v) => {
          const r = await saveSettingsAction(v);
          if (!r.ok) {
            toast.error(r.error);
            for (const [k, m] of Object.entries(r.fieldErrors ?? {})) if (m?.[0]) setError(k as keyof SettingsInput, { message: m[0] });
            return;
          }
          toast.success(r.message ?? "Saved");
          router.refresh();
        },
        () => toast.error("Please check the highlighted fields."),
      )}
    >
      {has("contact") && (
        <>
          <section className={card}>
            <h2 className="text-lg font-bold text-fg">Business & contact channels</h2>
            <p className="-mt-2 text-sm text-muted">Every Call / Telegram / WhatsApp button on the site uses these. Owners’ numbers are never shown.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="businessName" label="Business name" required error={e.businessName?.message}>
                <Input id="businessName" {...register("businessName")} />
              </Field>
              <Field id="email" label="Email" optionalLabel="optional" error={e.email?.message}>
                <Input id="email" type="email" {...register("email")} />
              </Field>
              <Field id="phonePrimary" label="Main phone" required error={e.phonePrimary?.message}>
                <Input id="phonePrimary" type="tel" {...register("phonePrimary")} />
              </Field>
              <Field id="phoneSecondary" label="Second phone" optionalLabel="optional" error={e.phoneSecondary?.message}>
                <Input id="phoneSecondary" type="tel" {...register("phoneSecondary")} />
              </Field>
              <Field id="whatsappNumber" label="WhatsApp number" required error={e.whatsappNumber?.message}>
                <Input id="whatsappNumber" type="tel" {...register("whatsappNumber")} />
              </Field>
              <Field id="telegramUsername" label="Telegram username" required hint="Without @" error={e.telegramUsername?.message}>
                <Input id="telegramUsername" {...register("telegramUsername")} />
              </Field>
              <Field id="telegramChannel" label="Telegram channel" optionalLabel="optional" hint="e.g. BrokerSodoDeals">
                <Input id="telegramChannel" {...register("telegramChannel")} />
              </Field>
            </div>
          </section>
          <section className={card}>
            <h2 className="text-lg font-bold text-fg">Office & hours</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="addressEn" label="Address (English)" optionalLabel="optional">
                <Input id="addressEn" {...register("addressEn")} />
              </Field>
              <Field id="addressAm" label="Address (Amharic)" optionalLabel="optional">
                <Input id="addressAm" lang="am" {...register("addressAm")} />
              </Field>
              <Field id="hoursEn" label="Working hours (English)" optionalLabel="optional" hint="One line per day range">
                <Textarea id="hoursEn" rows={3} {...register("hoursEn")} />
              </Field>
              <Field id="hoursAm" label="Working hours (Amharic)" optionalLabel="optional">
                <Textarea id="hoursAm" lang="am" rows={3} {...register("hoursAm")} />
              </Field>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-fg">Office map location (click to move)</p>
              <div className="h-64 overflow-hidden rounded-card border border-line">
                <MapPicker lat={Number(watch("mapLat"))} lng={Number(watch("mapLng"))} onChange={(la, ln) => { setValue("mapLat", la, { shouldDirty: true }); setValue("mapLng", ln, { shouldDirty: true }); }} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input aria-label="Latitude" {...register("mapLat")} className="font-mono text-sm" />
                <Input aria-label="Longitude" {...register("mapLng")} className="font-mono text-sm" />
              </div>
            </div>
          </section>
        </>
      )}

      {has("homepage") && (
        <section className={card}>
          <h2 className="text-lg font-bold text-fg">Homepage hero & stats</h2>
          <p className="-mt-2 text-sm text-muted">Leave empty to use the default brand text. Stats left empty are calculated from the database.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="heroTitleEn" label="Hero title (English)" optionalLabel="optional">
              <Input id="heroTitleEn" placeholder="Every deal in Sodo, in one cart." {...register("heroTitleEn")} />
            </Field>
            <Field id="heroTitleAm" label="Hero title (Amharic)" optionalLabel="optional">
              <Input id="heroTitleAm" lang="am" {...register("heroTitleAm")} />
            </Field>
            <Field id="heroSubtitleEn" label="Hero subtitle (English)" optionalLabel="optional">
              <Textarea id="heroSubtitleEn" rows={2} {...register("heroSubtitleEn")} />
            </Field>
            <Field id="heroSubtitleAm" label="Hero subtitle (Amharic)" optionalLabel="optional">
              <Textarea id="heroSubtitleAm" lang="am" rows={2} {...register("heroSubtitleAm")} />
            </Field>
            <Field id="taglineEn" label="Tagline (English)" optionalLabel="optional">
              <Input id="taglineEn" {...register("taglineEn")} />
            </Field>
            <Field id="taglineAm" label="Tagline (Amharic)" optionalLabel="optional">
              <Input id="taglineAm" lang="am" {...register("taglineAm")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["statListings", "Listings"],
                ["statDeals", "Deals closed"],
                ["statClients", "Happy clients"],
                ["statYears", "Years"],
              ] as const
            ).map(([k, l]) => (
              <Field key={k} id={k} label={l} optionalLabel="auto" error={e[k]?.message}>
                <Input id={k} type="number" min={0} {...register(k)} />
              </Field>
            ))}
          </div>
        </section>
      )}

      {has("social") && (
        <section className={card}>
          <h2 className="text-lg font-bold text-fg">Social links</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["facebookUrl", "tiktokUrl", "instagramUrl", "youtubeUrl"] as const).map((k) => (
              <Field key={k} id={k} label={k.replace("Url", "").replace(/^./, (c) => c.toUpperCase())} optionalLabel="optional" error={e[k]?.message}>
                <Input id={k} type="url" placeholder="https://" {...register(k)} />
              </Field>
            ))}
          </div>
        </section>
      )}

      {has("seo") && (
        <section className={card}>
          <h2 className="text-lg font-bold text-fg">SEO defaults (English)</h2>
          <Field id="seoTitle" label="Default title" optionalLabel="max 70" error={e.seoTitle?.message}>
            <Input id="seoTitle" maxLength={70} {...register("seoTitle")} />
          </Field>
          <Field id="seoDescription" label="Default description" optionalLabel="max 170" error={e.seoDescription?.message}>
            <Textarea id="seoDescription" rows={2} maxLength={170} {...register("seoDescription")} />
          </Field>
        </section>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" disabled={formState.isSubmitting} className="shadow-pop">
          {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Save />} Save settings
        </Button>
      </div>
    </form>
  );
}

/* ---------------- Users ---------------- */

export type UserRow = { id: string; name: string; email: string; phone: string | null; role: "ADMIN" | "BROKER"; isActive: boolean; lastLoginAt: string | null; listings: number };

export function UsersManager({ rows, meId }: { rows: UserRow[]; meId: string }) {
  const [editing, setEditing] = React.useState<UserRow | "new" | null>(null);
  const router = useRouter();
  const done = () => {
    setEditing(null);
    router.refresh();
  };
  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setEditing("new")}>
        <Plus /> Add staff member
      </Button>
      <div className="overflow-x-auto rounded-card bg-surface shadow-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs font-bold tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Listings</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold text-fg">
                    {u.name} {u.id === meId && <span className="text-xs font-normal text-muted">(you)</span>}
                  </p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3">{u.role === "ADMIN" ? "Admin" : "Broker"}</td>
                <td className="px-4 py-3">{u.isActive ? <StatusBadge status="PUBLISHED" /> : <StatusBadge status="ARCHIVED" />}</td>
                <td className="px-4 py-3 tabular-nums">{u.listings}</td>
                <td className="px-4 py-3 text-muted">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : "Never"}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" size="xs" className="border-line" onClick={() => setEditing(u)}>
                    <Pencil /> Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Admins have full access. Brokers can manage listings, submissions, inquiries and wanted requests, but not users, settings or categories.</p>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <DialogContent title={editing === "new" ? "Add staff member" : `Edit ${editing.name}`}>{editing === "new" ? <CreateUserForm onDone={done} /> : <EditUserForm user={editing} meId={meId} onDone={done} />}</DialogContent>}
      </Dialog>
    </div>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const { register, handleSubmit, formState } = useForm<UserCreateInput>({ resolver: zodResolver(userCreateSchema), defaultValues: { name: "", email: "", phone: "", role: "BROKER", password: "" } });
  const e = formState.errors;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        const r = await createUserAction(v);
        if (r.ok) {
          toast.success(r.message ?? "Created");
          onDone();
        } else toast.error(r.error);
      })}
    >
      <Field id="u-name" label="Full name" required error={e.name?.message}>
        <Input id="u-name" {...register("name")} />
      </Field>
      <Field id="u-email" label="Email (used to sign in)" required error={e.email?.message}>
        <Input id="u-email" type="email" autoComplete="off" {...register("email")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="u-phone" label="Phone" optionalLabel="optional" error={e.phone?.message}>
          <Input id="u-phone" type="tel" {...register("phone")} />
        </Field>
        <Field id="u-role" label="Role">
          <Select id="u-role" {...register("role")}>
            <option value="BROKER">Broker</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
      </div>
      <Field id="u-pw" label="Temporary password" required hint="At least 10 characters. Share it privately; they can ask an admin to reset it." error={e.password?.message}>
        <Input id="u-pw" type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} Create account
      </Button>
    </form>
  );
}

function EditUserForm({ user, meId, onDone }: { user: UserRow; meId: string; onDone: () => void }) {
  const { register, handleSubmit, formState, watch, setValue } = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: { id: user.id, name: user.name, phone: user.phone ?? "", role: user.role, isActive: user.isActive, password: "" },
  });
  const e = formState.errors;
  const self = user.id === meId;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        const r = await updateUserAction(v);
        if (r.ok) {
          toast.success(r.message ?? "Saved");
          onDone();
        } else toast.error(r.error);
      })}
    >
      <p className="text-sm text-muted">{user.email}</p>
      <Field id="e-name" label="Full name" required error={e.name?.message}>
        <Input id="e-name" {...register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="e-phone" label="Phone" optionalLabel="optional" error={e.phone?.message}>
          <Input id="e-phone" type="tel" {...register("phone")} />
        </Field>
        <Field id="e-role" label="Role">
          <Select id="e-role" disabled={self} {...register("role")}>
            <option value="BROKER">Broker</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
      </div>
      <Switch id="e-active" label={watch("isActive") ? "Active" : "Deactivated"} description={self ? "You can't deactivate yourself" : "Deactivated staff are signed out and can't sign in"} checked={!!watch("isActive")} onCheckedChange={(v) => !self && setValue("isActive", v)} />
      <Field id="e-pw" label={<span className="inline-flex items-center gap-1"><KeyRound className="size-4" /> Reset password</span>} optionalLabel="leave empty to keep" error={e.password?.message}>
        <Input id="e-pw" type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <Loader2 className="animate-spin" /> : watch("isActive") ? <Save /> : <UserX />} Save
      </Button>
    </form>
  );
}
