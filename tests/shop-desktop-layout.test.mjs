import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

const [framing, desktop] = await Promise.all([
  read("assets/css/shop-tool-framing.css"),
  read("assets/css/shop-desktop.css")
]);

assert.match(framing, /^@import url\("\.\/shop-desktop\.css\?v=20260812-desktop1"\);/);
assert.match(desktop, /@media \(min-width: 1061px\)/);
assert.match(desktop, /html\[data-device-layout="desktop"\] \.shop-page \.shop-workspace \{[\s\S]*?min-height: 0;/);
assert.match(desktop, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(desktop, /\.shop-item \{[\s\S]*?aspect-ratio: auto;[\s\S]*?grid-template-rows: 210px auto 42px;/);
assert.match(desktop, /\.shop-item-visual \{[\s\S]*?height: 210px;[\s\S]*?aspect-ratio: auto;/);
assert.match(desktop, /max-width: 1200px/);
assert.match(desktop, /grid-template-rows: 184px auto 40px/);
assert.match(desktop, /object-fit: contain !important/);
assert.doesNotMatch(desktop, /data-device-layout="mobile"|data-mobile-ui="shadcn"/);

console.log("shop-desktop-layout: desktop catalog stays compact without altering the mobile card contract");
