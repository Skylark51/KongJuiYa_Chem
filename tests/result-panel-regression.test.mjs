import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertGameStyleLoaded, gameHtml } from "./helpers/game-styles.mjs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("result enhancement tracks per-question response time to two decimals", () => {
  const js = read("assets/js/result-panel-enhancements.js");
  assert.match(js, /responseTotalMs/);
  assert.match(js, /responseCount/);
  assert.match(js, /averageResponseSeconds\(\)\.toFixed\(2\)/);
  assert.match(js, /문제당 평균/);
  assert.match(js, /answer:correct/);
  assert.match(js, /answer:wrong/);
  assert.match(js, /answer:timeout/);
});

test("result enhancement announces new records and exposes all requested routes", () => {
  const js = read("assets/js/result-panel-enhancements.js");
  assert.match(js, /최고 기록 갱신!/);
  assert.match(js, /score > previousBestScore/);
  assert.match(js, /다시하기/);
  assert.match(js, /다른 장독대 고르기/);
  assert.match(js, /기록으로 이동/);
  assert.match(js, /activeSubjectLobbyUrl\("jars"\)/);
  assert.match(js, /activeSubjectLobbyUrl\("records"\)/);
});

test("result actions are ordered records, retry, then jar selection", () => {
  const js = read("assets/js/result-panel-enhancements.js");
  assert.match(js, /const orderedButtons = \[\s*records,\s*restart,\s*jars\s*\]\.filter\(Boolean\)/);
  assert.match(js, /panel\.append\(\.\.\.orderedButtons\)/);
});

test("result actions use the warm game palette instead of the legacy blue button", () => {
  const css = read("assets/css/result-panel-enhancements.css");
  assert.match(css, /\.result-records-button[\s\S]*var\(--game-gold\)/);
  assert.match(css, /\.result-restart-button[\s\S]*var\(--game-panel-soft\)/);
  assert.match(css, /\.result-home-button[\s\S]*var\(--game-gold-light\)/);
  assert.doesNotMatch(css, /#244b55/i);
});

test("game shell loads result enhancements with cache-busted URLs", () => {
  assert.match(gameHtml, /data-ui-version="[^"]+"/);
  assertGameStyleLoaded(assert, "result-panel-enhancements.css", "20260807-result-actions2");
  assert.match(gameHtml, /result-panel-enhancements\.js\?v=[^"]+/);
});
