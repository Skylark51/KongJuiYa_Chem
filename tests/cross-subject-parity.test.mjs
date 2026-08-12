import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GAME_CONFIG } from "../data/game-config.js";
import { SUBJECT_GAME_CONTENT, createSubjectGameContent } from "../data/subject-game-content.js";
import { GameCore } from "../assets/js/game-core.js";
import { QuestionEngine, getInputDescriptor } from "../assets/js/question-engine.js";
import { QuizCadenceController, QUIZ_FEEDBACK_CADENCE } from "../assets/js/quiz-cadence.js";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

test("subject compatibility bootstraps cannot own game state, dialogue, scene, or timing", async () => {
  const forbiddenTokens = [
    "GameCore", "mountGameScene", "ToadDialogueSelector", "CustomEvent",
    "setTimeout", "setInterval", "function answer", "function next",
    "function finish", "function restart", "function updateWater",
    "function speak", "function showToadBubble", "function handleKeyboard",
    "function clearAutoAdvance", "feedbackPending"
  ];
  for (const file of [
    "assets/js/biology-evolution-quiz.js",
    "assets/js/earth-science-fossil-quiz.js",
    "assets/js/subject-quiz-redirect.js"
  ]) {
    const source = await read(file);
    for (const token of forbiddenTokens) assert.equal(source.includes(token), false, file + ": " + token);
  }
});

test("subject theme CSS contains tokens and presentation specialization, not a second game UI", async () => {
  const css = await read("assets/css/subject-game-theme.css");
  for (const token of [
    "--subject-accent", "--subject-accent-light", "--subject-accent-dark",
    "--subject-bg-tint", "--subject-panel-tint"
  ]) assert.match(css, new RegExp(token));
  for (const selector of [
    ".game-hud", ".hud-card", ".scene-panel", ".game-stage",
    ".question-panel", ".feedback", ".toad-bubble", ".result-panel"
  ]) assert.equal(css.includes(selector), false, selector);
  assert.equal(css.includes('[data-presentation="source-image"]'), true);
});

test("one production GameCore and one shared cadence own all live science quizzes", async () => {
  const main = await read("assets/js/main.js");
  const scene = await read("assets/js/scene-state-machine.js");
  assert.equal(main.split("new GameCore(").length - 1, 1);
  assert.equal(main.split("new QuizCadenceController(").length - 1, 1);
  for (const kind of ["correct", "wrong", "timeout"]) {
    assert.equal(scene.includes('feedbackCadenceMs("' + kind + '")'), true);
  }
  for (const delay of ["1400", "680", "820"]) {
    assert.equal(scene.includes('apply("question"), ' + delay), false);
  }
  for (const subjectId of ["biology", "earth-science"]) {
    assert.ok(SUBJECT_GAME_CONTENT[subjectId].trainingModes.length > 0);
  }
});

test("cadence keeps the answered question and input lock until chemistry animation completion", () => {
  const content = SUBJECT_GAME_CONTENT.biology;
  let pending = null;
  const cadence = new QuizCadenceController({
    setTimer(callback, delay) {
      pending = { callback, delay };
      return 1;
    },
    clearTimer() { pending = null; }
  });
  const core = new GameCore({
    questionEngine: new QuestionEngine(content.questions, { random: () => 0.1, retryProbability: 0 }),
    config: Object.freeze({ ...GAME_CONFIG, correctAnswersToClear: 10 }),
    trainingProvider: content.getTrainingMode,
    cadenceController: cadence,
    eventTarget: null
  });
  core.start({ trainingId: content.trainingModes[0].id });
  const answeredId = core.question.id;
  const answer = String(core.question.correctChoice + 1);
  assert.equal(core.submit(answer).correct, true);
  assert.equal(core.question.id, answeredId);
  assert.equal(core.state.feedbackPending, true);
  assert.equal(core.submit(answer).accepted, false);
  assert.equal(pending.delay, QUIZ_FEEDBACK_CADENCE.correct);
  pending.callback();
  assert.notEqual(core.question.id, answeredId);
  assert.equal(core.state.feedbackPending, false);
});

test("physics remains production-empty while shared presentation supports future input variants", () => {
  assert.deepEqual(SUBJECT_GAME_CONTENT.physics.questions, []);
  const training = Object.freeze({
    id: "physics-fixture",
    title: "fixture",
    description: "test only",
    category: "fixture",
    difficultyLevels: ["easy", "normal", "hard"],
    rules: SUBJECT_GAME_CONTENT.chemistry.trainingModes[0].rules
  });
  const questions = [
    { id: "choice", trainingId: training.id, difficulty: 1, type: "multiple_choice", inputMode: "multiple_choice", prompt: "choice", choices: ["A", "B"], correctChoice: 0 },
    { id: "numeric", trainingId: training.id, difficulty: 1, type: "numeric", inputMode: "numeric_keypad", prompt: "numeric", answers: [1] },
    { id: "text", trainingId: training.id, difficulty: 1, type: "text", inputMode: "text_keyboard", prompt: "text", answers: ["x"] },
    { id: "image", trainingId: training.id, difficulty: 1, type: "multiple_choice", inputMode: "multiple_choice", prompt: "image", choices: ["A", "B"], correctChoice: 1, presentation: { kind: "source-image", image: "fixture.png" } }
  ];
  const fixture = createSubjectGameContent({ subjectId: "physics", trainingModes: [training], questions });
  assert.equal(fixture.questions.length, 4);
  assert.deepEqual(questions.map(question => getInputDescriptor(question).inputMode), [
    "multiple_choice", "numeric_keypad", "text_keyboard", "multiple_choice"
  ]);
  assert.equal(questions[3].presentation.kind, "source-image");
});
