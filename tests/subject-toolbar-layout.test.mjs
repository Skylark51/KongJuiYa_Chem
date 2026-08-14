import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

test("subject toolbar CSS entrypoint delegates layout, controls, and responsive policy", async () => {
  const entry = await read("assets/css/subject-toolbar-parity.css");
  const imports = entry.match(/@import url\([^)]*\);/g) || [];
  assert.equal(imports.length, 3);
  assert.match(entry, /subject-toolbar\/layout\.css\?v=20260814-toolbar-modules1/);
  assert.match(entry, /subject-toolbar\/controls\.css\?v=20260814-toolbar-modules1/);
  assert.match(entry, /subject-toolbar\/responsive\.css\?v=20260814-toolbar-modules1/);
  assert.doesNotMatch(entry, /\.subject-topbar\s*\{/);
});

test("subject toolbar keeps Chemistry hierarchy at compact desktop widths", async () => {
  const layout = await read("assets/css/subject-toolbar/layout.css");
  const controls = await read("assets/css/subject-toolbar/controls.css");
  const responsive = await read("assets/css/subject-toolbar/responsive.css");
  assert.match(layout, /\.subject-topbar>\*\{min-width:0\}/);
  assert.match(layout, /\.subject-desktop-nav\{[^}]*min-width:max-content[^}]*white-space:nowrap/);
  assert.match(controls, /\.subject-desktop-nav button,\.subject-desktop-nav a\{[^}]*white-space:nowrap[^}]*word-break:keep-all/);
  const compact = responsive.slice(responsive.indexOf("@media(max-width:940px)"), responsive.indexOf("@media(max-width:700px)"));
  assert.match(compact, /\.subject-topbar\{grid-template-columns:minmax\(0,1fr\) auto\}/);
  assert.match(compact, /\.subject-desktop-nav\{grid-column:1\/-1;grid-row:2;justify-self:center\}/);
  assert.match(compact, /\.subject-top-actions\{grid-column:2;grid-row:1\}/);
});

test("narrow viewport cannot re-enable the desktop toolbar even in forced desktop mode", async () => {
  const responsive = await read("assets/css/subject-toolbar/responsive.css");
  const narrowStart = responsive.indexOf("@media(max-width:700px)");
  const mobileDatasetStart = responsive.indexOf('html[data-device-layout="mobile"] body');
  assert.ok(narrowStart >= 0 && mobileDatasetStart > narrowStart);
  const narrow = responsive.slice(narrowStart, mobileDatasetStart);
  assert.match(narrow, /\.subject-desktop-nav,\.subject-top-actions \.bean-wallet,\.subject-top-actions \.science-portal-link\{display:none\}/);
  assert.match(narrow, /\.subject-mobile-nav\{[^}]*display:grid/);
});

test("toolbar JavaScript is split by DOM discovery, Chemistry contract, economy, and mount lifecycle", async () => {
  const entry = await read("assets/js/subject-toolbar-parity.js");
  const mount = await read("assets/js/subject-toolbar/mount.js");
  const nodes = await read("assets/js/subject-toolbar/nodes.js");
  const contract = await read("assets/js/subject-toolbar/chemistry-contract.js");
  const beans = await read("assets/js/subject-toolbar/beans.js");

  assert.match(entry, /import \{ startSubjectToolbarParity \} from "\.\/subject-toolbar\/mount\.js";/);
  assert.doesNotMatch(entry, /querySelector|localStorage|requestAnimationFrame/);
  assert.match(mount, /from "\.\/nodes\.js"/);
  assert.match(mount, /from "\.\/chemistry-contract\.js"/);
  assert.match(mount, /from "\.\/beans\.js"/);
  assert.match(nodes, /collectSubjectToolbarNodes/);
  assert.match(contract, /applyChemistryToolbarClassContract/);
  assert.match(contract, /ensureSharedBeanWallet/);
  assert.match(beans, /SHARED_CHEMISTRY_SAVE_KEY/);
  assert.doesNotMatch(beans, /querySelector\("\.subject-topbar"\)/);
});

test("all subject-shell pages pin the modular toolbar entrypoints while Chemistry remains the master implementation", async () => {
  for (const subject of ["physics", "biology", "earth-science"]) {
    const html = await read(`subjects/${subject}/index.html`);
    assert.match(html, /subject-shell\.css\?v=20260812-subjects2/);
    assert.match(html, /subject-toolbar-parity\.css\?v=20260814-toolbar-modules1/);
    assert.match(html, /subject-toolbar-parity\.js\?v=20260814-toolbar-modules1/);
  }
  const chemistry = await read("subjects/chemistry/index.html");
  assert.match(chemistry, /class="lobby-topbar"/);
  assert.match(chemistry, /class="desktop-tabs"/);
  assert.match(chemistry, /class="topbar-actions"/);
});
