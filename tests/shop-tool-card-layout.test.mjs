import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");
const [html, framingCss] = await Promise.all([
  read("shop.html"),
  read("assets/css/shop-tool-framing.css")
]);

const toolPaths = {
  wood: "나무-바가지.png",
  brass: "놋쇠-바가지.png",
  celadon: "청자-바가지.png",
  moon: "월광-바가지.png"
};
for (const [tool, filename] of Object.entries(toolPaths)) {
  assert.match(
    framingCss,
    new RegExp(`공용/원본/바가지/${filename.replace(".", "\\.")}\\?v=20260825-korean-assets1`),
    `${tool} shop card must use the canonical authored Korean-source PNG`
  );
}

const celadonPath = resolve(root, "assets/그림/공용/원본/바가지/청자-바가지.png");
const celadonBlob = execFileSync("git", ["hash-object", celadonPath], { encoding: "utf8" }).trim();
assert.equal(
  celadonBlob,
  "263f52ed4895636bc0a127a105c00ac6a3bde1d9",
  "celadon product PNG must remain the known-good authored source"
);

assert.match(html, /<html[^>]*data-page="shop"/);
assert.match(html, /shop-tool-framing\.css\?v=20260814-tool-card4/);
assert.match(framingCss, /shop-grid\[data-category="tool"\] \.shop-item-visual::before[\s\S]*content: none !important/);
assert.match(framingCss, /shop-grid\[data-category="tool"\] \.shop-asset-tool[\s\S]*aspect-ratio: 8 \/ 5 !important/);
assert.match(framingCss, /shop-grid\[data-category="tool"\] \.shop-asset-tool[\s\S]*background-size: contain !important/);
assert.doesNotMatch(framingCss, /\.\.\/art\//);
assert.doesNotMatch(framingCss, /background-size:\s*800%/);
assert.doesNotMatch(framingCss, /translateY\(|scale\(/);

console.log("shop-tool-card-layout: canonical authored bucket PNGs are centered without retired art paths");
