import { mountSharedQuiz } from "./subject-quiz-redirect.js";

const allowedTrainingIds = new Set([
  "earth-fossil-type",
  "earth-index-fossil-era",
  "earth-geologic-era-keywords"
]);
const requested = new URLSearchParams(location.search).get("training");
const trainingId = allowedTrainingIds.has(requested) ? requested : "earth-fossil-type";

mountSharedQuiz({
  subjectId: "earth-science",
  trainingId
});
