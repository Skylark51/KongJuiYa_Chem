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
    description: "문제 등록 예정",
    status: "planned"
  },
  {
    id: "earth-index-fossil-era",
    title: "표준 화석의 시대 구분 장독대",
    category: "통합과학2 - 지질 시대의 환경과 생물",
    description: "문제 등록 예정",
    status: "planned"
  },
  {
    id: "earth-geologic-era-keywords",
    title: "지질 시대 키워드 구분 장독대",
    category: "통합과학2 - 지질 시대의 환경과 생물",
    description: "문제 등록 예정",
    status: "planned"
  }
].map(quiz => Object.freeze(quiz)));

export const SUBJECT_QUIZZES = Object.freeze({
  chemistry: chemistryQuizzes,
  physics: Object.freeze([]),
  biology: Object.freeze([]),
  "earth-science": earthScienceQuizzes
});

export function quizzesForSubject(subjectId) {
  return SUBJECT_QUIZZES[subjectId] || Object.freeze([]);
}

export function categoriesForSubject(subjectId) {
  return Object.freeze([...new Set(quizzesForSubject(subjectId).map(quiz => quiz.category).filter(Boolean))]);
}
