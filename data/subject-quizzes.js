import { TRAINING_MODES } from "./training-modes.js";

const chemistryQuizzes = Object.freeze(TRAINING_MODES.map(mode => Object.freeze({
  id: mode.id,
  title: mode.title,
  category: mode.category,
  description: mode.shortDescription,
  implementation: "콩쥐야_줘때써.html?training=" + encodeURIComponent(mode.id),
  source: "legacy-chemistry"
})));

const earthScienceQuizzes = Object.freeze([
  {
    id: "earth-fossil-type",
    title: "시상 화석과 표준 화석 구분 장독대",
    category: "통합과학2 - 지질 시대의 환경과 생물",
    description: "화석 사진을 보고 시상 화석과 표준 화석을 구분합니다.",
    implementation: "subjects/earth-science/quiz.html?quiz=earth-fossil-type",
    status: "live"
  },
  {
    id: "earth-index-fossil-era",
    title: "표준 화석의 시대 구분 장독대",
    category: "통합과학2 - 지질 시대의 환경과 생물",
    description: "표준 화석 사진을 보고 해당 지질 시대를 구분합니다.",
    implementation: "subjects/earth-science/quiz.html?quiz=earth-index-fossil-era",
    status: "live"
  },
  {
    id: "earth-geologic-era-keywords",
    title: "지질 시대 키워드 구분 장독대",
    category: "통합과학2 - 지질 시대의 환경과 생물",
    description: "문제 등록 예정",
    status: "planned"
  }
].map(quiz => Object.freeze(quiz)));

const biologyQuizzes = Object.freeze([
  {
    id: "biology-variation-natural-selection",
    title: "변이와 자연선택 과정 구분 장독대",
    category: "통합과학2 - 변이와 자연선택에 의한 생물의 진화",
    description: "자료를 읽고 변이의 원인과 자연선택에 의한 진화 과정을 구분합니다.",
    implementation: "subjects/biology/quiz.html?quiz=biology-variation-natural-selection",
    status: "live"
  },
  {
    id: "biology-biodiversity-types",
    title: "생물 다양성 종류 구분 장독대",
    category: "통합과학2 - 생물다양성",
    description: "문제 등록 예정",
    status: "planned"
  },
  {
    id: "biology-biodiversity-loss-causes",
    title: "생물 다양성의 감소 원인 구분 장독대",
    category: "통합과학2 - 생물다양성",
    description: "문제 등록 예정",
    status: "planned"
  },
  {
    id: "biology-biodiversity-conservation",
    title: "생물다양성을 보전하기 위한 노력 구분 장독대",
    category: "통합과학2 - 생물다양성",
    description: "문제 등록 예정",
    status: "planned"
  }
].map(quiz => Object.freeze(quiz)));

export const SUBJECT_QUIZZES = Object.freeze({
  chemistry: chemistryQuizzes,
  physics: Object.freeze([]),
  biology: biologyQuizzes,
  "earth-science": earthScienceQuizzes
});

export const SUBJECT_CATEGORIES = Object.freeze({
  chemistry: Object.freeze([]),
  physics: Object.freeze([]),
  biology: Object.freeze([
    "통합과학2 - 변이와 자연선택에 의한 생물의 진화",
    "통합과학2 - 생물다양성"
  ]),
  "earth-science": Object.freeze([])
});

export function quizzesForSubject(subjectId) {
  return SUBJECT_QUIZZES[subjectId] || Object.freeze([]);
}

export function categoriesForSubject(subjectId) {
  const declared = SUBJECT_CATEGORIES[subjectId] || [];
  const fromQuizzes = quizzesForSubject(subjectId).map(quiz => quiz.category).filter(Boolean);
  return Object.freeze([...new Set([...declared, ...fromQuizzes])]);
}
