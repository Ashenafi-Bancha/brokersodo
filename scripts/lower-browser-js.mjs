/**
 * Runs after `next build`. Libraries ship newer JavaScript syntax (?. ?? catch{} class
 * fields …) that Next.js does not convert, so older phone browsers fail to run parts of
 * the site. This rewrites every browser chunk to ES2018 syntax (roughly Chrome 64 /
 * Safari 12 and newer) with esbuild. Behaviour is unchanged; only syntax is lowered.
 *
 *   node scripts/lower-browser-js.mjs [.next directory]
 */
import { transform } from "esbuild";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TARGET = ["es2018", "chrome64", "safari12", "firefox67", "edge79"];
const root = path.resolve(process.argv[2] ?? ".next", "static", "chunks");

async function* jsFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jsFiles(p);
    else if (entry.name.endsWith(".js")) yield p;
  }
}

let changed = 0;
let total = 0;
const failed = [];
for await (const file of jsFiles(root)) {
  total++;
  const src = await readFile(file, "utf8");
  try {
    const out = await transform(src, {
      loader: "js",
      format: undefined, // keep the chunk's own wrapper exactly as webpack wrote it
      target: TARGET,
      // Destructuring runs natively on every target; esbuild only refuses to rewrite it
      // because of a rare Safari bug, so it is left as written.
      supported: { destructuring: true },
      minifyWhitespace: true,
      minifySyntax: false,
      minifyIdentifiers: false,
      legalComments: "none",
      charset: "utf8",
    });
    if (out.code !== src) {
      await writeFile(file, out.code);
      changed++;
    }
  } catch (e) {
    failed.push(`${path.relative(root, file)}: ${String(e.message).split("\n")[0]}`);
  }
}
console.log(`lower-browser-js: ${changed}/${total} chunks rewritten for older browsers`);
if (failed.length) {
  console.error(`lower-browser-js: ${failed.length} chunk(s) could not be lowered:\n${failed.join("\n")}`);
  process.exitCode = 1;
}
