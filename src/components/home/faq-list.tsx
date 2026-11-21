import { ChevronDown } from "lucide-react";

/** Zero-JS accordion using <details>. */
export function FaqList({ items }: { items: { id: string; q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
      {items.map((f) => (
        <details key={f.id} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-fg [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="px-5 pb-5 leading-relaxed whitespace-pre-line text-fg-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
