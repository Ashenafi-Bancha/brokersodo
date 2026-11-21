"use server";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

/** ⌘K quick find: ref code prefix or title match (staff only). */
export async function quickFindAction(q: string) {
  await requireStaff();
  const term = String(q).trim().slice(0, 60);
  if (term.length < 2) return [];
  return db.listing.findMany({
    where: {
      OR: [
        { refCode: { contains: term, mode: "insensitive" } },
        { titleEn: { contains: term, mode: "insensitive" } },
        { titleAm: { contains: term, mode: "insensitive" } },
      ],
    },
    select: { id: true, refCode: true, titleEn: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
}
