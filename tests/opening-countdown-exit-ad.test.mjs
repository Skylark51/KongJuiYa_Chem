import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertGameStyleLoaded, gameHtml } from "./helpers/game-styles.mjs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("universal opening countdown runs for every game start and lasts exactly three seconds", () => {
  const js = read("assets/js/opening-countdown-flow.js");
  assert.match(js, /COUNTDOWN_TOTAL_MS = 3000/);
  assert.match(js, /COUNTDOWN_INTRO_MS = 600/);
  assert.match(js, /COUNTDOWN_STEP_MS = 700/);
  assert.match(js, /COUNTDOWN_STEPS = Object\.freeze\(\[3, 2, 1\]\)/);
  assert.match(js, /export function mountOpeningCountdown/);
  assert.match(js, /window\.addEventListener\("game:start", handleGameStart\)/);
  assert.match(js, /api\.game\.pause\(\)/);
  assert.match(js, /getApi\(\)\?\.game\?\.resume\?\.\(\)/);
  assert.doesNotMatch(js, /atomic_number/);
  assert.doesNotMatch(js, /overlay\.id\s*=/);
});

test("countdown is mounted directly over the complete question frame", () => {
  const js = read("assets/js/opening-countdown-flow.js");
  const css = read("assets/css/opening-countdown-flow.css");
  assert.match(js, /querySelector\("\.scene-question-bubble"\)/);
  assert.match(js, /questionFrame\.append\(overlay\)/);
  assert.doesNotMatch(js, /querySelector\("\.scene-animation-zone"\)/);
  assert.match(css, /\.scene-question-bubble > #startOverlay\.game-start-countdown/);
  assert.match(css, /inset:\s*-1px\s*!important/);
  assert.match(css, /z-index:\s*999\s*!important/);
  assert.match(css, /\.game-start-countdown-card[\s\S]*width:\s*100%[\s\S]*height:\s*100%/);
  assert.doesNotMatch(css, /content:\s*"문제 준비 중"/);
});

test("very short mobile layouts reserve enough stable space for the full keypad", () => {
  const css = read("assets/css/opening-countdown-flow.css");
  assert.match(css, /max-height:\s*520px/);
  assert.match(css, /--mobile-scene-height:\s*150px/);
  assert.match(css, /grid-template-rows:\s*30px var\(--mobile-scene-height\) minmax\(0, 1fr\)\s*!important/);
  assert.match(css, /#ui-mobileKeypad[\s\S]*visibility:\s*visible\s*!important/);
  assert.match(css, /min-height:\s*29px\s*!important/);
});

test("mid-run exit shows ad before routing back to jar selection", () => {
  const js = read("assets/js/opening-countdown-flow.js");
  assert.match(js, /confirmHomeButton/);
  assert.match(js, /stopImmediatePropagation\(\)/);
  assert.match(js, /adDialog\.showModal\(\)/);
  assert.match(js, /adDialog\?\.addEventListener\("close"/);
  assert.match(js, /pendingExitRoute = chemistryLobbyUrl\("jars"\)/);
});

test("countdown is owned by the single game entry", () => {
  const entry = read("assets/js/game-page.js");
  const ui = read("assets/js/ui-effects.js");
  assert.match(entry, /import \{ mountOpeningCountdown \} from "\.\/opening-countdown-flow\.js"/);
  assert.equal((entry.match(/mountOpeningCountdown\(\)/g) || []).length, 1);
  assert.doesNotMatch(gameHtml, /<script[^>]+opening-countdown-flow\.js/);
  assert.doesNotMatch(ui, /runOpeningCountdown|OPENING_COUNTDOWN_TRAININGS/);
  assertGameStyleLoaded(assert, "opening-countdown-flow.css", "20260807-countdown-overlay3");
  assert.match(gameHtml, /result-panel-enhancements\.js\?v=20260807-result-actions2/);
  assert.match(gameHtml, /game-bgm\.js\?v=20260807-audio-bgm2/);
  assert.match(gameHtml, /data-ui-version="[^"]+"/);
});
