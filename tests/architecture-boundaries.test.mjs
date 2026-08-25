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
  assert.equal(links.length, 3);
  assert.match(html, /game-runtime-base\.css/);
  assert.match(html, /id="layered-scene-animation-runtime"[^>]+game-asset-animation\.css/);
  assert.match(html, /game-runtime-features\.css/);
  assert.match(base, /game\.css/);
  assert.match(features, /layered-scene-runtime\.css/);
});

test("feature modules do not inject runtime style tags", () => {
  for (const path of ["assets/js/game-page.js", "assets/js/court-servant-effect.js"]) {
    assert.doesNotMatch(read(path), /createElement\(["']style["']\)/, `${path} must use static CSS assets`);
  }
});

test("current project structure documents the canonical Korean scene manifest", () => {
  const structure = read("docs/PROJECT_STRUCTURE.md");
  assert.match(structure, /assets\/그림\/게임-장면\/manifest\.json/);
  assert.match(structure, /2048 x 1152/);
  assert.doesNotMatch(structure, /scene-art-loader\.js.*핵심|photoreal\/kongjwi-keyposes\.png/);
});

test("retired parallel art trees are physically absent", () => {
  assert.equal(fs.existsSync("assets/art/game-scene-v2"), false);
  assert.equal(fs.existsSync("assets/art/game-scene-precision-v1"), false);
  assert.equal(fs.existsSync("assets/art/kongjwi"), false);
  assert.equal(fs.existsSync("assets/art/kongjwi-parts"), false);
});
