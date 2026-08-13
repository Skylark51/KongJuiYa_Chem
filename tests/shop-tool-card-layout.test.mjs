import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");
const [html, framingCss] = await Promise.all([
  read("shop.html"),
  read("assets/css/shop-tool-framing.css")
]);

for (const tool of ["wood", "brass", "celadon", "moon"]) {
  assert.match(
    framingCss,
    new RegExp(`kongjwi-tools/${tool}\\.png\\?v=20260807-tool-card3`),
    `${tool} shop card must use the dedicated product PNG`
  );
}

assert.match(html, /<html[^>]*data-page="shop"/);
assert.match(html, /shop-tool-framing\.css\?v=20260807-tool-card3/);
assert.match(framingCss, /shop-grid\[data-category="tool"\] \.shop-item-visual::before[\s\S]*content: none !important/);
assert.match(framingCss, /shop-grid\[data-category="tool"\] \.shop-asset-tool[\s\S]*aspect-ratio: 8 \/ 5 !important/);
assert.match(framingCss, /shop-grid\[data-category="tool"\] \.shop-asset-tool[\s\S]*background-size: contain !important/);
assert.match(framingCss, /shop-grid\[data-category="tool"\] \.shop-asset-tool[\s\S]*background-position: center center !important/);
assert.doesNotMatch(framingCss, /game-scene\/tools\/(wood|brass|celadon|moon)\/pour-sheet\.png/);
assert.doesNotMatch(framingCss, /background-size:\s*800%/);
assert.doesNotMatch(framingCss, /translateY\(|scale\(/);

console.log("shop-tool-card-layout: dedicated product PNGs are centered without animation-sheet cropping");
