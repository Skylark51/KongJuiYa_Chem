import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "assets/그림/게임-장면/manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const skins = ["underlayer", "classic-red", "blue-scholar", "field-work", "ragged", "night-court"];
const tools = ["wood", "brass", "celadon", "moon"];

function existingFile(relative) {
  const clean = relative.split("?")[0];
  assert.equal(fs.existsSync(path.join(root, clean)), true, `${clean} must exist`);
}

function pngSignature(relative) {
  const clean = relative.split("?")[0];
  const buffer = fs.readFileSync(path.join(root, clean));
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", `${clean} must be PNG`);
}

test("scene manifest owns the canonical Korean Kongjwi asset contract", () => {
  assert.equal(manifest.version, "20260821-korean-assets1");
  assert.equal(manifest.runtimePolicy.kongjwiMotionPolicy, "source-locked-intact-standard-outfits-night-court-summon-derived");
  assert.equal(manifest.runtimePolicy.kongjwiFramePolicy, "source-character-pixels-whole-body-pose-only");
  assert.equal(manifest.runtimePolicy.toolMotionPolicy, "source-master-grip-pivot-co-registered");
  assert.equal(manifest.runtimePolicy.uniformScalePolicy, "shared-2048x1152-contain");
  assert.equal(manifest.runtimePolicy.nightCourtMotionSource, "assets/그림/개발자료/궁중복-소환/콩쥐-소환-원본.png");
  assert.equal(manifest.responsive.mobile.scaleMode, "uniform-contain");
  assert.deepEqual(manifest.placements.tool, manifest.placements.kongjwi);
  assert.ok(manifest.layers["scene-tool"] > manifest.layers["scene-kongjwi"]);
  assert.ok(manifest.layers["scene-foreground"] < manifest.layers["scene-kongjwi"]);
});

test("all production Kongjwi and bucket sheets are present PNGs", () => {
  for (const skin of skins) {
    const sheet = manifest.assets.kongjwi[skin].sheet;
    assert.equal(manifest.availability[sheet], true, skin);
    existingFile(sheet);
    pngSignature(sheet);
    const fallback = manifest.assets.kongjwi[skin].fallback;
    if (fallback) {
      assert.match(fallback, /^assets\/그림\//, `${skin} fallback must be canonical Korean path`);
      existingFile(fallback);
    }
  }
  for (const tool of tools) {
    const item = manifest.assets.tools[tool];
    assert.equal(manifest.availability[item.sheet], true, tool);
    existingFile(item.sheet);
    pngSignature(item.sheet);
    assert.match(item.fallback, /^assets\/그림\/공용\/원본\/바가지\//);
    existingFile(item.fallback);
  }
});

test("night-court servant effect uses promoted Korean runtime sheets", () => {
  const effect = fs.readFileSync(path.join(root, "assets/js/court-servant-effect.js"), "utf8");
  assert.match(effect, /assets\/그림\/게임-장면\/효과\/궁중복-하인\/돌쇠-동작\.png/);
  assert.match(effect, /assets\/그림\/게임-장면\/효과\/궁중복-하인\/물방울-동작\.png/);
  assert.doesNotMatch(effect, /assets\/art\//);
  existingFile("assets/그림/게임-장면/효과/궁중복-하인/돌쇠-동작.png");
  existingFile("assets/그림/게임-장면/효과/궁중복-하인/물방울-동작.png");
  existingFile(manifest.runtimePolicy.nightCourtMotionSource);
});

test("part composer points only at Korean part and tool roots", () => {
  const composer = fs.readFileSync(path.join(root, "assets/js/kongjwi-part-composer.js"), "utf8");
  assert.match(composer, /assets\/그림\/공용\/콩쥐\/파츠\//);
  assert.match(composer, /assets\/그림\/공용\/원본\/바가지\/나무-바가지\.png/);
  assert.doesNotMatch(composer, /assets\/art\//);
});
