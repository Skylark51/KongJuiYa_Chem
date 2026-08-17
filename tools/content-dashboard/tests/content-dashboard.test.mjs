import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeContent, questionsToCsv } from "../content-analyzer.js";
import {
  filterQuestions,
  paginateQuestions,
  questionDetailModel,
  quizMakerQuery,
  sortQuestions
} from "../dashboard-model.js";

const rootUrl = new URL("../../../", import.meta.url);
const reportUrl = new URL("../generated/content-report.json", import.meta.url);

async function loadActualContent() {
  const module = await import(new URL("data/subject-game-content.js", rootUrl));
  return module.SUBJECT_GAME_CONTENT;
}

async function loadReport() {
  return JSON.parse(await readFile(reportUrl, "utf8"));
}

function syntheticQuestion(overrides = {}) {
  return {
    id: "sample-1",
    trainingId: "unit",
    type: "multiple_choice",
    difficulty: 1,
    prompt: "정상적인 테스트 문제입니다.",
    choices: ["정답", "오답"],
    correctChoice: 0,
    explanation: "해설",
    ...overrides
  };
}

function analyzeSynthetic(questions, assets = []) {
  return analyzeContent({
    subjectContents: {
      chemistry: { trainingModes: [{ id: "unit", category: "테스트" }], questions }
    },
    assetFiles: assets,
    generatedAt: "2026-01-01T00:00:00.000Z"
  });
}

test("all subject quiz sources load and actual totals are calculated", async () => {
  const content = await loadActualContent();
  assert.deepEqual(Object.keys(content).sort(), ["biology", "chemistry", "earth-science", "physics"]);
  const total = Object.values(content).reduce((sum, subject) => sum + subject.questions.length, 0);
  assert.equal(total, 785);
});

test("generated report contains subject, category and difficulty statistics", async () => {
  const report = await loadReport();
  assert.equal(report.summary.totalQuestions, 785);
  assert.deepEqual(
    Object.fromEntries(report.subjects.map(subject => [subject.id, subject.questionCount])),
    { chemistry: 637, physics: 0, biology: 10, "earth-science": 138 }
  );
  assert.ok(report.categories.length >= 9);
  assert.equal(report.difficulties.overall.reduce((sum, item) => sum + item.count, 0), 785);
});

test("duplicate IDs are errors", () => {
  const report = analyzeSynthetic([syntheticQuestion(), syntheticQuestion({ prompt: "두 번째 문제" })]);
  assert.ok(report.issues.some(issue => issue.code === "duplicate_id" && issue.severity === "error"));
});

test("missing assets are errors and Korean asset paths are accepted", () => {
  const assetPath = "assets/그림/공용/콩쥐/콩쥐-고전-홍색-한복.png";
  const missing = analyzeSynthetic([syntheticQuestion({ image: assetPath })]);
  assert.ok(missing.issues.some(issue => issue.code === "missing_asset"));
  const present = analyzeSynthetic([syntheticQuestion({ image: assetPath })], [assetPath]);
  assert.ok(!present.issues.some(issue => issue.code === "missing_asset"));
});

test("missing explanation and empty prompt are detected", () => {
  const report = analyzeSynthetic([syntheticQuestion({ prompt: "", explanation: "" })]);
  assert.ok(report.issues.some(issue => issue.code === "missing_prompt" && issue.severity === "error"));
  assert.ok(report.issues.some(issue => issue.code === "missing_explanation" && issue.severity === "warning"));
});

test("invalid answer index is detected", () => {
  const report = analyzeSynthetic([syntheticQuestion({ correctChoice: 8 })]);
  assert.ok(report.issues.some(issue => issue.code === "invalid_correct_choice"));
});

test("search and all requested inventory filters work", async () => {
  const { questions } = await loadReport();
  assert.ok(filterQuestions(questions, { search: "atomic_number" }).length > 0);
  assert.equal(filterQuestions(questions, { subject: "physics" }).length, 0);
  const chemistry = filterQuestions(questions, { subject: "chemistry" });
  assert.equal(chemistry.length, 637);
  const sample = chemistry.find(question => question.category && question.difficulty && question.type);
  assert.ok(filterQuestions(questions, { category: sample.category }).every(item => item.category === sample.category));
  assert.ok(filterQuestions(questions, { difficulty: sample.difficulty }).every(item => item.difficulty === sample.difficulty));
  assert.ok(filterQuestions(questions, { type: sample.type }).every(item => item.type === sample.type));
  assert.ok(filterQuestions(questions, { asset: "yes" }).every(item => item.assetPaths.length));
  assert.ok(filterQuestions(questions, { animation: "no" }).every(item => !item.hasAnimation));
  assert.ok(filterQuestions(questions, { explanation: "no" }).every(item => !item.explanation));
  assert.ok(filterQuestions(questions, { status: "warning" }).every(item => item.warningCount));
});

test("sorting, pagination and detail panel models are stable", async () => {
  const report = await loadReport();
  const sorted = sortQuestions(report.questions, { key: "id", direction: "asc" });
  assert.equal(sorted.length, 785);
  const page = paginateQuestions(sorted, 2, 25);
  assert.equal(page.items.length, 25);
  assert.equal(page.page, 2);
  const detail = questionDetailModel(report, report.questions[0].uid);
  assert.equal(detail.uid, report.questions[0].uid);
  assert.ok(Array.isArray(detail.issues));
  assert.equal(quizMakerQuery("문제 1"), "?questionId=%EB%AC%B8%EC%A0%9C%201");
});

test("JSON and CSV exports contain the inventory", async () => {
  const report = await loadReport();
  const json = JSON.parse(JSON.stringify(report));
  assert.equal(json.questions.length, 785);
  const csv = questionsToCsv(report.questions);
  assert.ok(csv.startsWith("\"id\","));
  assert.equal(csv.trim().split(/\r?\n/).length, 786);
  assert.match(csv, /화학/);
});

test("production entry pages do not link to the developer dashboard", async () => {
  for (const file of [
    "index.html",
    "subjects/physics/index.html",
    "subjects/chemistry/index.html",
    "subjects/biology/index.html",
    "subjects/earth-science/index.html",
    "shop.html"
  ]) {
    const source = await readFile(new URL(file, rootUrl), "utf8");
    assert.doesNotMatch(source, /content-dashboard/);
  }
});
