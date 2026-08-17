import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SUBJECTS, suggestQuestionId, editorFromQuestion, buildProductionQuestion, validateEditor, cloneEditor, parseImportedQuestion, createTrainingMode } from "./core.js";
import { loadCatalog, loadAssets, readAuthoredState, serializeAuthoredState, writeAuthoredState } from "./server.mjs";
import { getInputDescriptor } from "../../assets/js/question-engine.js";

const assets = await loadAssets();
const assetPaths = assets.map(item => item.path);
const catalog = await loadCatalog();
const validEditor = (subjectId = "chemistry") => ({
  subjectId, category: "테스트", trainingId: `${subjectId}-test`, id: `${subjectId}-test-001`, difficulty: 1,
  type: "multiple_choice", prompt: "정답을 고르세요.", choices: ["정답", "오답 1", "오답 2", "오답 3"], correctIndex: 0,
  answer: "", explanation: "정답이므로 정답입니다.", tags: ["테스트"], asset: "", imageAlt: "", sourceLabel: "", original: null
});

test("1 정상적인 신규 문제 생성", () => {
  const editor = validEditor();
  assert.deepEqual(validateEditor(editor, { ids: [], assets: assetPaths }), []);
  assert.equal(buildProductionQuestion(editor).correctChoice, 0);
});

test("2 문제 ID 중복", () => assert.match(validateEditor(validEditor(), { ids: ["chemistry-test-001"], assets: assetPaths }).join(), /이미 존재/));
test("3 선택지 누락", () => { const editor = validEditor(); editor.choices[2] = ""; assert.match(validateEditor(editor, { ids: [], assets: assetPaths }).join(), /선택지 3/); });
test("4 정답 누락", () => { const editor = validEditor(); editor.correctIndex = -1; assert.match(validateEditor(editor, { ids: [], assets: assetPaths }).join(), /정답/); });
test("5 없는 asset 지정", () => { const editor = validEditor(); editor.asset = "assets/없는-파일.png"; assert.match(validateEditor(editor, { ids: [], assets: assetPaths }).join(), /찾을 수 없습니다/); });

test("6 기존 문제 불러오기", () => {
  const question = catalog.chemistry.questions[0];
  const editor = editorFromQuestion(question, "chemistry", catalog.chemistry.modes.find(mode => mode.id === question.trainingId).category);
  assert.equal(editor.id, question.id); assert.equal(editor.prompt, question.prompt);
});

test("7 기존 문제 복제", () => {
  const original = { ...validEditor(), trainingId: "earth-fossil" };
  const clone = cloneEditor(original, ["earth_fossil_001", "earth_fossil_002"]);
  assert.equal(clone.id, "earth_fossil_003"); assert.equal(clone.original, null);
});

test("8 기존 문제 수정은 update에서 같은 ID를 허용", () => assert.deepEqual(validateEditor(validEditor(), { mode: "update", ids: ["chemistry-test-001"], assets: assetPaths }), []));
test("9 JSON import", () => { const q = buildProductionQuestion(validEditor()); assert.equal(parseImportedQuestion(JSON.stringify(q), "chemistry", "테스트", [q.trainingId]).id, q.id); });
test("10 잘못된 JSON import", () => assert.throws(() => parseImportedQuestion("{", "chemistry", "", []), /JSON/));
test("11 한글 파일명 asset", () => assert.ok(assets.some(item => /[가-힣]/.test(item.path))));

for (const [index, subject] of SUBJECTS.entries()) {
  test(`${12 + index} ${subject.label} 문제 production schema와 renderer 호환`, () => {
    const mode = createTrainingMode({ id: `${subject.id}-test`, title: `${subject.label} 테스트`, category: `${subject.label} category` });
    const question = buildProductionQuestion(validEditor(subject.id));
    const descriptor = getInputDescriptor(question);
    assert.equal(mode.id, question.trainingId); assert.equal(descriptor.choices.length, 4); assert.equal(descriptor.autoSubmit, true);
  });
}

test("ID 자동 생성은 기존 numeric suffix 다음 값을 제안", () => assert.equal(suggestQuestionId("atomic_number", ["atomic_number_001", "atomic_number_009"]), "atomic_number_010"));

test("대표 문제 load-serialize round trip은 네 과목 adapter 필드를 보존", () => {
  for (const subjectId of ["chemistry", "biology", "earth-science"]) {
    const question = catalog[subjectId].questions[0];
    const mode = catalog[subjectId].modes.find(item => item.id === question.trainingId);
    const output = buildProductionQuestion(editorFromQuestion(question, subjectId, mode.category));
    for (const key of Object.keys(question)) assert.deepEqual(output[key], question[key], `${subjectId}:${key}`);
  }
});

test("authored module atomic serializer round trip", async () => {
  const state = await readAuthoredState();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "quiz-maker-test-"));
  const target = path.join(directory, "authored.js");
  await writeAuthoredState(state, target);
  const source = await fs.readFile(target, "utf8");
  assert.equal(source, serializeAuthoredState(state));
  assert.equal((await fs.readdir(directory)).length, 1);
  await fs.rm(directory, { recursive: true, force: true });
});

test("production content validation remains clean", () => {
  assert.deepEqual(catalog.chemistry.validationErrors, []);
  assert.deepEqual(catalog.biology.validationErrors, []);
  assert.deepEqual(catalog["earth-science"].validationErrors, []);
});
