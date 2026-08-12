import { mountSharedQuiz } from "./subject-quiz-redirect.js";

const requested = new URL(location.href).searchParams.get("quiz");
const trainingId = ["earth-fossil-type", "earth-index-fossil-era"].includes(requested)
  ? requested
  : "earth-fossil-type";

mountSharedQuiz({ subjectId: "earth-science", trainingId });
