/** Kinds of business store. Labels live in messages under `stores.type.<VALUE>`. */
export const STORE_TYPES = [
  "SHOP",
  "SUPERMARKET",
  "ELECTRONICS",
  "FASHION",
  "SALON_WOMEN",
  "SALON_MEN",
  "SALON_UNISEX",
  "SPA",
  "HOTEL",
  "RESTAURANT",
  "CAFE",
  "LOUNGE",
  "PHARMACY",
  "OTHER",
] as const;
export type StoreType = (typeof STORE_TYPES)[number];

/** Store types that publish a menu (wording on the store page). */
export const MENU_TYPES: readonly string[] = ["HOTEL", "RESTAURANT", "CAFE", "LOUNGE"];

export const MAX_STORE_ITEMS = 300;

export type StoreImage = { url: string; publicId?: string | null; width: number; height: number; blurData?: string | null };

/** Reads an image stored as JSON on a store or item. */
export function storeImage(v: unknown): StoreImage | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return typeof o.url === "string" && typeof o.width === "number" && typeof o.height === "number"
    ? { url: o.url, publicId: (o.publicId as string) ?? null, width: o.width, height: o.height, blurData: (o.blurData as string) ?? null }
    : null;
}

export const isStoreType = (v: unknown): v is StoreType => typeof v === "string" && (STORE_TYPES as readonly string[]).includes(v);
