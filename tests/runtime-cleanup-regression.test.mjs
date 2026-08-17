import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const url = path => new URL(`../${path}`, import.meta.url);
const read = path => fs.readFileSync(url(path), "utf8");

test("Kongjwi motion workflow uses the canonical spelling and script path", () => {
  const workflow = read(".github/workflows/build-kongjwi-pour-motion.yml");
  assert.match(workflow, /scripts\/build-kongjwi-pour-sheets\.py/);
  assert.match(workflow, /\.github\/workflows\/build-kongjwi-pour-motion\.yml/);
  assert.doesNotMatch(workflow, /kongjui/);
  assert.equal(fs.existsSync(url("scripts/build-kongjui-pour-sheets.py")), false);
  assert.equal(fs.existsSync(url("scripts/build-kongjwi-pour-sheets.py")), true);
});

test("layered PNG water stream is the only gameplay pour renderer", () => {
  const html = read("콩쥐야_줘때써.html");
  const manifest = JSON.parse(read("assets/그림/게임-장면/manifest.json"));
  const renderer = read("assets/js/scene-renderer.js");

  assert.doesNotMatch(html, /scenePourArc|scene-pour-arc/);
  assert.equal(manifest.assets.effects.waterStream, "assets/그림/게임-장면/효과/물줄기-동작.png");
  assert.match(renderer, /scene-water-stream/);
  assert.match(renderer, /waterStream/);
});
