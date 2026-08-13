import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const runtimeCss = await readFile(new URL("../assets/css/layered-scene-runtime.css", import.meta.url), "utf8");
const featuresCss = await readFile(new URL("../assets/css/game-runtime-features.css", import.meta.url), "utf8");

test("desktop layered scene host follows the authored 16:9 canvas", () => {
  assert.match(runtimeCss, /@media \(min-width: 1100px\) and \(min-height: 700px\) and \(pointer: fine\)/);
  assert.match(runtimeCss, /\.scene-panel \{[\s\S]*?aspect-ratio: 16 \/ 9;/);
  assert.match(runtimeCss, /\.game-stage \{[\s\S]*?min-height: 0 !important;[\s\S]*?aspect-ratio: 16 \/ 9;/);
});

test("desktop does not stack a second transform animation over sprite poses", () => {
  assert.match(
    runtimeCss,
    /data-scene-state="correct"\] \.scene-kongjwi,[\s\S]*?data-scene-state="correct"\] \.scene-tool \{[\s\S]*?animation: none !important;/
  );
});

test("game feature bundle cache-busts the desktop composition guard", () => {
  assert.match(featuresCss, /layered-scene-runtime\.css\?v=20260813-desktop-scene1/);
});
