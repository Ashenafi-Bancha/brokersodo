// Generates on-brand placeholder listing photos (category icon on the brand pattern).
// Usage: node scripts/generate-placeholders.mjs   → public/placeholders/{icon}-{n}.webp
import sharp from "sharp";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "public", "placeholders");
await mkdir(out, { recursive: true });

const icons = ["car", "motorbike", "bajaj", "house", "rentals", "land", "machinery", "electronics", "printer", "other"];
const palettes = [
  ["#0F1B3D", "#2E4A8F"],
  ["#172344", "#E30613"],
  ["#FFF4D4", "#FFC20E"],
  ["#EEF1F6", "#B4BED7"],
  ["#222D4D", "#F59E0B"],
];
const pattern = (await readFile(path.join(root, "public/brand/patterns/pattern-dark.svg"))).toString("base64");
const patternLight = (await readFile(path.join(root, "public/brand/patterns/pattern-light.svg"))).toString("base64");
const blur = {};

for (const icon of icons) {
  for (let i = 0; i < palettes.length; i++) {
    const [a, b] = palettes[i];
    const light = i === 2 || i === 3;
    const tone = light ? "navy" : "white";
    const ic = (await readFile(path.join(root, `public/brand/icons/svg/ic-${icon}-${tone}.svg`))).toString("base64");
    const pat = light ? patternLight : pattern;
    const W = 1200, H = 900;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
        <pattern id="p" width="140" height="140" patternUnits="userSpaceOnUse"><image href="data:image/svg+xml;base64,${pat}" width="140" height="140"/></pattern>
        <linearGradient id="sw" x1="0" x2="1"><stop offset="0" stop-color="#E30613"/><stop offset=".55" stop-color="#F59E0B"/><stop offset="1" stop-color="#FFC20E"/></linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <rect width="${W}" height="${H}" fill="url(#p)" opacity="${light ? 1 : 0.9}"/>
      <circle cx="${W / 2}" cy="${H / 2}" r="250" fill="${light ? "#FFFFFF" : "#0F1B3D"}" opacity="${light ? 0.75 : 0.35}"/>
      <image href="data:image/svg+xml;base64,${ic}" x="${W / 2 - 190}" y="${H / 2 - 190}" width="380" height="380"/>
      <rect y="${H - 14}" width="${W}" height="14" fill="url(#sw)"/>
    </svg>`;
    const buf = await sharp(Buffer.from(svg)).webp({ quality: 72 }).toBuffer();
    const name = `${icon}-${i + 1}.webp`;
    await writeFile(path.join(out, name), buf);
    const tiny = await sharp(buf).resize(12, 9).webp({ quality: 40 }).toBuffer();
    blur[name] = `data:image/webp;base64,${tiny.toString("base64")}`;
  }
}
await writeFile(path.join(root, "prisma", "placeholder-blur.json"), JSON.stringify(blur, null, 0));
console.log(`Generated ${Object.keys(blur).length} placeholders in public/placeholders`);
