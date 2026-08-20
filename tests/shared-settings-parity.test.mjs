import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

test("main and game surfaces share one canonical settings module", async () => {
  const routing = await read("assets/js/site-routing.js");
  const shared = await read("assets/js/shared-settings-dialog.js");
  assert.match(routing, /shared-settings-dialog\.js/);
  for (const page of ["lobby", "subject-shell", "game"]) assert.ok(shared.includes(`"${page}"`), page);
  assert.match(shared, /sharedSettingsDialog/);
  assert.match(shared, /settingsDialog/);
  assert.match(shared, /subjectSettings/);
  assert.match(shared, /audioSettingsDialog/);
});

test("canonical settings keeps shared controls without a saved difficulty selector", async () => {
  const shared = await read("assets/js/shared-settings-dialog.js");
  for (const label of [
    "BGM 음량", "효과음 음량", "전체 음소거",
    "기본 문항 수", "애니메이션 사용", "기기 화면"
  ]) assert.ok(shared.includes(label), label);
  assert.doesNotMatch(shared, /기본 난도|sharedDifficulty|difficulty/i);
  assert.match(shared, /MIN_QUESTION_COUNT = 5/);
  assert.match(shared, /MAX_QUESTION_COUNT = 100/);
});

test("stored legacy difficulty cannot select a new jar session", async () => {
  for (const path of [
    "assets/js/main.js",
    "assets/js/ui-effects.js",
    "assets/js/lobby-actions.js",
    "assets/js/subject-shell.js"
  ]) {
    assert.doesNotMatch(await read(path), /settings(?:\?\.|\.)difficulty/);
  }
});

test("shared settings preserves legacy data while synchronizing canonical keys", async () => {
  const shared = await read("assets/js/shared-settings-dialog.js");
  assert.match(shared, /\.\.\.readUiPreferences\(storage\), animations: next\.animations/);
  assert.match(shared, /GLOBAL_STORAGE_KEYS\.audioSettings/);
  assert.match(shared, /GLOBAL_STORAGE_KEYS\.uiPreferences/);
  assert.match(shared, /store\.updateSettings\(\{/);
  assert.match(shared, /setDeviceMode\(next\.deviceMode/);
  assert.doesNotMatch(shared, /JSON\.stringify\(\{ animations: next\.animations \}\)/);
});

test("all four subject lobbies and the shared game resolve through site routing", async () => {
  const chemistry = await read("subjects/chemistry/index.html");
  const subjectShell = await read("assets/js/subject-shell.js");
  const gameUi = await read("assets/js/ui-effects.js");
  assert.match(chemistry, /lobby-actions\.js/);
  assert.match(await read("assets/js/lobby-actions.js"), /site-routing\.js/);
  assert.match(subjectShell, /site-routing\.js/);
  assert.match(gameUi, /site-routing\.js/);
  for (const subject of ["physics", "biology", "earth-science"]) {
    const html = await read(`subjects/${subject}/index.html`);
    assert.match(html, /subject-shell\.js/);
  }
});
