import type { Role } from "@/lib/auth";

export type AdminNavItem = { href: string; label: string; icon: string; roles: Role[]; group: string };

/** BROKER: listings, submissions, inquiries, wanted, jobs and tutors. ADMIN: everything. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", roles: ["ADMIN", "BROKER"], group: "Overview" },
  { href: "/admin/listings", label: "Listings", icon: "Tags", roles: ["ADMIN", "BROKER"], group: "Work" },
  { href: "/admin/submissions", label: "Submissions", icon: "Inbox", roles: ["ADMIN", "BROKER"], group: "Work" },
  { href: "/admin/inquiries", label: "Inquiries", icon: "MessagesSquare", roles: ["ADMIN", "BROKER"], group: "Work" },
  { href: "/admin/wanted", label: "Wanted", icon: "Search", roles: ["ADMIN", "BROKER"], group: "Work" },
  { href: "/admin/members", label: "Members", icon: "UserRound", roles: ["ADMIN", "BROKER"], group: "Jobs & tutors" },
  { href: "/admin/jobs", label: "Jobs", icon: "Briefcase", roles: ["ADMIN", "BROKER"], group: "Jobs & tutors" },
  { href: "/admin/job-seekers", label: "Talent pool", icon: "Contact", roles: ["ADMIN", "BROKER"], group: "Jobs & tutors" },
  { href: "/admin/tutors", label: "Tutors", icon: "GraduationCap", roles: ["ADMIN", "BROKER"], group: "Jobs & tutors" },
  { href: "/admin/talent-requests", label: "Talent requests", icon: "Handshake", roles: ["ADMIN", "BROKER"], group: "Jobs & tutors" },
  { href: "/admin/tutor-requests", label: "Tutor requests", icon: "BookOpen", roles: ["ADMIN", "BROKER"], group: "Jobs & tutors" },
  { href: "/admin/reviews", label: "Tutor reviews", icon: "Star", roles: ["ADMIN", "BROKER"], group: "Jobs & tutors" },
  { href: "/admin/categories", label: "Categories", icon: "Shapes", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/areas", label: "Areas", icon: "MapPin", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/content", label: "Content", icon: "FileText", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/settings", label: "Site settings", icon: "Settings", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/users", label: "Users", icon: "Users", roles: ["ADMIN"], group: "Setup" },
  { href: "/admin/activity", label: "Activity log", icon: "History", roles: ["ADMIN"], group: "Setup" },
];
