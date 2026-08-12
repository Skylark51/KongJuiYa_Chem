import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS as questions } from "../data/questions/biology-variation-natural-selection.js";
import { quizzesForSubject } from "../data/subject-quizzes.js";

const root = resolve(import.meta.dirname, "..");

test("biology evolution bank is image-grounded and gradeable", async () => {
  assert.equal(questions.length, 10);
  assert.equal(new Set(questions.map(question => question.id)).size, questions.length);
  assert.equal(new Set(questions.map(question => question.image)).size, 5);
  for (const question of questions) {
    assert.ok(question.prompt.length > 5);
    assert.ok(question.imageAlt.length > 10);
    assert.ok(question.choices.includes(question.answer));
    assert.equal(new Set(question.choices).size, question.choices.length);
    assert.ok(question.explanation.length > 10);
    assert.ok((await stat(resolve(root, question.image))).isFile(), "missing image: " + question.image);
  }
});

test("biology evolution jar is live while biodiversity jars remain planned", () => {
  const biology = quizzesForSubject("biology");
  assert.deepEqual(biology.map(quiz => quiz.status), ["live", "planned", "planned", "planned"]);
  assert.equal(biology[0].id, "biology-variation-natural-selection");
  assert.equal(biology[0].category, "통합과학2 - 변이와 자연선택에 의한 생물의 진화");
});
