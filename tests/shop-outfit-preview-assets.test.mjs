import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../assets/js/shop-navigation.js", import.meta.url), "utf8");

const expected = [
  "assets/그림/공용/원본/콩쥐/속옷/기본-오려내기.png",
  "assets/그림/공용/원본/콩쥐/고전-홍색-한복/기본-오려내기.png",
  "assets/그림/공용/콩쥐/미리보기/청색-학자복.png",
  "assets/그림/공용/원본/콩쥐/농사일-작업복/기본-오려내기.png",
  "assets/그림/공용/원본/콩쥐/야간-궁중복/기본-오려내기.png"
];

test("shop outfit previews use canonical Korean PNG paths", () => {
  for (const assetPath of expected) assert.ok(source.includes(assetPath), assetPath);
  assert.doesNotMatch(source, /assets\/art\//);
  assert.doesNotMatch(source, /\.webp/i);
  assert.match(source, /const OUTFIT_SPRITE_KEYS = new Set\(\);/);
  assert.match(source, /const OUTFIT_GRID_SPECS = Object\.freeze\(\{\}\);/);
});
