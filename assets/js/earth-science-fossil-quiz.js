import { mountSharedQuiz } from "./subject-quiz-redirect.js";

const requestedTraining = new URLSearchParams(location.search).get("training");
mountSharedQuiz({
  subjectId: "earth-science",
  trainingId: requestedTraining || "earth-fossil-type"
});
