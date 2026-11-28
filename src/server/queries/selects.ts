import "server-only";
import { Prisma } from "@prisma/client";

/**
 * THE ONLY selects allowed on public routes.
 * They deliberately omit ownerName / ownerPhone / ownerNotes / assignedBroker contact.
 * Never use `include` or a bare findMany on Listing in public code.
 */
export const publicListingCardSelect = {
  id: true,
  refCode: true,
  slug: true,
  titleEn: true,
  titleAm: true,
  dealType: true,
  rentPeriod: true,
  price: true,
  isNegotiable: true,
  priceOnRequest: true,
  condition: true,
  attributes: true,
  status: true,
  isVerified: true,
  isInspected: true,
  featured: true,
  featuredUntil: true,
  publishedAt: true,
  createdAt: true,
  viewCount: true,
  category: { select: { id: true, slug: true, nameEn: true, nameAm: true, icon: true, attributeSchema: true } },
  area: { select: { id: true, slug: true, nameEn: true, nameAm: true } },
  images: {
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
    take: 1,
    select: { url: true, width: true, height: true, alt: true, blurData: true },
  },
} satisfies Prisma.ListingSelect;

export const publicListingDetailSelect = {
  ...publicListingCardSelect,
  descriptionEn: true,
  descriptionAm: true,
  videoUrl: true,
  videoFile: true,
  addressHint: true,
  lat: true,
  lng: true,
  soldAt: true,
  updatedAt: true,
  categoryId: true,
  images: {
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
    select: { id: true, url: true, width: true, height: true, alt: true, blurData: true },
  },
  // Assigned broker: public name only — contact always goes to BrokerSodo.
  assignedBroker: { select: { name: true } },
} satisfies Prisma.ListingSelect;

export type PublicListingCard = Prisma.ListingGetPayload<{ select: typeof publicListingCardSelect }>;
export type PublicListingDetail = Prisma.ListingGetPayload<{ select: typeof publicListingDetailSelect }>;

/** Statuses visible on the public site. */
export const PUBLIC_STATUSES = ["PUBLISHED", "UNDER_NEGOTIATION", "RESERVED", "SOLD", "RENTED"] as const;
export const BROWSABLE_STATUSES = ["PUBLISHED", "UNDER_NEGOTIATION", "RESERVED"] as const;
