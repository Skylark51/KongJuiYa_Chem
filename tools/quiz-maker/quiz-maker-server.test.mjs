import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadCatalog, readAuthoredState, saveQuestion, writeAuthoredState } from "./server.mjs";
import { createTrainingMode } from "./core.js";

async function stateFromModule(target) {
  const source = await fs.readFile(target, "utf8");
  return JSON.parse(source.match(/const DATA = ([\s\S]*?);\n\nfunction deepFreeze/)[1]);
}

test("save API creates a physics category and question atomically", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "quiz-maker-save-"));
  const target = path.join(directory, "authored.js");
  await writeAuthoredState(await readAuthoredState(), target);
  const trainingMode = createTrainingMode({ id: "physics-force-test", title: "힘 테스트", category: "역학" });
  const question = {
    id: "physics-force-test-001", trainingId: trainingMode.id, difficulty: 1, type: "multiple_choice",
    prompt: "힘의 단위는?", choices: ["N", "J", "W", "Pa"], correctChoice: 0, answers: ["N"],
    explanation: "힘의 SI 단위는 뉴턴(N)입니다.", tags: ["힘"], sourceLevel: "physics",
    inputMode: "multiple_choice", autoSubmit: true, allowedKeys: ["1", "2", "3", "4"], keyboardShortcuts: ["1", "2", "3", "4"]
  };
  const result = await saveQuestion({ subjectId: "physics", question, operation: "create", trainingMode }, { target });
  const state = await stateFromModule(target);
  assert.equal(result.id, question.id);
  assert.equal(state.physics.trainingModes[0].id, trainingMode.id);
  assert.equal(state.physics.questions[0].id, question.id);
  assert.equal((await fs.readdir(directory)).length, 1);
  await fs.rm(directory, { recursive: true, force: true });
});

test("save API stores an existing chemistry edit as a non-destructive override", async () => {
  const catalog = await loadCatalog();
  const original = catalog.chemistry.questions[0];
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "quiz-maker-update-"));
  const target = path.join(directory, "authored.js");
  await writeAuthoredState(await readAuthoredState(), target);
  const question = { ...original, explanation: `${original.explanation} 검증용 수정` };
  await saveQuestion({ subjectId: "chemistry", question, operation: "update" }, { target });
  const state = await stateFromModule(target);
  assert.equal(state.chemistry.overrides[question.id].explanation, question.explanation);
  assert.equal(state.chemistry.questions.length, 0);
  await fs.rm(directory, { recursive: true, force: true });
});
