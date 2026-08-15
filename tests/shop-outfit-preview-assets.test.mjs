import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../assets/js/shop-navigation.js", import.meta.url), "utf8");

test("shop outfit previews use canonical source-locked full-body cutouts", () => {
  const expected = [
    "source-locked/kongjwi/underlayer/base-cutout.png",
    "source-locked/kongjwi/classic-red/base-cutout.png",
    "game-scene-v2/kongjwi/blue-scholar/preview.png",
    "source-locked/kongjwi/field-work/base-cutout.png",
    "source-locked/kongjwi/night-court/base-cutout.png"
  ];
  for (const path of expected) assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(source, /OUTFIT_ART[\s\S]*?game-scene\/kongjwi\/[^`"]+\/pour-sheet\.png/);
  assert.doesNotMatch(source, /source-locked\/kongjwi\/blue-scholar\/base-cutout\.png/);
  assert.match(source, /const OUTFIT_SPRITE_KEYS = new Set\(\);/);
  assert.match(source, /const OUTFIT_GRID_SPECS = Object\.freeze\(\{\}\);/);
});
