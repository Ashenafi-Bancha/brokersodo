import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function AdminPageHeader({
  title,
  description,
  crumbs = [],
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  crumbs?: { href?: string; label: string }[];
  actions?: React.ReactNode;
}) {
  const all = [{ href: "/admin", label: "Admin" }, ...crumbs];
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-muted">
            {all.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" aria-hidden />}
                {c.href && i < all.length - 1 ? (
                  <Link href={c.href} className="hover:text-fg">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={i === all.length - 1 ? "page" : undefined}>{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-1 truncate text-2xl font-extrabold text-fg sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
