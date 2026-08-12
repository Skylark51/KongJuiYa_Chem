import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

const [framing, desktop, jarAuthored] = await Promise.all([
  read("assets/css/shop-tool-framing.css"),
  read("assets/css/shop-desktop.css"),
  read("assets/css/shop-jar-authored-desktop.css")
]);

assert.match(framing, /^@import url\("\.\/shop-desktop\.css\?v=20260812-desktop2"\);/);
assert.match(framing, /@import url\("\.\/shop-jar-authored-desktop\.css\?v=20260812-jar-full1"\);/);
assert.match(desktop, /@media \(min-width: 1061px\)/);
assert.match(desktop, /html\[data-device-layout="desktop"\] \.shop-page \.shop-workspace \{[\s\S]*?min-height: 0;/);
assert.match(desktop, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(desktop, /\.shop-item \{[\s\S]*?aspect-ratio: auto;[\s\S]*?grid-template-rows: 210px auto 48px;/);
assert.match(desktop, /\.shop-item-visual \{[\s\S]*?height: 210px;[\s\S]*?aspect-ratio: auto;/);
assert.match(desktop, /\.shop-item-copy \{[\s\S]*?display: grid;[\s\S]*?gap: 10px;[\s\S]*?min-height: 82px;/);
assert.match(desktop, /\.shop-item-meta \{[\s\S]*?margin-top: 0;[\s\S]*?padding-top: 10px;[\s\S]*?border-top: 1px solid rgba\(226, 190, 126, \.12\);/);
assert.match(desktop, /\.shop-item-action,[\s\S]*?\.shop-item-try-on \{[\s\S]*?min-height: 48px;[\s\S]*?border-radius: 14px;[\s\S]*?font-size: 12px;/);
assert.match(desktop, /max-width: 1200px/);
assert.match(desktop, /grid-template-rows: 184px auto 46px/);
assert.match(desktop, /object-fit: contain !important/);
assert.doesNotMatch(desktop, /data-device-layout="mobile"|data-mobile-ui="shadcn"/);

assert.match(jarAuthored, /\.shop-item-visual\.shop-jar-visual::after \{[\s\S]*?content: none !important;[\s\S]*?display: none !important;[\s\S]*?background-image: none !important;/);
assert.match(jarAuthored, /\.shop-asset-jar\.is-authored-jar \{[\s\S]*?position: relative;[\s\S]*?z-index: 2;[\s\S]*?overflow: visible !important;/);
assert.match(jarAuthored, /\.shop-jar-image \{[\s\S]*?object-fit: contain !important;[\s\S]*?object-position: center center !important;/);
assert.doesNotMatch(jarAuthored, /data-device-layout="mobile"|data-mobile-ui="shadcn"/);

console.log("shop-desktop-layout: authored jar PNGs override the legacy atlas while desktop footer and mobile contracts stay intact");
