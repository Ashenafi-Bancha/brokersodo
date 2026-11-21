/** Picks which stock photo set (prisma/placeholder-images.json) suits a sample listing. */
export function photoType(categorySlug: string, title: string, attributes: Record<string, unknown>): string {
  const t = title.toLowerCase();
  const kind = String(attributes.type ?? "");
  switch (categorySlug) {
    case "vehicles":
      if (/hilux|pickup/.test(t)) return "pickup";
      if (/isuzu|truck/.test(t)) return "truck";
      if (/cruiser|prado/.test(t)) return "suv";
      if (/byd|electric/.test(t)) return "ev";
      if (/vitz|atos/.test(t)) return "hatchback";
      return "sedan";
    case "motorbikes-bajaj":
      return kind === "motorbike" ? "motorbike" : "bajaj";
    case "houses":
      return /villa/.test(t) ? "villa" : "house";
    case "house-rent":
      return String(attributes.propertyType ?? "apartment");
    case "land":
      return attributes.use === "agricultural" ? "farmland" : "land";
    case "machinery":
      return kind || "tractor";
    case "electronics":
      return kind || "laptop";
    case "printers-office":
      return kind === "copier" ? "copier" : "printer";
    default:
      return /sofa/.test(t) ? "sofa" : "tent";
  }
}
