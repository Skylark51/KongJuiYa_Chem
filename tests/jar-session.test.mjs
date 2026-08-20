import test from "node:test";
import assert from "node:assert/strict";
import { getSubjectGameContent } from "../data/subject-game-content.js";
import {
  buildDifficultyQuestionSession,
  calculateDifficultyQuota,
  clearTrainingSelection,
  readTrainingSelection,
  writeTrainingSelection
} from "../assets/js/jar-session.js";
import { GameCore } from "../assets/js/game-core.js";
import { QuestionEngine } from "../assets/js/question-engine.js";
import { GAME_CONFIG } from "../data/game-config.js";

const seededRandom = (() => {
  let seed = 2463534242;
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
})();

const countByDifficulty = questions => questions.reduce((counts, question) => {
  const level = Number(question.difficulty) === 2 ? "normal" : Number(question.difficulty) === 3 ? "hard" : "easy";
  counts[level] += 1;
  return counts;
}, { easy: 0, normal: 0, hard: 0 });

test("difficulty quotas use the exact session count and nearest integer composition", () => {
  assert.deepEqual(calculateDifficultyQuota(10, "easy"), { easy: 10, normal: 0, hard: 0 });
  assert.deepEqual(calculateDifficultyQuota(10, "normal"), { easy: 5, normal: 5, hard: 0 });
  assert.deepEqual(calculateDifficultyQuota(10, "hard"), { easy: 2, normal: 3, hard: 5 });
  const seven = calculateDifficultyQuota(7, "hard");
  assert.equal(seven.easy + seven.normal + seven.hard, 7);
  assert.deepEqual(seven, { easy: 1, normal: 2, hard: 4 });
});

test("a selected difficulty is a one-time launch token, not a saved default", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); }
  };
  writeTrainingSelection({ trainingId: "mode", difficulty: "hard" }, storage);
  assert.deepEqual(readTrainingSelection(storage), { trainingId: "mode", difficulty: "hard", resume: false });
  clearTrainingSelection(storage);
  assert.equal(readTrainingSelection(storage), null);
});

test("an available bank receives exact quotas and a shuffled queue", () => {
  const questions = [
    ...Array.from({ length: 8 }, (_, index) => ({ id: "easy-" + index, trainingId: "mode", difficulty: 1 })),
    ...Array.from({ length: 8 }, (_, index) => ({ id: "normal-" + index, trainingId: "mode", difficulty: 2 })),
    ...Array.from({ length: 8 }, (_, index) => ({ id: "hard-" + index, trainingId: "mode", difficulty: 3 }))
  ];
  const session = buildDifficultyQuestionSession(questions, {
    trainingId: "mode",
    difficulty: "hard",
    questionCount: 10,
    random: seededRandom
  });
  assert.equal(session.totalQuestions, 10);
  assert.deepEqual(session.requestedQuota, { easy: 2, normal: 3, hard: 5 });
  assert.deepEqual(session.actualQuota, { easy: 2, normal: 3, hard: 5 });
  assert.equal(session.fallbackUsed, false);
  assert.equal(new Set(session.questionIds).size, 10);
  const levels = session.questions.map(question => question.difficulty);
  assert.notDeepEqual(levels, [...Array(2).fill(1), ...Array(3).fill(2), ...Array(5).fill(3)]);
});

test("all live science modes generate N questions with honest fallback and no premature repeats", () => {
  for (const subjectId of ["chemistry", "biology", "earth-science"]) {
    const content = getSubjectGameContent(subjectId);
    for (const mode of content.trainingModes) {
      const bank = content.questions.filter(question => question.trainingId === mode.id);
      for (const difficulty of ["easy", "normal", "hard"]) {
        const session = buildDifficultyQuestionSession(content.questions, {
          trainingId: mode.id,
          difficulty,
          questionCount: 10,
          random: seededRandom
        });
        assert.equal(session.questions.length, 10, `${subjectId}:${mode.id}:${difficulty}`);
        assert.equal(Object.values(session.requestedQuota).reduce((sum, count) => sum + count, 0), 10);
        assert.deepEqual(session.actualQuota, countByDifficulty(session.questions));
        assert.equal(new Set(session.questionIds).size, Math.min(10, bank.length), `${subjectId}:${mode.id}:${difficulty}`);
      }
    }
  }
  assert.deepEqual(getSubjectGameContent("physics").trainingModes, []);
  assert.deepEqual(getSubjectGameContent("physics").questions, []);
});

test("limited live banks expose their difficulty and repeat fallbacks explicitly", () => {
  const biology = getSubjectGameContent("biology");
  const biologySession = buildDifficultyQuestionSession(biology.questions, {
    trainingId: biology.trainingModes[0].id,
    difficulty: "hard",
    questionCount: 10,
    random: seededRandom
  });
  assert.deepEqual(biologySession.requestedQuota, { easy: 2, normal: 3, hard: 5 });
  assert.deepEqual(biologySession.actualQuota, { easy: 10, normal: 0, hard: 0 });
  assert.equal(biologySession.fallbackUsed, true);

  const earth = getSubjectGameContent("earth-science");
  const fossilSession = buildDifficultyQuestionSession(earth.questions, {
    trainingId: "earth-fossil-type",
    difficulty: "easy",
    questionCount: 10,
    random: seededRandom
  });
  assert.deepEqual(fossilSession.actualQuota, { easy: 10, normal: 0, hard: 0 });
  assert.equal(new Set(fossilSession.questionIds).size, 8);
  assert.equal(fossilSession.fallbackUsed, true);
});

test("GameCore consumes the generated queue before any fallback sampling", () => {
  const mode = {
    id: "fixture",
    title: "fixture",
    category: "fixture",
    difficultyLevels: ["easy", "normal", "hard"],
    rules: getSubjectGameContent("chemistry").trainingModes[0].rules
  };
  const questions = Array.from({ length: 10 }, (_, index) => ({
    id: "fixture-" + index,
    trainingId: "fixture",
    difficulty: index < 5 ? 1 : 2,
    type: "multiple_choice",
    inputMode: "multiple_choice",
    prompt: "fixture " + index,
    choices: ["yes", "no"],
    correctChoice: 0
  }));
  const session = buildDifficultyQuestionSession(questions, {
    trainingId: mode.id,
    difficulty: "normal",
    questionCount: 10,
    random: seededRandom
  });
  const core = new GameCore({
    questionEngine: new QuestionEngine(questions, { retryProbability: 0 }),
    config: Object.freeze({ ...GAME_CONFIG, correctAnswersToClear: 10 }),
    trainingProvider: id => id === mode.id ? mode : null,
    eventTarget: null
  });
  const shown = [];
  core.on("question:changed", event => shown.push(event.question.id));
  core.start({ trainingId: mode.id, difficulty: "normal", questionQueue: session.questionIds, sessionMetadata: session });
  for (let index = 0; index < 10; index += 1) core.submit("1");
  assert.deepEqual(shown, session.questionIds);
  assert.equal(core.state.sessionQuestionCursor, 10);
  assert.equal(core.state.totalQuestions, 10);
  assert.equal(core.state.correctAnswers, 10);
  assert.equal(core.state.status, "cleared");
});

test("a fixed queue ends after N answers, including wrong and timeout answers", () => {
  const mode = {
    id: "fixed-limit",
    title: "fixed limit",
    category: "fixture",
    difficultyLevels: ["easy", "normal", "hard"],
    rules: getSubjectGameContent("chemistry").trainingModes[0].rules
  };
  const questions = Array.from({ length: 4 }, (_, index) => ({
    id: "fixed-limit-" + index,
    trainingId: mode.id,
    difficulty: 1,
    type: "multiple_choice",
    inputMode: "multiple_choice",
    prompt: "fixture " + index,
    choices: ["yes", "no"],
    correctChoice: 0
  }));
  const core = new GameCore({
    questionEngine: new QuestionEngine(questions, { retryProbability: 0 }),
    config: Object.freeze({ ...GAME_CONFIG, correctAnswersToClear: 99 }),
    trainingProvider: id => id === mode.id ? mode : null,
    eventTarget: null
  });
  const shown = [];
  let completed = 0;
  let cleared = 0;
  core.on("question:changed", event => shown.push(event.question.id));
  core.on("game:complete", () => { completed += 1; });
  core.on("game:clear", () => { cleared += 1; });
  core.start({ trainingId: mode.id, questionQueue: questions.map(question => question.id) });
  core.submit("2");
  core.state.questionTimeRemaining = 0;
  core.tick(0.01);
  core.submit("2");
  core.submit("2");
  assert.deepEqual(shown, questions.map(question => question.id));
  assert.equal(core.state.totalQuestions, 4);
  assert.equal(core.state.wrongAnswers, 3);
  assert.equal(core.state.timeoutAnswers, 1);
  assert.equal(core.state.status, "completed");
  assert.equal(completed, 1);
  assert.equal(cleared, 0);
});

test("resuming a queue returns to the current unanswered session question", () => {
  const mode = {
    id: "resume-fixture",
    title: "resume fixture",
    category: "fixture",
    difficultyLevels: ["easy", "normal", "hard"],
    rules: getSubjectGameContent("chemistry").trainingModes[0].rules
  };
  const questions = Array.from({ length: 3 }, (_, index) => ({
    id: "resume-" + index,
    trainingId: mode.id,
    difficulty: 1,
    type: "multiple_choice",
    inputMode: "multiple_choice",
    prompt: "fixture " + index,
    choices: ["yes", "no"],
    correctChoice: 0
  }));
  const makeCore = () => new GameCore({
    questionEngine: new QuestionEngine(questions, { retryProbability: 0 }),
    config: Object.freeze({ ...GAME_CONFIG, correctAnswersToClear: 3 }),
    trainingProvider: id => id === mode.id ? mode : null,
    eventTarget: null
  });
  const first = makeCore();
  first.start({ trainingId: mode.id, questionQueue: questions.map(question => question.id) });
  const saved = first.snapshot();
  const resumed = makeCore();
  resumed.start({ trainingId: mode.id, resumeState: saved });
  assert.equal(resumed.question.id, questions[0].id);
  assert.equal(resumed.state.sessionQuestionCursor, 1);
});
