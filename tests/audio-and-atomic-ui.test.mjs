import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertGameStyleLoaded, gameHtml } from "./helpers/game-styles.mjs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("atomic number quiz gets a smaller dedicated prompt scale", () => {
  const css = read("assets/css/atomic-number-question-tune.css");
  assert.match(css, /data-training-id="atomic_number"/);
  assert.match(css, /font-size:\s*clamp\(36px,\s*8\.8vw,\s*56px\)\s*!important/);
  assert.match(css, /font-size:\s*clamp\(32px,\s*8\.2vw,\s*48px\)\s*!important/);
});

test("audio settings split bgm and sfx volume and expose a mute toggle", () => {
  const js = read("assets/js/game-bgm.js");
  assert.match(js, /bgmVolume/);
  assert.match(js, /sfxVolume/);
  assert.match(js, /mute/);
  assert.match(js, /audioSettingsButton/);
  assert.match(js, /bgmVolumeSetting/);
  assert.match(js, /sfxVolumeSetting/);
  assert.match(js, /muteAllAudioSetting/);
  assert.match(js, /kongjui:audio-settings/);
  assert.match(js, /mountHistoricalBgm/);
  assert.match(js, /legacyBgm\.destroy\(\)/);
});

test("game shell loads atomic prompt tune, audio settings style, bgm and updated sfx", () => {
  assertGameStyleLoaded(assert, "atomic-number-question-tune.css", "20260807-composition3");
  assertGameStyleLoaded(assert, "audio-settings.css", "20260807-audio-bgm2");
  assert.match(gameHtml, /game-bgm\.js\?v=20260807-audio-bgm2/);
  assert.match(gameHtml, /game-sfx\.js\?v=20260807-audio-bgm2/);
});
