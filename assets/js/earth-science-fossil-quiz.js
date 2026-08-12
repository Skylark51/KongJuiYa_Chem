import {
  EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS,
  EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS,
  FOSSIL_ERA_CHOICES,
  FOSSIL_TYPE_CHOICES
} from "../../data/questions/earth-science-fossil-type.js";
import { SubjectStorage } from "./subject-storage.js";
import { siteUrl } from "./site-routing.js";

const QUIZZES = Object.freeze({
  "earth-fossil-type": Object.freeze({
    title: "시상 화석과 표준 화석 구분 장독대",
    instruction: "화석 사진을 보고 시상 화석과 표준 화석을 구분하세요.",
    questions: EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS,
    choices: FOSSIL_TYPE_CHOICES
  }),
  "earth-index-fossil-era": Object.freeze({
    title: "표준 화석의 시대 구분 장독대",
    instruction: "표준 화석 사진을 보고 해당 지질 시대를 고르세요.",
    questions: EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS,
    choices: FOSSIL_ERA_CHOICES
  })
});

const requestedQuizId = new URL(location.href).searchParams.get("quiz") || "earth-fossil-type";
const quizId = QUIZZES[requestedQuizId] ? requestedQuizId : "earth-fossil-type";
const quiz = QUIZZES[quizId];

const storage = new SubjectStorage("earth-science");
const byId = id => document.getElementById(id);
const state = { index: 0, correct: 0, wrong: 0, combo: 0, bestCombo: 0, answered: false };

function imageUrl(path) {
  return siteUrl(path);
}

function renderQuestion() {
  const question = quiz.questions[state.index];
  state.answered = false;
  byId("quizTitle").textContent = quiz.title;
  byId("quizInstruction").textContent = quiz.instruction;
  document.title = quiz.title + " | 콩쥐야 줘때써 - 지구과학편";
  byId("progressText").textContent = state.index + 1 + " / " + quiz.questions.length;
  byId("progressBar").style.width = state.index / quiz.questions.length * 100 + "%";
  byId("fossilImage").src = imageUrl(question.image);
  byId("fossilImage").alt = question.name + " 사진";
  byId("fossilName").textContent = question.name;
  byId("feedback").hidden = true;
  byId("feedback").className = "feedback";
  byId("nextButton").hidden = true;
  byId("answerChoices").replaceChildren(...quiz.choices.map(choice => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice;
    button.dataset.choice = choice;
    button.addEventListener("click", () => answer(choice));
    return button;
  }));
}

function answer(choice) {
  if (state.answered) return;
  state.answered = true;
  const question = quiz.questions[state.index];
  const correct = choice === question.answer;
  if (correct) {
    state.correct += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
  } else {
    state.wrong += 1;
    state.combo = 0;
  }

  byId("answerChoices").querySelectorAll("button").forEach(button => {
    button.disabled = true;
    if (button.dataset.choice === question.answer) button.classList.add("is-correct");
    if (!correct && button.dataset.choice === choice) button.classList.add("is-wrong");
  });
  const feedback = byId("feedback");
  feedback.hidden = false;
  feedback.classList.add(correct ? "is-correct" : "is-wrong");
  byId("feedbackTitle").textContent = correct ? "정답입니다!" : "정답은 " + question.answer + "입니다.";
  byId("feedbackExplanation").textContent = question.explanation;
  const next = byId("nextButton");
  next.hidden = false;
  next.textContent = state.index === quiz.questions.length - 1 ? "결과 보기" : "다음 문제";
  byId("progressBar").style.width = (state.index + 1) / quiz.questions.length * 100 + "%";
}

function finish() {
  const records = storage.read("records", []);
  const record = Object.freeze({
    quizId,
    title: quiz.title,
    correct: state.correct,
    wrong: state.wrong,
    bestCombo: state.bestCombo,
    questionCount: quiz.questions.length,
    completedAt: new Date().toISOString()
  });
  storage.write("records", [record, ...records].slice(0, 100));
  byId("questionPanel").hidden = true;
  byId("resultPanel").hidden = false;
  byId("resultScore").textContent = state.correct + " / " + quiz.questions.length;
  const accuracy = Math.round(state.correct / quiz.questions.length * 100);
  byId("resultSummary").textContent = "정답률 " + accuracy + "% · 최고 연속 정답 " + state.bestCombo;
  byId("resultTitle").focus();
}

function next() {
  if (!state.answered) return;
  if (state.index === quiz.questions.length - 1) {
    finish();
    return;
  }
  state.index += 1;
  renderQuestion();
  byId("fossilName").focus();
}

function restart() {
  Object.assign(state, { index: 0, correct: 0, wrong: 0, combo: 0, bestCombo: 0, answered: false });
  byId("resultPanel").hidden = true;
  byId("questionPanel").hidden = false;
  renderQuestion();
}

byId("nextButton").addEventListener("click", next);
byId("retryButton").addEventListener("click", restart);
renderQuestion();
document.documentElement.dataset.subjectQuizReady = "true";
