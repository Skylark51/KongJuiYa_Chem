import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, QUESTION_BANKS, validateQuestions } from '../data/questions.js';
import {
  ELEMENTS_1_TO_20,
  ATOMIC_MASSES,
  VALENCE_ELECTRONS,
  ELECTRONEGATIVITY
} from '../data/chemistry-constants.js';
import { TRAINING_MODES } from '../data/training-modes.js';
import { evaluateAnswer, getInputDescriptor } from '../assets/js/question-engine.js';

const symbols = question => question.tags.filter(tag => ELEMENTS_1_TO_20.includes(tag));

test('atomic-number questions are H-Ca symbols with integer answers', () => {
  const questions = QUESTION_BANKS.atomic_number;
  assert.equal(questions.length, 20);
  assert.deepEqual(questions.map(question => question.tags[1]), ELEMENTS_1_TO_20);
  questions.forEach((question, index) => {
    assert.equal(question.prompt, ELEMENTS_1_TO_20[index]);
    assert.equal(question.answers[0], String(index + 1));
    assert.equal(question.answerMode, 'integer');
    assert.equal(question.difficulty, 1);
  });
});

test('atomic masses match the complete fixed table', () => {
  const questions = QUESTION_BANKS.atomic_mass;
  assert.equal(questions.length, 20);
  assert.equal(Object.keys(ATOMIC_MASSES).length, 20);
  for (const question of questions) {
    const symbol = question.tags[1];
    assert.equal(Number(question.answers[0]), ATOMIC_MASSES[symbol]);
  }
});

test('period, valence, and electronegativity constants stay fixed', () => {
  assert.equal(QUESTION_BANKS.period_group.length, 40);
  for (const symbol of ['He', 'Ne', 'Ar']) {
    const question = QUESTION_BANKS.valence_electron.find(item => item.tags.includes(symbol));
    assert.deepEqual(question.answers, ['0']);
  }
  assert.equal(Object.keys(VALENCE_ELECTRONS).length, 20);
  const values = QUESTION_BANKS.electronegativity.filter(question => question.id.startsWith('electronegativity_value_'));
  assert.equal(values.length, Object.keys(ELECTRONEGATIVITY).length);
  for (const question of values) {
    const symbol = symbols(question)[0];
    assert.equal(Number(question.answers[0]), ELECTRONEGATIVITY[symbol]);
    assert.ok(!['He', 'Ne', 'Ar'].includes(symbol));
  }
});

test('mole/mass and gas banks keep grading metadata', () => {
  assert.ok(QUESTION_BANKS.mole_mass.length >= 20);
  const sample = QUESTION_BANKS.mole_mass.find(question => question.unit === 'g');
  assert.equal(evaluateAnswer(sample, sample.answers[0] + ' g').correct, true);
  for (const question of QUESTION_BANKS.gas_molar_volume) {
    assert.doesNotMatch(question.prompt + question.explanation, /PV\s*=/);
    assert.match(question.prompt, /1기압|같은 온도와 같은 압력/);
  }
});

test('redox and acid-base banks keep their choice contracts', () => {
  const redox = QUESTION_BANKS.redox;
  assert.equal(redox.length, 52);
  assert.ok(redox.every(question => question.choices.length === 3));
  assert.ok(redox.every(question => question.promptHtml?.includes('<u>')));
  assert.ok(redox.every(question => !/[\r\n]/.test(question.prompt)), '산화-환원 반응식은 한 줄이어야 합니다.');
  assert.deepEqual(redox[0].choices.map(choice => choice.key), ['1', '2', '3']);
  assert.equal(QUESTION_BANKS.acid_base.length, 17);
});

test('worksheet-derived chemistry questions are merged without duplicate ids', () => {
  const oxidation = QUESTION_BANKS.oxidation_number;
  assert.equal(oxidation.length, 66);
  for (const [id, prompt, answer] of [
    ['oxidation_number_064', 'C', '0'],
    ['oxidation_number_065', 'Na₂O', '1'],
    ['oxidation_number_066', 'Al₂S₃', '-2']
  ]) {
    const question = oxidation.find(item => item.id === id);
    assert.ok(question, `${id} 문항이 없습니다.`);
    assert.equal(question.prompt, prompt);
    assert.equal(question.answers[0], answer);
    assert.ok(question.tags.includes('문제지 추출'));
  }

  const redox = QUESTION_BANKS.redox;
  for (const equation of [
    'C + O₂ → CO₂',
    '2H₂ + O₂ → 2H₂O',
    'ZnO + C → Zn + CO',
    '4Fe + 3O₂ → 2Fe₂O₃',
    'N₂ + O₂ → 2NO',
    '2NO + O₂ → 2NO₂',
    '4Na + O₂ → 2Na₂O',
    '2Cu + O₂ → 2CuO',
    '4Al + 3O₂ → 2Al₂O₃',
    '2Ag⁺ + Fe → 2Ag + Fe²⁺',
    '2Al + 3Ag₂S → Al₂S₃ + 6Ag'
  ]) {
    const variants = redox.filter(question => question.prompt === equation);
    assert.equal(variants.length, 2, `${equation}: 산화/환원 문항이 각각 하나씩 필요합니다.`);
    assert.deepEqual(new Set(variants.map(question => question.tags[1])), new Set(['oxidation', 'reduction']));
    assert.ok(variants.every(question => question.tags.includes('문제지 추출')));
  }
});

test('all questions are unique, valid, and mobile-ready', () => {
  assert.deepEqual(validateQuestions(), []);
  assert.equal(new Set(QUESTIONS.map(question => question.id)).size, QUESTIONS.length);
  for (const question of QUESTIONS) {
    const descriptor = getInputDescriptor(question);
    assert.ok(question.inputMode);
    assert.ok(Array.isArray(question.allowedKeys));
    assert.equal(typeof question.autoSubmit, 'boolean');
    assert.equal(descriptor.inputMode, question.inputMode);
  }
  assert.equal(TRAINING_MODES.length, 26);
});
