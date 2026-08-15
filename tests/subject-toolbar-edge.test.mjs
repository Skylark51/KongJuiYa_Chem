import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

test("non-chemistry mobile toolbars mirror Chemistry edge-to-edge geometry", async () => {
  const [chemistryTop, chemistryBottom, responsive, entry] = await Promise.all([
    read("assets/css/mobile-fixed-shell.css"),
    read("assets/css/mobile-unified-shell.css"),
    read("assets/css/subject-toolbar/responsive.css"),
    read("assets/css/subject-toolbar-parity.css")
  ]);

  assert.match(chemistryTop, /right: 0 !important;/);
  assert.match(chemistryTop, /left: 0 !important;/);
  assert.match(chemistryTop, /width: 100% !important;/);
  assert.match(chemistryBottom, /\.mobile-bottom-nav \{[\s\S]*?left: 0;[\s\S]*?right: 0;[\s\S]*?bottom: 0;/);

  const topbarContract = ".subject-topbar{position:fixed;z-index:120;top:0!important;right:0!important;left:0!important;width:100%!important;";
  const bottombarContract = ".subject-mobile-nav{position:fixed;z-index:120;left:0!important;right:0!important;bottom:0!important;";
  assert.equal(responsive.includes(topbarContract), true);
  assert.equal(responsive.includes(bottombarContract), true);
  assert.equal(responsive.includes("bottom:max(7px"), false);
  assert.equal(responsive.includes("left:7px;right:7px"), false);
  assert.match(responsive, /border-radius:0!important/);

  assert.match(entry, /responsive\.css\?v=20260815-toolbar-edge1/);
  for (const path of [
    "subjects/physics/index.html",
    "subjects/biology/index.html",
    "subjects/earth-science/index.html"
  ]) {
    const html = await read(path);
    assert.match(html, /subject-toolbar-parity\.css\?v=20260815-toolbar-edge1/);
  }
});
