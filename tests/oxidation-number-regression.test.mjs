import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { oxidationNumberQuestions } from "../data/questions/oxidation-number.js";
import { assertGameStyleLoaded } from "./helpers/game-styles.mjs";

const ALLOWED_TARGETS = new Set([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
  "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca"
]);
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const stripMarkup = html => html
  .replace(/^<span class="oxidation-formula">/, "")
  .replace(/<\/span>$/, "")
  .replace(/<\/?u>/g, "");

test("oxidation-number bank is formula-only, underlined, broad, and difficulty-balanced", () => {
  assert.equal(oxidationNumberQuestions.length, 63);
  assert.deepEqual(
    [1, 2, 3].map(level => oxidationNumberQuestions.filter(q => q.difficulty === level).length),
    [21, 21, 21]
  );

  for (const question of oxidationNumberQuestions) {
    assert.doesNotMatch(question.prompt, /[가-힣?\r\n]/, `${question.id}: 발문은 화학식만 사용해야 합니다.`);
    assert.match(question.promptHtml, /^<span class="oxidation-formula">.*<u>[^<]+<\/u>.*<\/span>$/);
    assert.equal((question.promptHtml.match(/<u>/g) || []).length, 1, `${question.id}: 밑줄 표시는 하나여야 합니다.`);
    assert.equal(stripMarkup(question.promptHtml), question.prompt, `${question.id}: 표시용 화학식과 원문 화학식이 달라서는 안 됩니다.`);
    assert.equal(question.answerMode, "integer");
    assert.equal(Number.isInteger(Number(question.answers[0])), true);
    assert.ok(ALLOWED_TARGETS.has(question.tags[1]), `${question.id}: H~Ca 범위 밖 원소가 대상입니다.`);
  }
});

test("oxidation-number bank covers standard rules, exceptions, averages, and multiple oxidation states", () => {
  const kinds = new Set(oxidationNumberQuestions.map(q => q.tags[2]));
  for (const kind of [
    "홑원소", "단원자 이온", "이온 결합 화합물", "공유 결합 화합물", "다원자 이온", "산",
    "과산화물", "금속 수소화물", "산소-플루오린 화합물", "산소산", "다원소 화합물", "동일 원소 다중 산화수"
  ]) {
    assert.ok(kinds.has(kind), `${kind} 유형이 필요합니다.`);
  }

  const prompts = oxidationNumberQuestions.map(q => q.prompt).join(" ");
  for (const formula of [
    "H₂O₂", "NaH", "CaH₂", "OF₂", "Na₂O₂", "K₂O₂", "MgH₂", "KH",
    "HClO", "HClO₄", "CH₃OH", "C₂H₆O", "C₂H₄O₂", "C₆H₁₂O₆", "NH₄NO₃"
  ]) {
    assert.match(prompts, new RegExp(formula), `${formula} 문항이 필요합니다.`);
  }
  assert.doesNotMatch(prompts, /Fe|Mn|Cr|Cu|Zn|Ag|Br|I|Ba|Pb/);

  const expectedById = new Map([
    ["oxidation_number_016", 4],
    ["oxidation_number_018", -4],
    ["oxidation_number_033", 6],
    ["oxidation_number_037", -3],
    ["oxidation_number_040", 5],
    ["oxidation_number_045", 5],
    ["oxidation_number_046", -1],
    ["oxidation_number_048", -1],
    ["oxidation_number_050", 2],
    ["oxidation_number_052", -1],
    ["oxidation_number_054", -1],
    ["oxidation_number_056", 1],
    ["oxidation_number_057", 7],
    ["oxidation_number_058", -2],
    ["oxidation_number_059", -2],
    ["oxidation_number_060", 0],
    ["oxidation_number_061", 0],
    ["oxidation_number_062", -3],
    ["oxidation_number_063", 5]
  ]);
  for (const [id, answer] of expectedById) {
    const question = oxidationNumberQuestions.find(q => q.id === id);
    assert.ok(question, `${id} 문항이 없습니다.`);
    assert.equal(Number(question.answers[0]), answer, `${id} 산화수가 잘못되었습니다.`);
  }

  for (const id of ["oxidation_number_059", "oxidation_number_060", "oxidation_number_061"]) {
    const question = oxidationNumberQuestions.find(q => q.id === id);
    assert.match(question.explanation, /H와 O를 먼저 처리/);
    assert.match(question.explanation, /평균 산화수/);
  }

  const ammoniumN = oxidationNumberQuestions.find(q => q.id === "oxidation_number_062");
  const nitrateN = oxidationNumberQuestions.find(q => q.id === "oxidation_number_063");
  assert.equal(ammoniumN.prompt, nitrateN.prompt);
  assert.equal(Number(ammoniumN.answers[0]), -3);
  assert.equal(Number(nitrateN.answers[0]), 5);
  assert.notEqual(ammoniumN.promptHtml, nitrateN.promptHtml);
});

test("every oxidation-number question exposes the same signed keypad", () => {
  for (const question of oxidationNumberQuestions) {
    assert.equal(question.inputMode, "signed_numeric_keypad", `${question.id}: 산화수 문제의 키패드는 항상 동일해야 합니다.`);
    assert.ok(question.allowedKeys.includes("+"), `${question.id}: + 입력이 항상 보여야 합니다.`);
    assert.ok(question.allowedKeys.includes("-"), `${question.id}: - 입력이 항상 보여야 합니다.`);
    for (const digit of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
      assert.ok(question.allowedKeys.includes(digit), `${question.id}: 숫자 ${digit} 입력이 필요합니다.`);
    }
  }
});

test("oxidation-number signed keypad keeps the sign row separate from number keys", () => {
  const css = read("assets/css/oxidation-number-keypad.css");

  assert.match(css, /data-training-id="oxidation_number"/);
  assert.match(css, /data-input-mode="signed_numeric_keypad"/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*0\.9fr\)\s*minmax\(0,\s*1\.1fr\)/);
  assert.match(css, /grid-template-rows:\s*36px\s*minmax\(0,\s*1fr\)\s*!important/);
  assert.match(css, /row-gap:\s*6px\s*!important/);
  assert.match(css, /\.keypad-display-row\s*\{[^}]*max-height:\s*36px[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.keypad-modifiers\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.keypad-modifier\s*\{[^}]*height:\s*100%\s*!important[^}]*min-height:\s*0\s*!important[^}]*max-height:\s*100%/s);
  assert.match(css, /grid-template-rows:\s*32px\s*minmax\(0,\s*1fr\)\s*!important/);
  assert.match(css, /grid-template-rows:\s*29px\s*minmax\(0,\s*1fr\)\s*!important/);
  assertGameStyleLoaded(assert, "oxidation-number-keypad.css", "20260807-oxidation-keypad2");
});
