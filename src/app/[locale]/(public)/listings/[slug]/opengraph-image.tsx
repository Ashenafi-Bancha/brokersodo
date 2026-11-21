/* eslint-disable @next/next/no-img-element -- Satori (next/og) renders plain <img>, not next/image */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getListingBySlug } from "@/server/queries/public";
import { formatETB, rentSuffix } from "@/lib/format";
import { cloudinaryResize, isCloudinary, watermarked } from "@/lib/image";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BrokerSodo listing";

const root = process.cwd();
const font = (p: string) => readFile(path.join(root, "node_modules/@fontsource", p));

/** Satori can't decode WebP/AVIF, so we normalise every photo to JPEG. */
async function photoDataUrl(url: string): Promise<string | null> {
  try {
    let buf: Buffer;
    if (isCloudinary(url)) {
      const res = await fetch(cloudinaryResize(watermarked(url), 1200).replace("f_auto", "f_jpg"));
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else if (url.startsWith("/")) {
      const file = path.join(root, "public", url);
      if (!file.startsWith(path.join(root, "public"))) return null;
      buf = await readFile(file);
    } else return null;
    const jpg = await sharp(buf).resize(760, 630, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const [listing, montserrat, inter, logo] = await Promise.all([
    getListingBySlug(slug),
    font("montserrat/files/montserrat-latin-900-italic.woff"),
    font("inter/files/inter-latin-700-normal.woff"),
    readFile(path.join(root, "public/brand/logo/png/logo-horizontal-white-600.png")),
  ]);
  const logoUrl = `data:image/png;base64,${logo.toString("base64")}`;
  const fonts = [
    { name: "Montserrat", data: montserrat, weight: 900 as const, style: "italic" as const },
    { name: "Inter", data: inter, weight: 700 as const, style: "normal" as const },
  ];

  if (!listing) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F1B3D" }}>
          <img src={logoUrl} width={600} height={115} alt="" />
        </div>
      ),
      { ...size, fonts },
    );
  }

  const photo = listing.images[0] ? await photoDataUrl(listing.images[0].url) : null;
  const title = (locale === "am" && listing.titleAm) || listing.titleEn;
  const price = listing.priceOnRequest || listing.price == null ? "Price on request" : `${formatETB(listing.price)}${listing.dealType === "RENT" ? ` ${rentSuffix(listing.rentPeriod)}` : ""}`;
  const closed = listing.status === "SOLD" || listing.status === "RENTED";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0F1B3D", fontFamily: "Inter" }}>
        <div style={{ width: 760, height: 630, display: "flex", position: "relative", background: "#172344" }}>
          {photo && <img src={photo} width={760} height={630} alt="" style={{ objectFit: "cover" }} />}
          <div
            style={{
              position: "absolute",
              top: 32,
              left: 32,
              display: "flex",
              padding: "10px 18px",
              borderRadius: 10,
              background: closed ? "#15803D" : listing.dealType === "RENT" ? "#2E4A8F" : "#E30613",
              color: "#fff",
              fontFamily: "Montserrat",
              fontSize: 30,
            }}
          >
            {closed ? (listing.status === "RENTED" ? "RENTED ✓" : "SOLD ✓") : listing.dealType === "RENT" ? "FOR RENT" : "FOR SALE"}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "44px 40px 36px" }}>
          <img src={logoUrl} width={340} height={65} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ color: "#fff", fontSize: 40, lineHeight: 1.15, display: "flex" }}>{title.length > 70 ? `${title.slice(0, 68)}…` : title}</div>
            <div style={{ color: "#FFC20E", fontFamily: "Montserrat", fontSize: price.length > 18 ? 42 : 52, display: "flex" }}>{price}</div>
            <div style={{ display: "flex" }}>
              <div style={{ display: "flex", padding: "8px 16px", borderRadius: 999, border: "2px dashed #AEB6CC", color: "#fff", fontSize: 26 }}>Ref {listing.refCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", height: 10, borderRadius: 999, backgroundImage: "linear-gradient(90deg, #E30613 0%, #F59E0B 55%, #FFC20E 100%)" }} />
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
