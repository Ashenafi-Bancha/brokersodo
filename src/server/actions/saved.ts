"use server";
import { getListingsByIds } from "@/server/queries/public";

/** Public: resolve saved / recently viewed IDs (from localStorage) to public card data. */
export async function getSavedListingsAction(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return getListingsByIds(ids.filter((x): x is string => typeof x === "string"));
}
