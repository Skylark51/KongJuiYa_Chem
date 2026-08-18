import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

test("subject toolbar CSS entrypoint delegates to one unified master", async () => {
  const entry = await read("assets/css/subject-toolbar.css");
  const imports = entry.match(/@import url\([^)]*\);/g) || [];
  assert.equal(imports.length, 1);
  assert.match(entry, /subject-toolbar\/unified\.css\?v=20260818-unified1/);
  assert.doesNotMatch(entry, /\.subject-topbar\s*\{/);
});

test("subject toolbar keeps Chemistry hierarchy at compact desktop widths", async () => {
  const unified = await read("assets/css/subject-toolbar/unified.css");
  assert.match(unified, /\[data-subject-toolbar="top"\]>\*\{min-width:0\}/);
  assert.match(unified, /\.subject-desktop-nav\{display:flex;min-width:max-content/);
  assert.match(unified, /@media\(max-width:940px\)/);
  assert.match(unified, /grid-column:1\/-1;grid-row:2;justify-self:center/);
});

test("narrow viewport cannot re-enable the desktop toolbar even in forced desktop mode", async () => {
  const unified = await read("assets/css/subject-toolbar/unified.css");
  assert.match(unified, /\.subject-desktop-nav\{display:none!important\}/);
  assert.match(unified, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
});

test("toolbar JavaScript uses one markup renderer, icon set, economy adapter, and mount lifecycle", async () => {
  const entry = await read("assets/js/subject-toolbar.js");
  const mount = await read("assets/js/subject-toolbar/mount.js");
  const markup = await read("assets/js/subject-toolbar/markup.js");
  const icons = await read("assets/js/subject-toolbar/icons.js");
  const beans = await read("assets/js/subject-toolbar/beans.js");

  assert.match(entry, /import \{ startSubjectToolbar \} from "\.\/subject-toolbar\/mount\.js";/);
  assert.doesNotMatch(entry, /querySelector|localStorage|requestAnimationFrame/);
  assert.match(mount, /from "\.\/markup\.js"/);
  assert.match(mount, /from "\.\/icons\.js"/);
  assert.match(mount, /from "\.\/beans\.js"/);
  assert.match(markup, /data-subject-toolbar="top"/);
  assert.match(markup, /data-subject-toolbar="bottom"/);
  assert.match(icons, /SUBJECT_NAV_ICONS/);
  assert.match(beans, /SHARED_CHEMISTRY_SAVE_KEY/);
  assert.doesNotMatch(beans, /querySelector\("\.subject-topbar"\)/);
});

test("all subject-shell pages pin the modular toolbar entrypoints while Chemistry remains the master implementation", async () => {
  for (const subject of ["physics", "biology", "earth-science"]) {
    const html = await read(`subjects/${subject}/index.html`);
    assert.match(html, /subject-shell\.css\?v=20260812-subjects2/);
    assert.match(html, /subject-toolbar\.css\?v=20260818-unified1/);
    assert.match(html, /subject-toolbar\.js\?v=20260818-unified1/);
  }
  const chemistry = await read("subjects/chemistry/index.html");
  assert.match(chemistry, /subject-toolbar\.css\?v=20260818-unified1/);
  assert.match(chemistry, /subject-toolbar\.js\?v=20260818-unified1/);
});
