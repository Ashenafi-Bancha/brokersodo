/**
 * Adds the extra sample listings to an existing database without wiping anything.
 * Safe to re-run: listings whose title already exists are skipped.
 *
 *   npm run db:add-samples
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import blurMap from "./placeholder-blur.json";
import stockPhotos from "./placeholder-images.json";
import { OFFICE_CATEGORY_NAME, extraDrafts, withExtraOptions } from "./sample-extra";
import { listingSlug, nextRefCode } from "../src/lib/ref-code";
import { parseAttributeSchema, validateAttributes } from "../src/lib/validators/attribute-schema";

const db = new PrismaClient();
const blur = blurMap as Record<string, string>;
const photos = stockPhotos as Record<string, string[]>;

async function main() {
  const categories = await db.category.findMany();
  const bySlug = new Map<string, { id: string; refPrefix: string; fields: ReturnType<typeof parseAttributeSchema> }>();
  for (const c of categories) {
    const fields = withExtraOptions(c.slug, parseAttributeSchema(c.attributeSchema));
    await db.category.update({
      where: { id: c.id },
      data: { attributeSchema: fields as unknown as Prisma.InputJsonValue, ...(c.slug === "printers-office" ? OFFICE_CATEGORY_NAME : {}) },
    });
    bySlug.set(c.slug, { id: c.id, refPrefix: c.refPrefix, fields });
  }
  const areas = await db.area.findMany({ orderBy: { sortOrder: "asc" } });
  const staff = await db.user.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
  const existing = new Set((await db.listing.findMany({ select: { titleEn: true } })).map((l) => l.titleEn));
  const now = Date.now();
  let added = 0;

  for (const [i, d] of extraDrafts.entries()) {
    if (existing.has(d.titleEn)) continue;
    const cat = bySlug.get(d.cat);
    const pool = photos[d.photo];
    if (!cat || !pool?.length) throw new Error(`Missing category or photos for "${d.titleEn}"`);
    const attrs = validateAttributes(cat.fields, d.attrs);
    if (!attrs.ok) throw new Error(`Invalid attributes for "${d.titleEn}": ${JSON.stringify(attrs.errors)}`);
    const area = areas[i % areas.length];
    const count = Math.min(2 + (i % 2), pool.length);
    await db.$transaction(async (tx) => {
      const refCode = await nextRefCode(tx, cat.refPrefix);
      await tx.listing.create({
        data: {
          refCode,
          slug: listingSlug(d.titleEn, refCode),
          titleEn: d.titleEn,
          descriptionEn: d.desc,
          categoryId: cat.id,
          dealType: d.dealType,
          rentPeriod: d.dealType === "RENT" ? (d.rentPeriod ?? "MONTH") : null,
          price: d.price,
          isNegotiable: i % 2 === 0,
          condition: d.condition ?? null,
          areaId: area?.id,
          addressHint: area ? `Near ${area.nameEn}, Wolaita Sodo` : "Wolaita Sodo",
          lat: 6.8556 + (((i * 37) % 41) - 20) * 0.001,
          lng: 37.7508 + (((i * 53) % 41) - 20) * 0.001,
          attributes: attrs.data,
          status: "PUBLISHED",
          isVerified: i % 3 !== 0,
          isInspected: i % 4 === 0,
          featured: i % 11 === 0,
          assignedBrokerId: staff.length ? staff[i % staff.length].id : null,
          viewCount: 12 + ((i * 47) % 420),
          publishedAt: new Date(now - (i + 1) * 5 * 3600_000),
          images: {
            create: Array.from({ length: count }, (_, k) => {
              const name = pool[(i + k) % pool.length];
              return { url: `/placeholders/${name}`, width: 960, height: 720, alt: d.titleEn, sortOrder: k, isCover: k === 0, blurData: blur[name] ?? null };
            }),
          },
        },
      });
    });
    added++;
  }
  console.log(`Added ${added} listings (${extraDrafts.length - added} already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
