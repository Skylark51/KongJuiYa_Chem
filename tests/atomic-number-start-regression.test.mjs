import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertGameStyleLoaded, gameHtml } from "./helpers/game-styles.mjs";

const read = pathname => fs.readFileSync(new URL(`../${pathname}`, import.meta.url), "utf8");
const atomicSource = read("data/questions/atomic-number.js");
const indexSource = read("data/questions/index.js");
const questionsFacade = read("data/questions.js");
const mainSource = read("assets/js/main.js");
const uiSource = read("assets/js/ui-effects.js");
const countdownSource = read("assets/js/opening-countdown-flow.js");
const entrySource = read("assets/js/game-page.js");
const css = read("assets/css/atomic-number-speed-start.css");
const html = gameHtml;

test("atomic-number questions show only the element symbol", () => {
  assert.match(atomicSource, /,"atomic_number",1,symbol,\[String\(number\)\]/);
  assert.doesNotMatch(atomicSource, /원소 기호 .*원자 번호는\?/);
});

test("atomic-number mode uses the universal paused countdown owner", () => {
  assert.match(countdownSource, /COUNTDOWN_STEPS\s*=\s*Object\.freeze\(\[3, 2, 1\]\)/);
  assert.match(countdownSource, /api\.game\.pause\(\)/);
  assert.match(countdownSource, /getApi\(\)\?\.game\?\.resume\?\.\(\)/);
  assert.match(entrySource, /mountOpeningCountdown\(\)/);
  assert.doesNotMatch(uiSource, /runOpeningCountdown|OPENING_COUNTDOWN_TRAININGS/);
});

test("atomic-number flash prompt uses one cache-busted game entry and canonical internal modules", () => {
  assert.match(css, /data-training-id="atomic_number"[\s\S]*scene-question-bubble h1/);
  assert.match(css, /#startOverlay\.game-start-countdown/);
  assert.match(css, /game-start-countdown-number/);
  assertGameStyleLoaded(assert, "atomic-number-speed-start.css", "20260807-atomic-countdown1");
  assert.match(html, /game-page\.js\?v=[^"]+/);
  assert.doesNotMatch(mainSource, /questions\.js\?v=/);
  assert.doesNotMatch(uiSource, /main\.js\?v=/);
  assert.match(questionsFacade, /questions\/index\.js/);
  assert.doesNotMatch(questionsFacade, /questions\/index\.js\?v=/);
  assert.match(indexSource, /atomic-number\.js/);
  assert.doesNotMatch(indexSource, /atomic-number\.js\?v=/);
});
