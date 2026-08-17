import { UIAdapter } from "../../assets/js/ui-adapter.js";

const adapter = new UIAdapter(document);
const state = { water: 70, combo: 0, score: 0, correctInStage: 0, correctAnswersPerStage: 10, questionTimeRemaining: 25, status: "running", feedbackPending: false };
let question = null;
let training = { title: "미리보기", category: "Quiz Maker", description: "" };
adapter.engine = { get question() { return question; }, get training() { return training; }, state, snapshot: () => state, leakPerSecond: () => 1.5, timeLimit: () => 25 };
adapter.handlers = { submit: key => {
  const index = Number(key) - 1;
  const correct = question?.type === "binary_choice" ? String(key) === String(question.correctChoice) : index === Number(question?.correctChoice);
  adapter.feedback(`${correct ? "✓ 정답" : "✕ 오답"} · ${question?.explanation || "해설 없음"}`, correct ? "correct" : "wrong");
} };

window.addEventListener("message", event => {
  if (event.data?.type !== "quiz-maker-preview") return;
  question = event.data.question;
  training = event.data.training || training;
  document.documentElement.dataset.subject = event.data.subjectId || "chemistry";
  adapter.render(state);
});
parent.postMessage({ type: "quiz-maker-preview-ready" }, "*");
