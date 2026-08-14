import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

test("subject toolbar keeps Chemistry hierarchy at compact desktop widths", async () => {
  const css = await read("assets/css/subject-toolbar-parity.css");
  assert.match(css, /\.subject-topbar>\*\{min-width:0\}/);
  assert.match(css, /\.subject-desktop-nav\{[^}]*min-width:max-content[^}]*white-space:nowrap/);
  assert.match(css, /\.subject-desktop-nav button,\.subject-desktop-nav a\{[^}]*white-space:nowrap[^}]*word-break:keep-all/);
  const compact = css.slice(css.indexOf("@media(max-width:940px)"), css.indexOf("@media(max-width:700px)"));
  assert.match(compact, /\.subject-topbar\{grid-template-columns:minmax\(0,1fr\) auto\}/);
  assert.match(compact, /\.subject-desktop-nav\{grid-column:1\/-1;grid-row:2;justify-self:center\}/);
  assert.match(compact, /\.subject-top-actions\{grid-column:2;grid-row:1\}/);
});

test("narrow viewport cannot re-enable the desktop toolbar even in forced desktop mode", async () => {
  const css = await read("assets/css/subject-toolbar-parity.css");
  const narrowStart = css.indexOf("@media(max-width:700px)");
  const mobileDatasetStart = css.indexOf('html[data-device-layout="mobile"] body');
  assert.ok(narrowStart >= 0 && mobileDatasetStart > narrowStart);
  const narrow = css.slice(narrowStart, mobileDatasetStart);
  assert.match(narrow, /\.subject-desktop-nav,\.subject-top-actions \.bean-wallet,\.subject-top-actions \.science-portal-link\{display:none\}/);
  assert.match(narrow, /\.subject-mobile-nav\{[^}]*display:grid/);
});

test("all subject-shell pages pin the toolbar fix while Chemistry remains the master implementation", async () => {
  for (const subject of ["physics", "biology", "earth-science"]) {
    const html = await read(`subjects/${subject}/index.html`);
    assert.match(html, /subject-shell\.css\?v=20260812-subjects2/);
    assert.match(html, /subject-toolbar-parity\.css\?v=20260814-toolbarfix1/);
    assert.match(html, /subject-toolbar-parity\.js\?v=20260813-chemistry-master1/);
  }
  const chemistry = await read("subjects/chemistry/index.html");
  assert.match(chemistry, /class="lobby-topbar"/);
  assert.match(chemistry, /class="desktop-tabs"/);
  assert.match(chemistry, /class="topbar-actions"/);
});
