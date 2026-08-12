import { TRAINING_MODES } from "./training-modes.js";

const chemistryQuizzes = Object.freeze(TRAINING_MODES.map(mode => Object.freeze({
  id: mode.id,
  title: mode.title,
  category: mode.category,
  description: mode.shortDescription,
  implementation: "콩쥐야_줘때써.html?training=" + encodeURIComponent(mode.id),
  source: "legacy-chemistry"
})));

export const SUBJECT_QUIZZES = Object.freeze({
  chemistry: chemistryQuizzes,
  physics: Object.freeze([]),
  biology: Object.freeze([]),
  "earth-science": Object.freeze([])
});

export function quizzesForSubject(subjectId) {
  return SUBJECT_QUIZZES[subjectId] || Object.freeze([]);
}

export function categoriesForSubject(subjectId) {
  return Object.freeze([...new Set(quizzesForSubject(subjectId).map(quiz => quiz.category).filter(Boolean))]);
}
