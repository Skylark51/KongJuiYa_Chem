import { TRAINING_MODES as CHEMISTRY_TRAINING_MODES } from "./training-modes.js";
import { QUESTIONS as CHEMISTRY_QUESTIONS, validateQuestions as validateChemistryQuestions } from "./questions.js";
import { BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS } from "./questions/biology-variation-natural-selection.js";
import {
  EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS,
  EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS,
  FOSSIL_ERA_CHOICES,
  FOSSIL_TYPE_CHOICES
} from "./questions/earth-science-fossil-type.js";
import {
  EARTH_SCIENCE_GEOLOGIC_ERA_KEYWORD_QUESTIONS,
  GEOLOGIC_ERA_OX_CHOICES
} from "./questions/earth-science-geologic-era-keywords.js";
import {
  binaryRuntimeQuestion,
  multipleChoiceRuntimeQuestion
} from "./questions/_runtime-choice.js";
import { QUIZ_MAKER_AUTHORED_CONTENT } from "./questions/quiz-maker-authored.js";

const SUBJECT_IDS = new Set(["chemistry", "physics", "biology", "earth-science"]);
const rules = (leak = 1.5) => Object.freeze({
  initialWater: 70,
  correctWaterGain: 18,
  wrongWaterPenalty: 8,
  timeoutWaterPenalty: 10,
  leakPerSecond: leak,
  feverWindowSeconds: 4,
  feverRequiredCombo: 3
});
const mode = (id, shortTitle, description, category, icon, questionSource, leak = 1.5) => Object.freeze({
  id,
  title: `${shortTitle} 장독대 채우기`,
  shortTitle,
  shortDescription: description,
  description,
  category,
  icon,
  unlocked: true,
  recommendedDifficulty: "normal",
  difficultyLevels: ["easy", "normal", "hard"],
  questionSource,
  rules: rules(leak)
});

const biologyQuestions = Object.freeze(BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS.map(question => multipleChoiceRuntimeQuestion(
  question,
  "biology-variation-natural-selection",
  question.choices,
  { kind: "source-image", image: question.image, imageAlt: question.imageAlt, sourceLabel: question.sourceLabel }
)));

const fossilQuestions = (questions, trainingId, choices, prompt) => Object.freeze(questions.map(question => multipleChoiceRuntimeQuestion(
  { ...question, prompt },
  trainingId,
  choices,
  { kind: "source-image", image: question.image, imageAlt: `${question.name} 사진`, sourceLabel: question.name }
)));

const earthTypeQuestions = fossilQuestions(
  EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS,
  "earth-fossil-type",
  FOSSIL_TYPE_CHOICES,
  "이 화석을 시상 화석과 표준 화석 중에서 구분하세요."
);
const earthEraQuestions = fossilQuestions(
  EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS,
  "earth-index-fossil-era",
  FOSSIL_ERA_CHOICES,
  "이 표준 화석이 대표하는 지질 시대를 고르세요."
);

const earthGeologicEraKeywordQuestions = Object.freeze(
  EARTH_SCIENCE_GEOLOGIC_ERA_KEYWORD_QUESTIONS.map(question => binaryRuntimeQuestion(
    question,
    "earth-geologic-era-keywords",
    GEOLOGIC_ERA_OX_CHOICES
  ))
);

const biologyModes = Object.freeze([
  mode(
    "biology-variation-natural-selection",
    "변이와 자연선택 과정 구분",
    "자료를 읽고 변이의 원인과 자연선택에 의한 진화 과정을 구분합니다.",
    "통합과학2 - 변이와 자연선택에 의한 생물의 진화",
    "biology-evolution",
    "biologyVariationNaturalSelectionQuestions"
  )
]);

const earthModes = Object.freeze([
  mode(
    "earth-fossil-type",
    "시상 화석과 표준 화석 구분",
    "화석 사진을 보고 시상 화석과 표준 화석을 구분합니다.",
    "통합과학2 - 지질 시대의 환경과 생물",
    "earth-fossil",
    "earthScienceFossilTypeQuestions"
  ),
  mode(
    "earth-index-fossil-era",
    "표준 화석의 시대 구분",
    "표준 화석 사진을 보고 해당 지질 시대를 구분합니다.",
    "통합과학2 - 지질 시대의 환경과 생물",
    "earth-era",
    "earthScienceFossilEraQuestions"
  ),
  mode(
    "earth-geologic-era-keywords",
    "지질 시대 키워드 구분",
    "문장을 읽고 옳으면 O, 틀리면 X를 선택하여 지질 시대의 핵심 개념을 구분합니다.",
    "통합과학2 - 지질 시대의 환경과 생물",
    "earth-era",
    "earthScienceGeologicEraKeywordQuestions"
  )
]);

function hasValidCorrectChoice(question) {
  const choices = Array.isArray(question.choices) ? question.choices : [];
  if (choices.length < 2) return false;
  if (question.type === "binary_choice") {
    const choiceNumber = Number(question.correctChoice);
    return Number.isInteger(choiceNumber) && choiceNumber >= 1 && choiceNumber <= choices.length;
  }
  return Number.isInteger(question.correctChoice)
    && question.correctChoice >= 0
    && question.correctChoice < choices.length;
}

function validateContent(content) {
  const modeIds = new Set(content.trainingModes.map(item => item.id));
  return content.questions.flatMap(question => {
    const errors = [];
    if (!question.id) errors.push("missing question id");
    if (!modeIds.has(question.trainingId)) errors.push(`${question.id}: unknown training`);
    if (["binary_choice", "multiple_choice"].includes(question.type)) {
      if (!hasValidCorrectChoice(question)) errors.push(`${question.id}: invalid choices`);
    } else if (!Array.isArray(question.answers) || !question.answers.length) errors.push(`${question.id}: invalid answers`);
    return errors;
  });
}

function authoredContent(subjectId) {
  return QUIZ_MAKER_AUTHORED_CONTENT[subjectId] || { trainingModes: [], questions: [], overrides: {} };
}

function mergeAuthoredQuestions(subjectId, questions) {
  const authored = authoredContent(subjectId);
  const overrides = authored.overrides || {};
  return Object.freeze([
    ...questions.map(question => overrides[question.id] ? Object.freeze({ ...question, ...overrides[question.id] }) : question),
    ...(authored.questions || [])
  ]);
}

function mergeAuthoredModes(subjectId, trainingModes) {
  return Object.freeze([...trainingModes, ...(authoredContent(subjectId).trainingModes || [])]);
}

export function createSubjectGameContent({ subjectId, trainingModes = [], questions = [], validateQuestions = null }) {
  if (!SUBJECT_IDS.has(subjectId)) throw new Error(`Unknown subject: ${subjectId}`);
  const modes = Object.freeze([...trainingModes]);
  const bank = Object.freeze([...questions]);
  const modeMap = new Map(modes.map(item => [item.id, item]));
  const content = {
    subjectId,
    trainingModes: modes,
    questions: bank,
    getTrainingMode: id => modeMap.get(id) || null
  };
  content.validateQuestions = validateQuestions || (() => validateContent(content));
  return Object.freeze(content);
}

export const SUBJECT_GAME_CONTENT = Object.freeze({
  chemistry: createSubjectGameContent({
    subjectId: "chemistry",
    trainingModes: mergeAuthoredModes("chemistry", CHEMISTRY_TRAINING_MODES),
    questions: mergeAuthoredQuestions("chemistry", CHEMISTRY_QUESTIONS),
    validateQuestions: () => validateChemistryQuestions(mergeAuthoredQuestions("chemistry", CHEMISTRY_QUESTIONS))
  }),
  physics: createSubjectGameContent({
    subjectId: "physics",
    trainingModes: mergeAuthoredModes("physics", []),
    questions: mergeAuthoredQuestions("physics", [])
  }),
  biology: createSubjectGameContent({
    subjectId: "biology",
    trainingModes: mergeAuthoredModes("biology", biologyModes),
    questions: mergeAuthoredQuestions("biology", biologyQuestions)
  }),
  "earth-science": createSubjectGameContent({
    subjectId: "earth-science",
    trainingModes: mergeAuthoredModes("earth-science", earthModes),
    questions: mergeAuthoredQuestions("earth-science", [...earthTypeQuestions, ...earthEraQuestions, ...earthGeologicEraKeywordQuestions])
  })
});

export function normalizeSubjectId(value) {
  return SUBJECT_IDS.has(value) ? value : "chemistry";
}

export function getSubjectGameContent(subjectId = "chemistry") {
  return SUBJECT_GAME_CONTENT[normalizeSubjectId(subjectId)];
}

export function subjectIdFromLocation(locationRef = globalThis.location) {
  return normalizeSubjectId(new URL(locationRef.href).searchParams.get("subject") || "chemistry");
}
