import { BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS } from "../../data/questions/biology-variation-natural-selection.js";
import { mountGameScene } from "./game-cosmetics-entry.js";
import { SubjectStorage } from "./subject-storage.js";
import { siteUrl } from "./site-routing.js";

const quizId = "biology-variation-natural-selection";
const quizTitle = "변이와 자연선택 과정 구분 장독대";
const questions = BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS;
const storage = new SubjectStorage("biology");
const byId = id => document.getElementById(id);
const state = { index: 0, correct: 0, wrong: 0, combo: 0, bestCombo: 0, water: 55, answered: false };
const scene = mountGameScene(byId("quizMain"));

function updateWater(next) {
  state.water = Math.max(0, Math.min(100, Number(next) || 0));
  byId("waterGauge").style.width = state.water + "%";
  byId("waterText").textContent = Math.round(state.water) + "%";
  scene.renderer.setWaterLevel(state.water);
}

function renderQuestion() {
  const question = questions[state.index];
  state.answered = false;
  byId("progressText").textContent = state.index + 1 + " / " + questions.length;
  byId("progressBar").style.width = state.index / questions.length * 100 + "%";
  byId("sourceImage").src = siteUrl(question.image);
  byId("sourceImage").alt = question.imageAlt;
  byId("sourceLabel").textContent = question.sourceLabel;
  byId("questionPrompt").textContent = question.prompt;
  byId("feedback").hidden = true;
  byId("feedback").className = "feedback";
  byId("nextButton").hidden = true;
  byId("answerChoices").replaceChildren(...question.choices.map((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.shortcut = String(index + 1);
    button.setAttribute("aria-keyshortcuts", String(index + 1));
    const key = document.createElement("kbd");
    key.textContent = String(index + 1);
    const label = document.createElement("span");
    label.textContent = choice;
    button.append(key, label);
    button.dataset.choice = choice;
    button.addEventListener("click", () => answer(choice));
    return button;
  }));
  dispatchEvent(new CustomEvent("question:changed", { detail: { water: state.water, questionId: question.id } }));
}

function answer(choice) {
  if (state.answered) return;
  state.answered = true;
  const question = questions[state.index];
  const correct = choice === question.answer;
  if (correct) {
    state.correct += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    updateWater(state.water + 6);
  } else {
    state.wrong += 1;
    state.combo = 0;
    updateWater(state.water - 5);
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
  byId("nextButton").hidden = false;
  byId("nextButton").textContent = state.index === questions.length - 1 ? "결과 보기" : "다음 문제";
  byId("progressBar").style.width = (state.index + 1) / questions.length * 100 + "%";
  dispatchEvent(new CustomEvent(correct ? "answer:correct" : "answer:wrong", {
    detail: { combo: state.combo, water: state.water, questionId: question.id }
  }));
}

function finish() {
  const records = storage.read("records", []);
  const record = Object.freeze({
    quizId,
    title: quizTitle,
    correct: state.correct,
    wrong: state.wrong,
    bestCombo: state.bestCombo,
    questionCount: questions.length,
    completedAt: new Date().toISOString()
  });
  storage.write("records", [record, ...records].slice(0, 100));
  byId("questionPanel").hidden = true;
  byId("resultPanel").hidden = false;
  byId("resultScore").textContent = state.correct + " / " + questions.length;
  byId("resultSummary").textContent = "정답률 " + Math.round(state.correct / questions.length * 100) + "% · 최고 연속 정답 " + state.bestCombo;
  dispatchEvent(new CustomEvent("game:clear", { detail: { combo: state.bestCombo, water: state.water } }));
  byId("resultTitle").focus();
}

function next() {
  if (!state.answered) return;
  if (state.index === questions.length - 1) {
    finish();
    return;
  }
  state.index += 1;
  renderQuestion();
  byId("questionPrompt").focus();
}

function restart() {
  Object.assign(state, { index: 0, correct: 0, wrong: 0, combo: 0, bestCombo: 0, water: 55, answered: false });
  byId("resultPanel").hidden = true;
  byId("questionPanel").hidden = false;
  updateWater(55);
  dispatchEvent(new CustomEvent("game:start", { detail: { water: state.water } }));
  renderQuestion();
}

function handleKeyboard(event) {
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
  if (state.answered || !/^[1-4]$/.test(event.key)) return;
  const choice = questions[state.index].choices[Number(event.key) - 1];
  if (!choice) return;
  event.preventDefault();
  answer(choice);
}

byId("nextButton").addEventListener("click", next);
byId("retryButton").addEventListener("click", restart);
addEventListener("keydown", handleKeyboard);
renderQuestion();
scene.ready.then(() => {
  updateWater(state.water);
  dispatchEvent(new CustomEvent("game:start", { detail: { water: state.water } }));
  document.documentElement.dataset.subjectQuizReady = "true";
});
