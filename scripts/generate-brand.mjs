// Generates every logo, favicon and social image from the client's original logo.
// Usage: npm run brand   (source: public/brand/original/broker-sodo-logo.webp)
import sharp from "sharp";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pub = (...p) => path.join(root, "public", ...p);
const SRC = pub("brand", "original", "broker-sodo-logo.webp");
const WHITE = "#ffffff";
await mkdir(pub("brand", "favicon"), { recursive: true });

// The source background is near-white (#FEFEFE); make it pure white so crops have no visible box.
const raw = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < raw.data.length; i += raw.info.channels) {
  if (Math.min(raw.data[i], raw.data[i + 1], raw.data[i + 2]) >= 246) raw.data.fill(255, i, i + 3);
}
// The site's logo is used without the two eyes (and the short line beside them).
for (let y = 915; y < 1052; y++) {
  raw.data.fill(255, (y * raw.info.width + 866) * raw.info.channels, (y + 1) * raw.info.width * raw.info.channels);
}
const clean = await sharp(raw.data, { raw: raw.info }).png().toBuffer();

// For the wordmark crop: remove the cart's grey floor shadow, which overlaps the red swoosh area.
const noShadow = Buffer.from(raw.data);
for (let y = 660; y < 785; y++) {
  for (let x = 0; x < raw.info.width; x++) {
    const i = (y * raw.info.width + x) * raw.info.channels;
    const hi = Math.max(noShadow[i], noShadow[i + 1], noShadow[i + 2]);
    const lo = Math.min(noShadow[i], noShadow[i + 1], noShadow[i + 2]);
    if (hi - lo < 34) noShadow.fill(255, i, i + 3);
  }
}
const cleanNoShadow = await sharp(noShadow, { raw: raw.info }).png().toBuffer();

const whiteRect = (w, h, x, y, rw, rh) =>
  Buffer.from(`<svg width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="#fff"/></svg>`);

/** Cut a region of the logo, hiding neighbouring artwork that overlaps its box. */
async function cut(left, top, width, height, masks = [], source = clean) {
  const overlays = masks.map(([x, y, w, h]) => ({ input: whiteRect(1254, 1254, x, y, w, h), left: 0, top: 0 }));
  const base = await sharp(source).composite(overlays).png().toBuffer();
  const piece = await sharp(base).extract({ left, top, width, height }).png().toBuffer();
  return sharp(piece).trim({ background: WHITE, threshold: 12 }).png().toBuffer();
}

const stacked = await sharp(clean).trim({ background: WHITE, threshold: 12 }).png().toBuffer();
const cart = await cut(270, 75, 700, 700, [[0, 698, 625, 556]]);
const wordmark = await cut(45, 696, 1170, 352, [[520, 0, 734, 776]], cleanNoShadow);

async function lockup() {
  const h = 340;
  const c = await sharp(cart).resize({ height: h }).png().toBuffer();
  const cw = (await sharp(c).metadata()).width;
  const w = await sharp(wordmark).resize({ height: Math.round(h * 0.82) }).png().toBuffer();
  const wm = await sharp(w).metadata();
  const gap = 24;
  return sharp({ create: { width: cw + gap + wm.width, height: h, channels: 3, background: WHITE } })
    .composite([
      { input: c, left: 0, top: 0 },
      { input: w, left: cw + gap, top: Math.round((h - wm.height) / 2) },
    ])
    .png()
    .toBuffer();
}
const horizontal = await lockup();

const out = async (buf, name, width) => {
  const img = width ? sharp(buf).resize({ width }) : sharp(buf);
  await img.clone().webp({ quality: 90 }).toFile(pub("brand", `${name}.webp`));
  await img.clone().png({ compressionLevel: 9 }).toFile(pub("brand", `${name}.png`));
};
await out(horizontal, "logo-horizontal", 720);
await out(stacked, "logo-stacked", 640);
await out(cart, "logo-cart", 512);
await copyFile(pub("brand", "logo-stacked.png"), pub("brand", "logo.png"));

/** Square icon: the cart centred on white. */
const icon = async (size, scale = 0.86) => {
  const inner = Math.round(size * scale);
  const c = await sharp(cart).resize(inner, inner, { fit: "contain", background: WHITE }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 3, background: WHITE } })
    .composite([{ input: c, gravity: "centre" }])
    .png()
    .toBuffer();
};
const files = {
  "favicon-16x16.png": await icon(16, 1),
  "favicon-32x32.png": await icon(32, 0.96),
  "favicon-48x48.png": await icon(48, 0.94),
  "apple-touch-icon.png": await icon(180),
  "android-chrome-192x192.png": await icon(192),
  "android-chrome-512x512.png": await icon(512),
  "maskable-512x512.png": await icon(512, 0.68),
};

// favicon.ico containing 16, 32 and 48 px PNGs
const sizes = [16, 32, 48];
const pngs = sizes.map((s) => files[`favicon-${s}x${s}.png`]);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header[e] = s;
  header[e + 1] = s;
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
files["favicon.ico"] = Buffer.concat([header, ...pngs]);

for (const [name, buf] of Object.entries(files)) {
  await writeFile(pub(name), buf);
  await writeFile(pub("brand", "favicon", name), buf);
}

// Default social sharing image
const logoForOg = await sharp(stacked).resize({ height: 500 }).png().toBuffer();
const bar = Buffer.from(
  `<svg width="1200" height="14"><defs><linearGradient id="g"><stop offset="0" stop-color="#E30613"/><stop offset=".55" stop-color="#F59E0B"/><stop offset="1" stop-color="#FFC20E"/></linearGradient></defs><rect width="1200" height="14" fill="url(#g)"/></svg>`,
);
await sharp({ create: { width: 1200, height: 630, channels: 3, background: WHITE } })
  .composite([
    { input: logoForOg, top: 58, left: Math.round((1200 - (await sharp(logoForOg).metadata()).width) / 2) },
    { input: bar, top: 616, left: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(pub("og-image-1200x630.png"));
await copyFile(pub("og-image-1200x630.png"), pub("brand", "og-image-1200x630.png"));
console.log("Brand assets generated");
