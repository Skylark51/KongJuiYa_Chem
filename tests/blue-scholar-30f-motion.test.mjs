import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = "assets/그림/게임-장면/콩쥐/청색-학자복/물붓기-동작.png";
const preview = "assets/그림/공용/콩쥐/미리보기/청색-학자복.png";

function isPng(relative) {
  const buffer = fs.readFileSync(path.join(root, relative));
  return buffer.subarray(1, 4).toString("ascii") === "PNG";
}

test("blue scholar keeps one Korean runtime sheet and one Korean shop preview", () => {
  assert.equal(fs.existsSync(path.join(root, runtime)), true);
  assert.equal(fs.existsSync(path.join(root, preview)), true);
  assert.equal(isPng(runtime), true);
  assert.equal(isPng(preview), true);
});

test("shop uses the canonical Korean blue-scholar preview path", () => {
  const shop = fs.readFileSync(path.join(root, "assets/js/shop-navigation.js"), "utf8");
  assert.match(shop, /assets\/그림\/공용\/콩쥐\/미리보기\/청색-학자복\.png/);
  assert.doesNotMatch(shop, /assets\/art\/game-scene-v2\/kongjwi\/blue-scholar/);
});

test("retired V2 blue-scholar copies are absent", () => {
  assert.equal(fs.existsSync(path.join(root, "assets/art/game-scene-v2/kongjwi/blue-scholar")), false);
});
