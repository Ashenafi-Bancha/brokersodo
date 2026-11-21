import type { Role } from "@/lib/auth";

export type AdminNavItem = { href: string; label: string; icon: string; roles: Role[]; group: string };

/** BROKER: listings, submissions, inquiries, wanted. ADMIN: everything. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", roles: ["ADMIN", "BROKER"], group: "Overview" },
  { href: "/admin/listings", label: "Listings", icon: "Tags", roles: ["ADMIN", "BROKER"], group: "Work" },
  { href: "/admin/submissions", label: "Submissions", icon: "Inbox", roles: ["ADMIN", "BROKER"], group: "Work" },
  { href: "/admin/inquiries", label: "Inquiries", icon: "MessagesSquare", roles: ["ADMIN", "BROKER"], group: "Work" },
  { href: "/admin/wanted", label: "Wanted", icon: "Search", roles: ["ADMIN", "BROKER"], group: "Work" },
  { href: "/admin/categories", label: "Categories", icon: "Shapes", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/areas", label: "Areas", icon: "MapPin", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/content", label: "Content", icon: "FileText", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/settings", label: "Site settings", icon: "Settings", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/users", label: "Users", icon: "Users", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/activity", label: "Activity log", icon: "History", roles: ["ADMIN"], group: "Setup" },
];
