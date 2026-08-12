import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = pathname => fs.readFileSync(new URL(`../${pathname}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("assets/art/game-scene/manifest.json"));

const expressionPaths = Object.freeze({
  default: "assets/images/toad-expressions/기본.png",
  correct: "assets/images/toad-expressions/기쁨.png",
  combo: "assets/images/toad-expressions/존나기쁨.png",
  wrong: "assets/images/toad-expressions/슬픔.png",
  angry: "assets/images/toad-expressions/화남.png",
  rage: "assets/images/toad-expressions/화남.png",
  surprised: "assets/images/toad-expressions/놀람.png",
  confused: "assets/images/toad-expressions/심오함.png",
  timeout: "assets/images/toad-expressions/눈물.png",
  "idle-blink": "assets/images/toad-expressions/지루함.png"
});

test("default toad uses existing complete expression PNGs instead of a missing field-brown skin", () => {
  const fieldBrown = manifest.assets.toads["field-brown"];
  assert.equal(fieldBrown.mode, "full-expression");
  assert.equal(fieldBrown.skin, undefined);
  assert.deepEqual(manifest.assets.toadFallback, expressionPaths);
  assert.equal(JSON.stringify(manifest).includes("assets/art/game-scene/toad/skins/field-brown.png"), false);
  for (const pathname of new Set(Object.values(expressionPaths))) {
    assert.equal(manifest.availability[pathname], true, `missing availability entry: ${pathname}`);
  }
});

test("premium toads keep their uploaded PNG skin and have a validated overlay contract", () => {
  for (const key of ["gold-worker", "jade-guard", "star-night"]) {
    const definition = manifest.assets.toads[key];
    assert.equal(definition.mode, "skin-motion");
    assert.match(definition.skin, new RegExp(`/${key}\\.png$`));
    assert.equal(manifest.availability[definition.skin], true);
  }
  assert.deepEqual(manifest.assets.effects.toadExpression, {
    path: "assets/art/game-scene/toad/expression-overlay-sheet.png",
    enabled: false,
    validation: "truncated-png"
  });
  assert.deepEqual(manifest.sprites.toadExpression.cell, { width: 512, height: 384 });
  assert.equal(manifest.sprites.toadExpression.frames, 10);
  assert.equal(Object.keys(manifest.frames.toadExpression).length, 10);
});

test("bean shop previews use the same production PNG toad skins as gameplay", () => {
  const shop = read("assets/js/shop-navigation.js");
  for (const key of ["field-brown", "gold-worker", "jade-guard", "star-night"]) {
    assert.ok(shop.includes(`"${key}": `) && shop.includes(`${key}.png`), `missing shop PNG mapping: ${key}`);
  }
  assert.ok(shop.includes('if (item.category === "toad") return createToadAsset(item);'));
  assert.ok(shop.includes('createImage(versionedSource, "shop-asset shop-asset-toad"'));
});

test("CSS physically seats existing toad PNGs for each jar and removes duplicate mobile water UI", () => {
  const sceneCss = read("assets/css/toad-composition-fix.css");
  const mobileCss = read("assets/css/mobile-quiz-balance.css");
  const html = read("콩쥐야_줘때써.html");

  assert.match(sceneCss, /data-toad-mode="full-fallback"/);
  assert.match(sceneCss, /data-toad-mode="skin-only"/);
  assert.match(read("assets/css/game-asset-animation.css"), /data-toad-mode="skin-only"/);
  assert.match(sceneCss, /clip-path:\s*ellipse\(/);
  for (const jar of ["celadon", "moon-white", "night-lacquer"]) {
    assert.match(sceneCss, new RegExp(`data-jar-skin="${jar}"`));
  }
  assert.match(sceneCss, /\.scene-kongjwi::before,[\s\S]*\.scene-jar-back::before/);
  assert.match(sceneCss, /existing-toad-correct/);
  assert.match(sceneCss, /existing-toad-droop/);
  assert.doesNotMatch(sceneCss, /hue-rotate|sepia\(|saturate\(/);
  assert.match(mobileCss, /\.scene-animation-zone \.scene-water-meter\s*\{\s*display:\s*none\s*!important;/s);
  assert.match(html, /id="layered-scene-animation-runtime"[^>]*game-asset-animation\.css\?v=[^"]+/);
});

test("celadon front artwork can never cover the toad", () => {
  const polishCss = read("assets/css/jar-mouth-hole-polish.css");
  const front = polishCss.match(/data-jar-skin="celadon"[^\{]*\.scene-jar-front\s*\{[\s\S]*?z-index:\s*(\d+)\s*!important;/);
  const toad = polishCss.match(/data-jar-skin="celadon"[^\{]*\.scene-toad-skin,[\s\S]*?z-index:\s*(\d+)\s*!important;/);

  assert.ok(front, "celadon jar-front z-index override is missing");
  assert.ok(toad, "celadon toad z-index override is missing");
  assert.ok(Number(toad[1]) > Number(front[1]), "toad must render above celadon jar-front artwork");
  assert.match(polishCss, /clip-path:\s*ellipse\(50% 48% at 50% 54%\)\s*!important;/);
});
