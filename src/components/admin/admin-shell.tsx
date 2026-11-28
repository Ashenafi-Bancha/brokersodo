"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  BookOpen,
  Briefcase,
  Contact,
  ExternalLink,
  GraduationCap,
  FileText,
  Handshake,
  Star,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessagesSquare,
  Plus,
  Search,
  Settings,
  Shapes,
  Tags,
  Users,
  UserRound,
  Store,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_NAV } from "./nav-items";
import { Logo } from "@/components/layout/brand";
import { SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { quickFindAction } from "@/server/actions/admin-search";
import { ConfirmProvider } from "./confirm";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Tags,
  Inbox,
  MessagesSquare,
  Search,
  Shapes,
  MapPin,
  FileText,
  Settings,
  Users,
  History,
  Briefcase,
  Contact,
  GraduationCap,
  BookOpen,
  Handshake,
  Star,
  UserRound,
  Store,
};

type Me = { name: string; email: string; role: "ADMIN" | "BROKER" };
type Counts = { submissions: number; inquiries: number; wanted: number; jobs: number; tutors: number; tutorRequests: number; talentRequests: number; reviews: number; seekers: number; companies: number; stores: number };

function NavList({ me, counts, onNavigate }: { me: Me; counts: Counts; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = ADMIN_NAV.filter((i) => i.roles.includes(me.role));
  const groups = [...new Set(items.map((i) => i.group))];
  const badge: Record<string, number> = {
    "/admin/submissions": counts.submissions,
    "/admin/inquiries": counts.inquiries,
    "/admin/wanted": counts.wanted,
    "/admin/jobs": counts.jobs,
    "/admin/tutors": counts.tutors,
    "/admin/tutor-requests": counts.tutorRequests,
    "/admin/talent-requests": counts.talentRequests,
    "/admin/reviews": counts.reviews,
    "/admin/job-seekers": counts.seekers,
    "/admin/members": counts.companies,
    "/admin/stores": counts.stores,
  };
  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1.5 px-3 text-[11px] font-bold tracking-wider text-muted uppercase">{g}</p>
          <ul className="flex flex-col gap-0.5">
            {items
              .filter((i) => i.group === g)
              .map((i) => {
                const Icon = ICONS[i.icon] ?? LayoutDashboard;
                const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-btn px-3 text-sm font-semibold transition-colors",
                        active ? "bg-red-500 text-white shadow-card" : "text-fg-2 hover:bg-bg-2 hover:text-fg",
                      )}
                    >
                      <Icon className="size-[18px]" />
                      <span className="flex-1">{i.label}</span>
                      {badge[i.href] ? (
                        <span className={cn("rounded-pill px-2 py-0.5 text-[11px] font-bold", active ? "bg-white text-red-600" : "bg-red-500 text-white")}>{badge[i.href]}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ me, counts, children }: { me: Me; counts: Counts; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ConfirmProvider>
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-[76px] flex-col justify-center border-b border-line px-5">
          <Link href="/admin" aria-label="Dashboard">
            <Logo className="h-10" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavList me={me} counts={counts} />
        </div>
        <UserBox me={me} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open menu">
                <Menu />
              </Button>
            </Dialog.Trigger>
            <SheetContent side="left" title={<Logo className="h-7" />}>
              <div className="p-3">
                <NavList me={me} counts={counts} onNavigate={() => setMenuOpen(false)} />
              </div>
              <UserBox me={me} />
            </SheetContent>
          </Dialog.Root>
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex min-h-10 w-full max-w-md cursor-pointer items-center gap-2 rounded-btn border border-line bg-bg-2 px-3 text-sm text-muted hover:border-line-strong"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Find listing by ref, title…</span>
            <kbd className="hidden rounded border border-line bg-surface px-1.5 text-[11px] font-semibold sm:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex">
              <Link href="/admin/listings/new">
                <Plus /> New listing
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-sm" aria-label="View public site">
              <a href="/" target="_blank" rel="noopener noreferrer" title="View website">
                <ExternalLink />
              </a>
            </Button>
          </div>
        </header>
        <main id="main" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} role={me.role} />
    </div>
    </ConfirmProvider>
  );
}

function UserBox({ me }: { me: Me }) {
  return (
    <div className="flex items-center gap-3 border-t border-line p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-yellow-500 text-sm font-extrabold text-navy-900">
        {me.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{me.name}</p>
        <p className="truncate text-xs text-muted">{me.role === "ADMIN" ? "Administrator" : "Broker"}</p>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="icon-xs" aria-label="Sign out">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

type Hit = { id: string; refCode: string; titleEn: string; status: string };

function CommandPalette({ open, onOpenChange, role }: { open: boolean; onOpenChange: (o: boolean) => void; role: Me["role"] }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  React.useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      quickFindAction(term).then(setHits).catch(() => setHits([]));
    }, 180);
    return () => clearTimeout(id);
  }, [q, open]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };
  const pages = ADMIN_NAV.filter((i) => i.roles.includes(role));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-900/60" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-card bg-surface shadow-pop">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">Jump to a page or find a listing by reference code</Dialog.Description>
          <Command shouldFilter={false} label="Command palette">
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search className="size-4 text-muted" />
              <Command.Input
                value={q}
                onValueChange={setQ}
                placeholder="Type a ref code (BS-V-0142), title or page…"
                className="min-h-14 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted"
              />
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="p-4 text-sm text-muted">No results.</Command.Empty>
              {hits.length > 0 && (
                <Command.Group heading="Listings" className="text-xs font-bold text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {hits.map((h) => (
                    <Command.Item
                      key={h.id}
                      value={`listing-${h.id}`}
                      onSelect={() => go(`/admin/listings/${h.id}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-btn px-3 py-2.5 text-sm text-fg data-[selected=true]:bg-bg-2"
                    >
                      <span className="font-mono text-xs font-bold text-primary">{h.refCode}</span>
                      <span className="flex-1 truncate">{h.titleEn}</span>
                      <span className="text-xs text-muted">{h.status}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              <Command.Group heading="Go to" className="text-xs font-bold text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {[{ href: "/admin/listings/new", label: "New listing", icon: "Tags" }, ...pages]
                  .filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase()))
                  .map((p) => {
                    const Icon = ICONS[p.icon] ?? Plus;
                    return (
                      <Command.Item
                        key={p.href}
                        value={p.href}
                        onSelect={() => go(p.href)}
                        className="flex cursor-pointer items-center gap-3 rounded-btn px-3 py-2.5 text-sm text-fg data-[selected=true]:bg-bg-2"
                      >
                        <Icon className="size-4 text-muted" /> {p.label}
                      </Command.Item>
                    );
                  })}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
