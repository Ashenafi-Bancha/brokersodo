"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { useRunAction } from "./confirm";
import { saveCatalogOptionAction } from "@/server/actions/admin-catalog";
import { cn } from "@/lib/utils";

export type CatalogRow = { value: string; labelEn: string; labelAm: string; sortOrder: number; isActive: boolean; builtIn: boolean; used: number };

/** One editable list: job sectors or tutoring subjects. */
export function CatalogManager({ group, title, hint, rows }: { group: "sector" | "subject"; title: string; hint: string; rows: CatalogRow[] }) {
  return (
    <section className="rounded-card bg-surface p-4 shadow-card sm:p-6">
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-muted">{hint}</p>
      <AddRow group={group} nextOrder={(rows.reduce((m, r) => Math.max(m, r.sortOrder), 0) || 0) + 10} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted uppercase">
              <th className="py-2 pr-2">English name</th>
              <th className="py-2 pr-2">Amharic name</th>
              <th className="w-20 py-2 pr-2">Order</th>
              <th className="w-24 py-2 pr-2">Used by</th>
              <th className="w-44 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <OptionRow key={r.value} group={group} row={r} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OptionRow({ group, row }: { group: "sector" | "subject"; row: CatalogRow }) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [v, setV] = React.useState(row);
  const dirty = v.labelEn !== row.labelEn || v.labelAm !== row.labelAm || v.sortOrder !== row.sortOrder;
  const save = (isActive = v.isActive) =>
    run(
      () => saveCatalogOptionAction({ group, value: row.value, labelEn: v.labelEn, labelAm: v.labelAm, sortOrder: v.sortOrder, isActive }),
      () => router.refresh(),
    );
  return (
    <tr className={cn("border-b border-line last:border-0", !row.isActive && "opacity-60")}>
      <td className="py-2 pr-2">
        <Input aria-label={`English name for ${row.labelEn}`} className="min-h-10" value={v.labelEn} onChange={(e) => setV({ ...v, labelEn: e.target.value })} />
        <span className="mt-0.5 block font-mono text-[11px] text-muted">
          {row.value}
          {row.builtIn ? "" : " · added"}
        </span>
      </td>
      <td className="py-2 pr-2 align-top">
        <Input aria-label={`Amharic name for ${row.labelEn}`} className="min-h-10" value={v.labelAm} onChange={(e) => setV({ ...v, labelAm: e.target.value })} />
      </td>
      <td className="py-2 pr-2 align-top">
        <Input aria-label={`Order of ${row.labelEn}`} className="min-h-10" inputMode="numeric" value={String(v.sortOrder)} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
      </td>
      <td className="py-2 pr-2 align-top text-muted tabular-nums">{row.used}</td>
      <td className="py-2 align-top">
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant={dirty ? "primary" : "ghost"} disabled={pending || !dirty} onClick={() => save()}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            title={row.isActive ? "Hide from forms and filters (existing records keep it)" : "Show again"}
            onClick={() => save(!row.isActive)}
          >
            {row.isActive ? <EyeOff /> : <Eye />} {row.isActive ? "Hide" : "Show"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddRow({ group, nextOrder }: { group: "sector" | "subject"; nextOrder: number }) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [labelEn, setEn] = React.useState("");
  const [labelAm, setAm] = React.useState("");
  return (
    <form
      className="flex flex-col gap-2 rounded-btn bg-bg-2 p-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => saveCatalogOptionAction({ group, value: null, labelEn, labelAm, sortOrder: nextOrder, isActive: true }),
          () => {
            setEn("");
            setAm("");
            router.refresh();
          },
        );
      }}
    >
      <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-fg">
        New — English name
        <Input className="min-h-10" value={labelEn} onChange={(e) => setEn(e.target.value)} placeholder={group === "sector" ? "e.g. Solar & electrical" : "e.g. Coding for kids"} />
      </label>
      <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-fg">
        Amharic name
        <Input className="min-h-10" value={labelAm} onChange={(e) => setAm(e.target.value)} />
      </label>
      <Button type="submit" disabled={pending || labelEn.trim().length < 2}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
      </Button>
    </form>
  );
}
