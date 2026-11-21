import type { Prisma, PrismaClient } from "@prisma/client";
import { slugify } from "./utils";

type Tx = PrismaClient | Prisma.TransactionClient;

/** Atomically allocate the next reference code for a category prefix: BS-V-0142. */
export async function nextRefCode(tx: Tx, prefix: string): Promise<string> {
  const p = prefix.toUpperCase().replace(/[^A-Z]/g, "") || "X";
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "RefCounter" ("prefix", "value") VALUES (${p}, 1)
    ON CONFLICT ("prefix") DO UPDATE SET "value" = "RefCounter"."value" + 1
    RETURNING "value"`;
  return formatRefCode(p, Number(rows[0].value));
}

export function formatRefCode(prefix: string, n: number) {
  return `BS-${prefix}-${String(n).padStart(4, "0")}`;
}

/** Slug like "toyota-vitz-2012-bs-v-0142" — unique because the ref code is unique. */
export function listingSlug(title: string, refCode: string) {
  const base = slugify(title).slice(0, 60).replace(/-+$/, "");
  return `${base ? `${base}-` : ""}${refCode.toLowerCase()}`;
}
