// Lodestar favicon raster suite — regenerates every raster asset from the SVG
// masters in this directory. The masters are the source of truth; generated
// PNGs/ICO are never hand-edited.
//
// Dependency: @resvg/resvg-js (the only npm dep; no font files needed — the
// "L" monogram is baked into the masters as outlined paths).
//
// Run (from any scratch dir, node 18+):
//   npm install @resvg/resvg-js
//   node <repo>/assets/favicon/generate.mjs
// Then build favicon.ico:
//   python <repo>/assets/favicon/make_ico.py   (needs Pillow)
//
// Outputs (written to src/lodestar/static/):
//   favicon.svg          copy of favicon-512.svg (modern browsers)
//   icon-512.png         512x512 from the full master (PWA/manifest/share)
//   apple-touch-icon.png 180x180, mark at ~72% on solid #16304F (iOS
//                        composites transparency onto black, so full-bleed)
//   favicon-32.png       32x32 from the simplified 32px master
//   favicon-16.png       16x16 from the simplified 16px master
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Resolve @resvg/resvg-js from this file's tree first, then from the cwd
// (so a gitignored scratch dir with node_modules works too).
let Resvg;
try {
  ({ Resvg } = createRequire(import.meta.url)("@resvg/resvg-js"));
} catch {
  ({ Resvg } = createRequire(join(process.cwd(), "package.json"))("@resvg/resvg-js"));
}

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC = join(HERE, "..", "..", "src", "lodestar", "static");

const render = (svg, px) =>
  new Resvg(svg, { fitTo: { mode: "width", value: px } }).render().asPng();

const master512 = readFileSync(join(HERE, "favicon-512.svg"), "utf8");
const master32 = readFileSync(join(HERE, "favicon-32.svg"), "utf8");
const master16 = readFileSync(join(HERE, "favicon-16.svg"), "utf8");

// favicon.svg — the full master, served as-is.
copyFileSync(join(HERE, "favicon-512.svg"), join(STATIC, "favicon.svg"));

// icon-512.png — full master at native size, transparent outside the shield.
writeFileSync(join(STATIC, "icon-512.png"), render(master512, 512));

// apple-touch-icon.png — wrap the full master at ~72% scale, centered, on a
// full-bleed solid #16304F square (no transparency), then render at 180.
const inner = master512
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#16304F"/>
  <g transform="translate(71.68 71.68) scale(.72)">${inner}</g>
</svg>`;
writeFileSync(join(STATIC, "apple-touch-icon.png"), render(apple, 180));

// favicon-32.png / favicon-16.png — from the simplified masters.
writeFileSync(join(STATIC, "favicon-32.png"), render(master32, 32));
writeFileSync(join(STATIC, "favicon-16.png"), render(master16, 16));

console.log("wrote favicon.svg, icon-512.png, apple-touch-icon.png, favicon-32.png, favicon-16.png");
console.log("next: python assets/favicon/make_ico.py  (builds favicon.ico)");
