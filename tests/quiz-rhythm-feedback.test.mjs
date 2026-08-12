import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertGameStyleLoaded, gameHtml } from "./helpers/game-styles.mjs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile jar cluster is shifted farther right and down as one composition", () => {
  const css = read("assets/css/scene-jar-position-tune.css");
  for (const layer of [
    "scene-jar-back", "scene-water-fill", "scene-toad-skin", "scene-toad-expression",
    "scene-jar-front", "scene-water-splash", "scene-water-leak"
  ]) {
    assert.match(css, new RegExp(`\\.${layer}`), `${layer} must move with the jar cluster`);
  }
  assert.match(css, /--jar-cluster-offset-x:\s*4\.2%/);
  assert.match(css, /--jar-cluster-offset-y:\s*4\.1%/);
  assert.match(css, /scene-water-stream[\s\S]*width:\s*calc\(var\(--scene-width,[^)]*\) \+ var\(--jar-cluster-offset-x\)\)/);
});

test("answer feedback sound is short Web Audio and never leaks the timeout event", () => {
  const js = read("assets/js/game-sfx.js");
  assert.match(js, /latencyHint:\s*"interactive"/);
  assert.match(js, /answer:correct/);
  assert.match(js, /answer:wrong/);
  assert.doesNotMatch(js, /answer:timeout/);
  assert.match(js, /playSpringWater/);
  assert.match(js, /playToadHit/);
  assert.match(js, /stopActive\(\)/);
  assert.match(js, /createBiquadFilter/);
  assert.match(js, /createOscillator/);
  assert.match(js, /sfxVolume/);
  assert.match(js, /mute/);
});

test("game shell loads jar tune, audio settings, bgm and answer SFX with cache-busted URLs", () => {
  assertGameStyleLoaded(assert, "scene-jar-position-tune.css", "20260807-composition3");
  assertGameStyleLoaded(assert, "atomic-number-question-tune.css", "20260807-composition3");
  assertGameStyleLoaded(assert, "audio-settings.css", "20260807-audio-bgm2");
  assert.match(gameHtml, /game-bgm\.js\?v=20260807-audio-bgm2/);
  assert.match(gameHtml, /game-sfx\.js\?v=20260807-audio-bgm2/);
});
