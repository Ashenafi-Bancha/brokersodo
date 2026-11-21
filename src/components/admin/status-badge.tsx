import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { variant: Parameters<typeof Badge>[0]["variant"]; label: string }> = {
  DRAFT: { variant: "draft", label: "Draft" },
  PUBLISHED: { variant: "published", label: "Published" },
  RESERVED: { variant: "warning", label: "Reserved" },
  SOLD: { variant: "info", label: "Sold" },
  RENTED: { variant: "info", label: "Rented" },
  ARCHIVED: { variant: "archived", label: "Archived" },
  NEW: { variant: "danger", label: "New" },
  CONTACTED: { variant: "info", label: "Contacted" },
  VIEWING_SCHEDULED: { variant: "warning", label: "Viewing" },
  NEGOTIATING: { variant: "featured", label: "Negotiating" },
  CLOSED_WON: { variant: "published", label: "Won" },
  CLOSED_LOST: { variant: "archived", label: "Lost" },
  PENDING: { variant: "danger", label: "Pending" },
  APPROVED: { variant: "published", label: "Approved" },
  REJECTED: { variant: "archived", label: "Rejected" },
  OPEN: { variant: "danger", label: "Open" },
  MATCHED: { variant: "published", label: "Matched" },
  CLOSED: { variant: "archived", label: "Closed" },
};

export function StatusBadge({ status }: { status: string }) {
  const m = MAP[status] ?? { variant: "neutral" as const, label: status };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
