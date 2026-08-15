import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createSafeStorage } from "../assets/js/safe-storage.js";
import { GameStorage } from "../assets/js/storage.js";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("safe storage keeps a page usable when the browser blocks storage access", () => {
  const blockedGlobal = Object.create(null, {
    localStorage: { get() { throw new DOMException("blocked", "SecurityError"); } }
  });
  const storage = createSafeStorage("localStorage", { globalRef: blockedGlobal });
  storage.setItem("answer", "42");
  assert.equal(storage.getItem("answer"), "42");
  storage.removeItem("answer");
  assert.equal(storage.getItem("answer"), null);
  assert.doesNotThrow(() => new GameStorage());
});

test("audit fixes preserve a navigation surface and a safe viewport at narrow sizes", () => {
  const css = read("assets/css/audit-fixes.css");
  assert.match(css, /min-width:\s*0\s*!important/);
  assert.match(css, /min-width:\s*701px\) and \(max-width:\s*980px/);
  assert.match(css, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /mobile-portal-link\s*\{\s*display:\s*grid\s*!important/);
  assert.match(css, /\.modal-card\[open\]/);
});

test("game entry recovers from a bad direct URL without throwing an unusable page", () => {
  const gameEntry = read("assets/js/game-page.js");
  const gameUi = read("assets/js/ui-effects.js");
  assert.match(gameEntry, /renderGameRecovery\(\);/);
  assert.match(gameUi, /const mode = requestedTrainingId \? modeById\(requestedTrainingId\) : modeById\(selection\?\.trainingId\)/);
  assert.match(gameUi, /link\.href = activeSubjectLobbyUrl\("jars"\)/);
  assert.doesNotMatch(gameUi, /throw new Error\(`알 수 없는 장독대 ID/);
});

test("subject shells rerender records and device preferences after cross-tab changes", () => {
  const shell = read("assets/js/subject-shell.js");
  assert.match(shell, /addEventListener\("storage", event =>/);
  assert.match(shell, /subjectStorageKey\(subject\.id, "records"\)/);
  assert.match(shell, /GLOBAL_STORAGE_KEYS\.deviceMode/);
  assert.match(shell, /renderRecords\(\)/);
});
