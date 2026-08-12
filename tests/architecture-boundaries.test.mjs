import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");

test("question-specific display code is owned by the game page, not cosmetics", () => {
  const gamePage = read("assets/js/game-page.js");
  const cosmeticsEntry = read("assets/js/game-cosmetics-entry.js");

  assert.match(gamePage, /import "\.\/redox-single-line\.js";/);
  assert.doesNotMatch(cosmeticsEntry, /redox-single-line/);
});

test("game page exposes three stable stylesheet entrypoints", () => {
  const html = read("콩쥐야_줘때써.html");
  const base = read("assets/css/game-runtime-base.css");
  const features = read("assets/css/game-runtime-features.css");
  const links = html.match(/<link[^>]+rel="stylesheet"[^>]*>/g) || [];

  assert.equal(links.length, 3, "game page should not expose the historical patch-stack as individual links");
  assert.match(html, /game-runtime-base\.css/);
  assert.match(html, /id="layered-scene-animation-runtime"[^>]+game-asset-animation\.css/);
  assert.match(html, /game-runtime-features\.css/);
  assert.doesNotMatch(html, /kongjwi-parts\.css/);

  assert.match(base, /game\.css/);
  assert.match(base, /oxidation-number-keypad\.css/);
  assert.doesNotMatch(base, /kongjwi-parts\.css/);
  assert.match(features, /layered-scene-runtime\.css/);
  assert.match(features, /opening-countdown-flow\.css/);
});

test("feature modules do not inject runtime style tags", () => {
  for (const path of ["assets/js/game-page.js", "assets/js/court-servant-effect.js"]) {
    const source = read(path);
    assert.doesNotMatch(source, /createElement\(["']style["']\)/, `${path} must use static CSS assets`);
  }

  const runtimeCss = read("assets/css/layered-scene-runtime.css");
  assert.match(runtimeCss, /court-servant-effect\.css/);
  assert.match(runtimeCss, /scene-kongjwi\[data-sprite-mode="sheet"\]/);
});

test("base tool placement is not duplicated in aspect-protection CSS", () => {
  const source = read("assets/css/scene-source-aspect-fix.css");
  assert.doesNotMatch(source, /\.scene-tool\[data-sprite-mode="sheet"\][\s\S]*?--scene-x/);
});

test("project structure document describes the current manifest renderer", () => {
  const structure = read("docs/PROJECT_STRUCTURE.md");
  assert.match(structure, /assets\/art\/game-scene\/manifest\.json/);
  assert.match(structure, /2048 x 1152/);
  assert.doesNotMatch(structure, /scene-art-loader\.js.*핵심|photoreal\/kongjwi-keyposes\.png/);
});
