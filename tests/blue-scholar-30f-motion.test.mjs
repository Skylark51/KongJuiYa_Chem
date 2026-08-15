import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const text = path => read(path).toString("utf8");
const pngSize = path => { const b = read(path); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test("blue scholar canonical 30f sheet has true fixed 5x6 production cells", () => {
  assert.deepEqual(pngSize("assets/art/game-scene-v2/kongjwi/blue-scholar/pour-sheet.png"), [1280, 2304]);
  assert.deepEqual(pngSize("assets/art/game-scene/kongjwi/blue-scholar/pour-sheet.png"), [1280, 2304]);
  assert.deepEqual(pngSize("assets/art/game-scene-v2/kongjwi/blue-scholar/preview.png"), [256, 384]);
  const manifest = JSON.parse(text("assets/art/game-scene/manifest.json"));
  const blue = manifest.assets.kongjwi["blue-scholar"];
  assert.equal(blue.sprite.frames, 30);
  assert.equal(blue.sprite.columns, 5);
  assert.equal(blue.sprite.rows, 6);
  assert.deepEqual(blue.sprite.cell, { width: 256, height: 384 });
  assert.deepEqual(blue.sprite.sourceSize, { width: 1280, height: 2304 });
  assert.deepEqual(blue.placement, manifest.placements.kongjwi);
  assert.equal(blue.actionMode, "magic-pour");
});

test("blue scholar current design stays in shop and magic cast produces visible water feedback", () => {
  const shop = text("assets/js/shop-navigation.js");
  const renderer = text("assets/js/scene-renderer.js");
  const state = text("assets/js/scene-state-machine.js");
  assert.match(shop, /game-scene-v2\/kongjwi\/blue-scholar\/preview\.png/);
  assert.doesNotMatch(shop, /source-locked\/kongjwi\/blue-scholar\/base-cutout\.png/);
  assert.doesNotMatch(renderer, /if \(isBlueScholar30f\) clearLayer\(layer\(stack, "scene-water-(?:stream|splash)"\)\)/);
  assert.match(state, /BLUE_SCHOLAR_IDLE_FRAMES = \[0, 1, 0\]/);
  assert.match(state, /BLUE_SCHOLAR_WRONG_FRAMES = \[0\]/);
  assert.match(state, /playSequence\("waterStream"[\s\S]*delay: 660/);
  assert.match(state, /playSequence\("waterSplash"[\s\S]*delay: 760/);
});
