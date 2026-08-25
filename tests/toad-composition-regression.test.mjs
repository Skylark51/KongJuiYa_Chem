import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = pathname => fs.readFileSync(new URL(`../${pathname}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("assets/그림/게임-장면/manifest.json"));

const expressionPaths = Object.freeze({
  default: "assets/그림/공용/두꺼비/표정/기본.png",
  correct: "assets/그림/공용/두꺼비/표정/기쁨.png",
  combo: "assets/그림/공용/두꺼비/표정/존나기쁨.png",
  wrong: "assets/그림/공용/두꺼비/표정/슬픔.png",
  angry: "assets/그림/공용/두꺼비/표정/화남.png",
  rage: "assets/그림/공용/두꺼비/표정/화남.png",
  surprised: "assets/그림/공용/두꺼비/표정/놀람.png",
  confused: "assets/그림/공용/두꺼비/표정/심오함.png",
  timeout: "assets/그림/공용/두꺼비/표정/눈물.png",
  "idle-blink": "assets/그림/공용/두꺼비/표정/지루함.png"
});

const shopToadPaths = Object.freeze({
  "field-brown": "assets/그림/공용/원본/두꺼비/기본-갈색.png",
  "gold-worker": "assets/그림/게임-장면/두꺼비/스킨/황금-일꾼.png",
  "jade-guard": "assets/그림/게임-장면/두꺼비/스킨/비취-수호.png",
  "star-night": "assets/그림/게임-장면/두꺼비/스킨/별밤.png"
});

test("default toad uses canonical Korean expression PNGs", () => {
  const fieldBrown = manifest.assets.toads["field-brown"];
  assert.equal(fieldBrown.mode, "full-expression");
  assert.equal(fieldBrown.skin, undefined);
  assert.deepEqual(manifest.assets.toadFallback, expressionPaths);
  assert.equal(JSON.stringify(manifest).includes("assets/images/toad-expressions"), false);
  for (const pathname of new Set(Object.values(expressionPaths))) {
    assert.equal(manifest.availability[pathname], true, `missing availability entry: ${pathname}`);
  }
});

test("premium toads keep their production PNG skin and validated overlay contract", () => {
  for (const key of ["gold-worker", "jade-guard", "star-night"]) {
    const definition = manifest.assets.toads[key];
    assert.equal(definition.mode, "skin-motion");
    assert.equal(definition.skin, shopToadPaths[key]);
    assert.equal(manifest.availability[definition.skin], true);
  }
  assert.deepEqual(manifest.assets.effects.toadExpression, {
    path: "assets/그림/게임-장면/두꺼비/표정-오버레이-동작.png",
    enabled: false,
    validation: "truncated-png"
  });
  assert.deepEqual(manifest.sprites.toadExpression.cell, { width: 512, height: 384 });
  assert.equal(manifest.sprites.toadExpression.frames, 10);
  assert.equal(Object.keys(manifest.frames.toadExpression).length, 10);
});

test("bean shop previews map all four toads to canonical Korean PNG paths", () => {
  const shop = read("assets/js/shop-navigation.js");
  for (const [key, pathname] of Object.entries(shopToadPaths)) {
    assert.ok(shop.includes(`\"${key}\":`) && shop.includes(pathname), `missing shop PNG mapping: ${key}`);
  }
  assert.ok(shop.includes('if (item.category === "toad") return createToadAsset(item);'));
  assert.ok(shop.includes('createImage(versionedSource, "shop-asset shop-asset-toad"'));
  assert.doesNotMatch(shop, /assets\/images\/toad-expressions/);
});

test("CSS seats existing toad PNGs for each jar and removes duplicate mobile water UI", () => {
  const sceneCss = read("assets/css/toad-composition-fix.css");
  const mobileCss = read("assets/css/mobile-quiz-balance.css");
  const html = read("콩쥐야_줘때써.html");
  assert.match(sceneCss, /data-toad-mode="full-fallback"/);
  assert.match(sceneCss, /data-toad-mode="skin-only"/);
  assert.match(read("assets/css/game-asset-animation.css"), /data-toad-mode="skin-only"/);
  assert.match(sceneCss, /clip-path:\s*ellipse\(/);
  for (const jar of ["celadon", "moon-white", "night-lacquer"]) assert.match(sceneCss, new RegExp(`data-jar-skin="${jar}"`));
  assert.doesNotMatch(sceneCss, /hue-rotate|sepia\(|saturate\(/);
  assert.match(mobileCss, /\.scene-animation-zone \.scene-water-meter\s*\{\s*display:\s*none\s*!important;/s);
  assert.match(html, /id="layered-scene-animation-runtime"[^>]*game-asset-animation\.css\?v=[^"]+/);
});

test("celadon front artwork can never cover the toad", () => {
  const polishCss = read("assets/css/jar-mouth-hole-polish.css");
  const front = polishCss.match(/data-jar-skin="celadon"[^\{]*\.scene-jar-front\s*\{[\s\S]*?z-index:\s*(\d+)\s*!important;/);
  const toad = polishCss.match(/data-jar-skin="celadon"[^\{]*\.scene-toad-skin,[\s\S]*?z-index:\s*(\d+)\s*!important;/);
  assert.ok(front);
  assert.ok(toad);
  assert.ok(Number(toad[1]) > Number(front[1]));
  assert.match(polishCss, /clip-path:\s*ellipse\(50% 48% at 50% 54%\)\s*!important;/);
});
