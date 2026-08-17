import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../assets/js/shop-navigation.js", import.meta.url), "utf8");

test("shop outfit previews use canonical source-locked full-body cutouts", () => {
  const expected = [
    "그림/공용/원본/콩쥐/속옷/기본-오려내기.png",
    "그림/공용/원본/콩쥐/고전-홍색-한복/기본-오려내기.png",
    "game-scene-v2/kongjwi/blue-scholar/preview.png",
    "그림/공용/원본/콩쥐/농사일-작업복/기본-오려내기.png",
    "그림/공용/원본/콩쥐/야간-궁중복/기본-오려내기.png"
  ];
  for (const path of expected) assert.match(source, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(source, /OUTFIT_ART[\s\S]*?game-scene\/kongjwi\/[^`"]+\/pour-sheet\.png/);
  assert.doesNotMatch(source, /그림\/공용\/원본\/콩쥐\/청색-학자복\/기본-오려내기\.png/);
  assert.match(source, /const OUTFIT_SPRITE_KEYS = new Set\(\);/);
  assert.match(source, /const OUTFIT_GRID_SPECS = Object\.freeze\(\{\}\);/);
});
