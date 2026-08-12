import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS,
  EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS,
  FOSSIL_ERA_CHOICES,
  FOSSIL_TYPE_CHOICES
} from "../data/questions/earth-science-fossil-type.js";
import { quizzesForSubject } from "../data/subject-quizzes.js";

const root = resolve(import.meta.dirname, "..");

test("fossil type jar uses all eight supplied images and two exact choices", async () => {
  assert.equal(EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS.length, 8);
  assert.deepEqual(FOSSIL_TYPE_CHOICES, ["시상 화석", "표준 화석"]);
  assert.equal(EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS.filter(question => question.answer === "시상 화석").length, 2);
  assert.equal(EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS.filter(question => question.answer === "표준 화석").length, 6);
  assert.equal(new Set(EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS.map(question => question.id)).size, 8);

  for (const question of EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS) {
    assert.ok(question.name.endsWith("화석"));
    assert.ok(question.explanation.length > 10);
    const image = await readFile(resolve(root, question.image));
    assert.equal(image.subarray(1, 4).toString(), "PNG", question.image);
    assert.ok(image.length > 50000, question.image);
  }
});

test("fossil era jar includes only six standard fossils and four exact era choices", () => {
  assert.equal(EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS.length, 6);
  assert.deepEqual(FOSSIL_ERA_CHOICES, ["선캄브리아시대", "고생대", "중생대", "신생대"]);
  assert.deepEqual(Object.fromEntries(EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS.map(question => [question.name, question.answer])), {
    "암모나이트 화석": "중생대",
    "매머드 화석": "신생대",
    "화폐석 화석": "신생대",
    "공룡 화석": "중생대",
    "삼엽충 화석": "고생대",
    "에디아카라 동물군 화석": "선캄브리아시대"
  });
});

test("first two earth science jars are live and share one quiz runner", async () => {
  const jars = quizzesForSubject("earth-science");
  assert.deepEqual(jars.map(jar => jar.status), ["live", "live", "planned"]);
  assert.match(jars[0].implementation, /quiz=earth-fossil-type$/);
  assert.match(jars[1].implementation, /quiz=earth-index-fossil-era$/);
  const html = await readFile(resolve(root, "subjects/earth-science/quiz.html"), "utf8");
  const runner = await readFile(resolve(root, "assets/js/earth-science-fossil-quiz.js"), "utf8");
  assert.match(html, /id="answerChoices"/);
  assert.match(html, /id="visualStage" class="scene-animation-zone"/);
  assert.match(html, /game-runtime-features\.css/);
  assert.match(runner, /mountGameScene/);
  assert.match(runner, /addEventListener\("keydown", handleKeyboard\)/);
  assert.match(runner, /aria-keyshortcuts/);
  assert.match(runner, /"answer:correct"/);
  assert.match(runner, /"answer:wrong"/);
  assert.match(runner, /new SubjectStorage\("earth-science"\)/);
  assert.match(runner, /storage\.write\("records"/);
});

test("scene renderer resolves manifest and PNG assets from its module root", async () => {
  const renderer = await readFile(resolve(root, "assets/js/scene-renderer.js"), "utf8");
  assert.match(renderer, /new URL\("\.\.\/art\/game-scene\/manifest\.json/);
  assert.match(renderer, /const SITE_ROOT_URL = new URL\("\.\.\/\.\.\/", import\.meta\.url\)/);
  assert.match(renderer, /new URL\(url, SITE_ROOT_URL\)/);
});
