import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { GameStorage, STORAGE_VERSION, migrateSave } from "../assets/js/storage.js";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("game page has one bootstrap and canonical internal module identities", () => {
  const html = read("콩쥐야_줘때써.html");
  const entry = read("assets/js/game-page.js");
  const main = read("assets/js/main.js");
  const runtimeSources = fs.readdirSync(new URL("../assets/js/", import.meta.url))
    .filter(name => name.endsWith(".js"))
    .map(name => read(`assets/js/${name}`)).join("\n");
  assert.equal((html.match(/game-page\.js\?v=/g) || []).length, 1);
  assert.match(entry, /bootstrapGameRuntime\(\)/);
  assert.match(entry, /mountOpeningCountdown\(\)/);
  assert.doesNotMatch(html, /<script[^>]+(?:asset-debug-viewer|opening-countdown-flow)\.js/);
  assert.match(main, /if \(globalThis\.KongJuiYaGame\) return globalThis\.KongJuiYaGame/);
  assert.equal((main.match(/new GameCore\(/g) || []).length, 1);
  assert.doesNotMatch(runtimeSources, /main\.js\?v=/);
  assert.doesNotMatch(runtimeSources, /game-records-runtime|visible-water-pour/);
});

test("storage v5 migrates records without losing durable user data", () => {
  const previous = {
    version: 4,
    settings: { volume: 0.3, animations: false, difficulty: "hard", questionCount: 12 },
    economy: { beans: 77, lifetimeBeans: 120, spentBeans: 43 },
    upgrades: { bucket_level: 3 },
    statistics: { ph: { plays: 2, bestScore: 900, bestResponseMs: 850, playDates: ["2026-08-01T00:00:00.000Z"] } },
    recentRuns: [{ trainingId: "ph", score: 900 }],
    currentRun: { trainingId: "ph", score: 400, correctInStage: 3 }
  };
  const migrated = migrateSave(previous);
  assert.equal(STORAGE_VERSION, 5);
  assert.equal(migrated.economy.beans, 77);
  assert.equal(migrated.settings.animations, false);
  assert.equal(migrated.settings.questionCount, 12);
  assert.equal(migrated.upgrades.bucket_level, 3);
  assert.equal(migrated.statistics.ph.bestResponseMs, 850);
  assert.equal(migrated.currentRun.correctInStage, 3);
});

test("recordAnswer and finishRun persist analytics exactly once per call", () => {
  const memory = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
  const storage = new GameStorage(memory, () => new Date("2026-08-08T12:00:00.000Z"));
  storage.startRun("ph", "normal");
  storage.recordAnswer({ id: "q1", trainingId: "ph" }, true, false, 900, "normal");
  storage.recordAnswer({ id: "q2", trainingId: "ph" }, false, false, 1200, "normal");
  assert.equal(storage.mode("ph").correct, 1);
  assert.equal(storage.mode("ph").wrong, 1);
  assert.equal(storage.mode("ph").bestResponseMs, 900);
  storage.finishRun({ trainingId: "ph", difficulty: "normal", score: 500, status: "cleared", correctAnswersPerStage: 10, correctInStage: 10, bestCombo: 4 });
  assert.equal(storage.data.recentRuns.length, 1);
  assert.deepEqual(storage.data.recentRuns[0].questionCount, 10);
  assert.equal(storage.mode("ph").playDates.length, 1);
  assert.equal(storage.data.overall.bestAccuracy, 100);
  storage.finishRun({ trainingId: "ph", difficulty: "normal", score: 450, status: "completed", totalQuestions: 10, correctAnswers: 8, wrongAnswers: 2, bestCombo: 3 });
  assert.equal(storage.data.overall.bestAccuracy, 100);
  assert.equal(storage.data.overall.totalCompletions, 1);
  assert.equal(storage.data.recentRuns[0].isPersonalBestAccuracy, false);
});
