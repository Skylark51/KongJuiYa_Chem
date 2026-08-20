import test from "node:test";
import assert from "node:assert/strict";
import {
  buildJarRecordAnalytics,
  createJarSessionRecord,
  normalizeJarSessionRecord
} from "../assets/js/jar-records.js";
import { migrateSave } from "../assets/js/storage.js";
import { SubjectGameStorage } from "../assets/js/subject-game-storage.js";

const modes = [
  { id: "atoms", title: "원자", category: "원자 구조" },
  { id: "redox", title: "산화 환원", category: "산화환원" }
];

test("new jar session records retain the additive growth schema", () => {
  const record = createJarSessionRecord({
    difficulty: "hard",
    totalQuestions: 10,
    correctAnswers: 8,
    wrongAnswers: 1,
    timeoutAnswers: 1,
    maxCombo: 5,
    categoryResults: { "산화환원": { correctAnswers: 8, totalQuestions: 10 } }
  }, { subject: "chemistry", mode: modes[1], playDate: "2026-08-20T09:00:00.000Z" });
  assert.deepEqual(record, {
    playDate: "2026-08-20T09:00:00.000Z",
    subject: "chemistry",
    selectedDifficulty: "hard",
    totalQuestions: 10,
    correctAnswers: 8,
    accuracy: 80,
    maxCombo: 5,
    categoryResults: { "산화환원": { correctAnswers: 8, totalQuestions: 10, accuracy: 80 } }
  });
});

test("legacy chemistry rows remain readable without inventing a session accuracy", () => {
  const legacy = normalizeJarSessionRecord({
    trainingId: "atoms",
    questionCount: 10,
    correct: 10,
    bestCombo: 10,
    status: "cleared",
    endedAt: "2026-08-18T09:00:00.000Z"
  }, { modes, subject: "chemistry" });
  assert.equal(legacy.totalQuestions, 10);
  assert.equal(legacy.correctAnswers, 10);
  assert.equal(legacy.accuracy, null);
});

test("growth analytics reflects real session totals, category recency, and a new personal best", () => {
  const analytics = buildJarRecordAnalytics({
    modes,
    subject: "chemistry",
    overall: { totalCompletions: 2, bestCombo: 6 },
    records: [
      {
        trainingId: "atoms", subject: "chemistry", selectedDifficulty: "easy",
        totalQuestions: 10, correctAnswers: 7, wrongAnswers: 3, accuracy: 70, maxCombo: 3,
        categoryResults: { "원자 구조": { correctAnswers: 7, totalQuestions: 10 } },
        status: "cleared", playDate: "2026-08-18T09:00:00.000Z"
      },
      {
        trainingId: "redox", subject: "chemistry", selectedDifficulty: "hard",
        totalQuestions: 10, correctAnswers: 9, wrongAnswers: 1, accuracy: 90, maxCombo: 6,
        categoryResults: { "산화환원": { correctAnswers: 9, totalQuestions: 10 } },
        status: "cleared", playDate: "2026-08-19T09:00:00.000Z"
      }
    ]
  });
  assert.deepEqual(analytics.totals, {
    completedPlays: 2,
    totalQuestions: 20,
    correctAnswers: 16,
    accuracy: 80,
    maxCombo: 6
  });
  assert.equal(analytics.growth.accuracyChange, 20);
  assert.equal(analytics.growth.personalBest, 90);
  assert.equal(analytics.growth.latestIsPersonalBest, true);
  assert.deepEqual(analytics.categories.map(item => [item.category, item.totalQuestions, item.accuracy, item.recentAccuracy, item.status]), [
    ["산화환원", 10, 90, 90, "강점"],
    ["원자 구조", 10, 70, 70, "보통"]
  ]);
});

test("durable personal best remains authoritative after recent session history is trimmed", () => {
  const analytics = buildJarRecordAnalytics({
    modes,
    subject: "chemistry",
    overall: { totalCompletions: 4, bestAccuracy: 96 },
    records: [
      {
        trainingId: "redox", subject: "chemistry", selectedDifficulty: "hard",
        totalQuestions: 10, correctAnswers: 9, wrongAnswers: 1, accuracy: 90, maxCombo: 6,
        categoryResults: { "산화 환원": { correctAnswers: 9, totalQuestions: 10 } },
        status: "completed", playDate: "2026-08-20T09:00:00.000Z",
        isPersonalBestAccuracy: false
      }
    ]
  });
  assert.equal(analytics.growth.personalBest, 96);
  assert.equal(analytics.growth.latestIsPersonalBest, false);
});

test("subject records preserve their durable personal best independently of retained rows", () => {
  const values = new Map();
  const local = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); }
  };
  const storage = new SubjectGameStorage("biology", { data: {}, persist() {} }, id => (
    id === "evolution" ? { id, title: "진화", category: "진화" } : null
  ), local);
  storage.subjectStorage.write("record-summary", { bestAccuracy: 96, totalCompletions: 4 });
  storage.finishRun({
    trainingId: "evolution", difficulty: "hard", status: "completed",
    totalQuestions: 10, correctAnswers: 9, wrongAnswers: 1, bestCombo: 4
  });
  const records = storage.subjectStorage.read("records", []);
  assert.equal(records[0].isPersonalBestAccuracy, false);
  assert.deepEqual(storage.getRecordSummary(records), { bestAccuracy: 96, totalCompletions: 4 });
});

test("save migration keeps legacy settings and records without resetting them", () => {
  const migrated = migrateSave({
    version: 5,
    settings: { difficulty: "hard", volume: 0.4, questionCount: 12, animations: false },
    overall: { bestCombo: 9 },
    recentRuns: [{ trainingId: "atoms", status: "cleared", questionCount: 10, correct: 10 }]
  });
  assert.equal(migrated.settings.difficulty, "hard");
  assert.equal(migrated.settings.volume, 0.4);
  assert.equal(migrated.settings.questionCount, 12);
  assert.equal(migrated.settings.animations, false);
  assert.equal(migrated.recentRuns.length, 1);
  assert.equal(migrated.overall.totalCompletions, 1);
  assert.equal(migrated.overall.bestAccuracy, null);
});
