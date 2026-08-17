import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveSceneAssetPath } from "../assets/js/scene-asset-paths.js";

const root = resolve(import.meta.dirname, "..");

const cases = [
  ["assets/images/background/courtyard-night.png", "assets/그림/메인/배경/밤-뜰.png"],
  ["assets/art/source-locked/background/courtyard-night.png", "assets/그림/공용/원본/배경/밤-뜰.png"],
  ["assets/art/kongjwi/kongjwi-underlayer-cutout.png", "assets/그림/공용/원본/콩쥐/속옷/기본-오려내기.png"],
  ["assets/art/kongjwi-tools/wood.png", "assets/그림/공용/원본/바가지/나무-바가지.png"],
  ["assets/art/jars/onggi/lid-open.png", "assets/그림/공용/원본/장독대/옹기/열림.png"],
  ["assets/images/toad-expressions/기본.png", "assets/그림/공용/두꺼비/표정/기본.png"]
];

test("legacy scene asset paths resolve to existing canonical Korean assets", async () => {
  for (const [legacy, canonical] of cases) {
    assert.equal(resolveSceneAssetPath(legacy), canonical, legacy);
    const info = await stat(resolve(root, canonical));
    assert.equal(info.isFile(), true, canonical);
  }
});

test("already canonical scene asset paths remain unchanged", () => {
  const canonical = "assets/그림/게임-장면/배경/야간-장독대-마당-전경.png";
  assert.equal(resolveSceneAssetPath(canonical), canonical);
});
