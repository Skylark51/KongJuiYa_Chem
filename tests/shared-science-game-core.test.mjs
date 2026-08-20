import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GAME_CONFIG } from "../data/game-config.js";
import {
  SUBJECT_GAME_CONTENT,
  createSubjectGameContent
} from "../data/subject-game-content.js";
import { BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS } from "../data/questions/biology-variation-natural-selection.js";
import {
  EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS,
  EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS
} from "../data/questions/earth-science-fossil-type.js";
import { EARTH_SCIENCE_GEOLOGIC_ERA_KEYWORD_QUESTIONS } from "../data/questions/earth-science-geologic-era-keywords.js";
import { QuestionEngine } from "../assets/js/question-engine.js";
import { GameCore } from "../assets/js/game-core.js";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");
const makeCore = (content, clearAt = 20) => new GameCore({
  questionEngine: new QuestionEngine(content.questions, { random: () => 0.1, retryProbability: 0 }),
  config: Object.freeze({ ...GAME_CONFIG, correctAnswersToClear: clearAt }),
  trainingProvider: content.getTrainingMode,
  eventTarget: null
});

test("biology compatibility entry and shared redirect own no game state or cadence", async () => {
  for (const file of ["assets/js/biology-evolution-quiz.js"]) {
    const source = await read(file);
    assert.match(source, /mountSharedQuiz/);
    assert.doesNotMatch(source, /\b(?:correct|wrong|combo|bestCombo|water|answered)\s*:/);
    assert.doesNotMatch(source, /function\s+(?:answer|finish|restart|updateWater)|setTimeout|CustomEvent|mountGameScene/);
  }
  const redirect = await read("assets/js/subject-quiz-redirect.js");
  assert.doesNotMatch(redirect, /GameCore|score|combo|water|answer:/);
});

test("schema adapters preserve authored biology and earth content", () => {
  const biology = SUBJECT_GAME_CONTENT.biology.questions;
  assert.equal(biology.length, BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS.length);
  BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS.forEach((source, index) => {
    for (const key of ["id", "prompt", "answer", "image", "imageAlt", "sourceLabel", "explanation"]) {
      assert.equal(biology[index][key], source[key]);
    }
    assert.deepEqual(biology[index].choices, source.choices);
  });

  const earth = SUBJECT_GAME_CONTENT["earth-science"].questions;
  const sourceEarth = [
    ...EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS,
    ...EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS,
    ...EARTH_SCIENCE_GEOLOGIC_ERA_KEYWORD_QUESTIONS
  ];
  assert.equal(earth.length, sourceEarth.length);
  sourceEarth.forEach((source, index) => {
    for (const key of ["id", "answer", "image", "name", "explanation"]) {
      assert.equal(earth[index][key], source[key]);
    }
  });
});

test("all live non-chemistry modes use the chemistry rules contract", () => {
  const gold = SUBJECT_GAME_CONTENT.chemistry.trainingModes[0].rules;
  for (const subjectId of ["biology", "earth-science"]) {
    for (const training of SUBJECT_GAME_CONTENT[subjectId].trainingModes) {
      assert.deepEqual(training.rules, gold);
    }
  }
});

test("biology and earth emit the same authoritative GameCore answer sequence", () => {
  const sequences = [];
  for (const subjectId of ["biology", "earth-science"]) {
    const content = SUBJECT_GAME_CONTENT[subjectId];
    const core = makeCore(content);
    const events = [];
    for (const type of [
      "training:start", "game:start", "question:changed", "answer:correct",
      "answer:wrong", "answer:timeout", "game:pause", "game:resume"
    ]) core.on(type, () => events.push(type));
    const trainingId = content.trainingModes[0].id;
    core.start({ trainingId, questionId: content.questions[0].id });
    core.submit(String(core.question.correctChoice + 1));
    const wrongIndex = core.question.correctChoice === 0 ? 1 : 0;
    core.submit(String(wrongIndex + 1));
    core.state.questionTimeRemaining = 0;
    core.tick(0.01);
    core.pause();
    core.resume();
    sequences.push(events);
  }
  assert.deepEqual(sequences[0], sequences[1]);
});

test("shared GameCore owns fever, warning, critical, clear and over for subject content", () => {
  const content = SUBJECT_GAME_CONTENT.biology;
  const core = makeCore(content, 4);
  const events = [];
  for (const type of ["fever:charge", "fever:start", "water:warning", "water:critical", "game:clear"]) {
    core.on(type, () => events.push(type));
  }
  core.start({ trainingId: content.trainingModes[0].id });
  for (let index = 0; index < 4; index += 1) core.submit(String(core.question.correctChoice + 1));
  assert.equal(core.state.status, "cleared");
  assert.ok(events.includes("fever:start"));
  assert.ok(events.includes("game:clear"));

  const danger = makeCore(content);
  const dangerEvents = [];
  danger.on("water:warning", () => dangerEvents.push("warning"));
  danger.on("water:critical", () => dangerEvents.push("critical"));
  danger.on("game:over", () => dangerEvents.push("over"));
  danger.start({ trainingId: content.trainingModes[0].id });
  danger.state.water = 50.1;
  danger.tick(0.25);
  danger.state.water = 10.1;
  danger.tick(0.25);
  danger.state.water = 0.1;
  danger.tick(0.25);
  assert.deepEqual(dangerEvents, ["warning", "critical", "over"]);
});

test("physics can mount a test-only fixture without production questions", () => {
  assert.deepEqual(SUBJECT_GAME_CONTENT.physics.questions, []);
  const fixtureMode = Object.freeze({
    id: "physics-fixture",
    title: "fixture",
    description: "test only",
    category: "fixture",
    difficultyLevels: ["easy", "normal", "hard"],
    rules: SUBJECT_GAME_CONTENT.chemistry.trainingModes[0].rules
  });
  const fixture = createSubjectGameContent({
    subjectId: "physics",
    trainingModes: [fixtureMode],
    questions: [{
      id: "physics-fixture-1",
      trainingId: "physics-fixture",
      difficulty: 1,
      type: "multiple_choice",
      inputMode: "multiple_choice",
      prompt: "fixture",
      choices: ["A", "B"],
      correctChoice: 0
    }]
  });
  const core = makeCore(fixture, 1);
  core.start({ trainingId: "physics-fixture" });
  assert.equal(core.submit("1").correct, true);
  assert.equal(core.state.status, "cleared");
});

test("GameCore contains no subject presentation knowledge", async () => {
  const core = await read("assets/js/game-core.js");
  assert.match(core, /trainingProvider/);
  assert.doesNotMatch(core, /biology|earth-science|fossil|sourceImage|presentation|querySelector/);
});
