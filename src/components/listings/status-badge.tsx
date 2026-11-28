import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

/** Public availability badge: Available, Under negotiation, Reserved, Sold or Rented (set by staff). */
export function ListingStatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useTranslations("listing");
  switch (status) {
    case "PUBLISHED":
      return (
        <Badge variant="published" className={className}>
          {t("available")}
        </Badge>
      );
    case "UNDER_NEGOTIATION":
      return (
        <Badge variant="warning" className={className}>
          {t("underNegotiation")}
        </Badge>
      );
    case "RESERVED":
      return (
        <Badge variant="reserved" className={className}>
          {t("reserved")}
        </Badge>
      );
    case "SOLD":
    case "RENTED":
      return (
        <Badge variant="sold" className={className}>
          {status === "RENTED" ? t("rented") : t("sold")}
        </Badge>
      );
    default:
      return null;
  }
}
