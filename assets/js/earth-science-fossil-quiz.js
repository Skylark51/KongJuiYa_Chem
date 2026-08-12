import {
  EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS,
  EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS,
  FOSSIL_ERA_CHOICES,
  FOSSIL_TYPE_CHOICES
} from "../../data/questions/earth-science-fossil-type.js";
import { mountGameScene } from "./game-cosmetics-entry.js";
import { SubjectStorage } from "./subject-storage.js";
import { siteUrl } from "./site-routing.js";
import { ToadDialogueSelector } from "../../data/dialogues/toad-dialogues.js";

const CORRECT_AUTO_ADVANCE_MS = 1200;

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
const state = { index: 0, correct: 0, wrong: 0, combo: 0, bestCombo: 0, water: 55, answered: false };
const scene = mountGameScene(byId("ui-gameApp"));
const toadDialogues = new ToadDialogueSelector();
let autoAdvanceTimer = 0;
let toadBubbleTimer = 0;

function imageUrl(path) {
  return siteUrl(path);
}

function updateWater(next) {
  state.water = Math.max(0, Math.min(100, Number(next) || 0));
  byId("waterGauge").style.width = state.water + "%";
  byId("waterText").textContent = Math.round(state.water) + "%";
  scene.renderer.setWaterLevel(state.water);
}

function clearAutoAdvance() {
  clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = 0;
}

function speak(category) {
  dispatchEvent(new CustomEvent("toad:speak", { detail: toadDialogues.pick(category) }));
}

function showToadBubble(detail = {}) {
  if (!detail.text) return;
  clearTimeout(toadBubbleTimer);
  const bubble = byId("toadBubble");
  bubble.hidden = false;
  bubble.dataset.style = detail.category || "normalCorrect";
  byId("toadBubbleText").textContent = detail.text;
  toadBubbleTimer = setTimeout(() => {
    bubble.hidden = true;
  }, Math.max(1700, Math.min(2800, detail.duration || 2200)));
}

function renderQuestion() {
  clearAutoAdvance();
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
  byId("answerChoices").replaceChildren(...quiz.choices.map((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.shortcut = String(index + 1);
    const key = document.createElement("kbd");
    key.textContent = String(index + 1);
    const label = document.createElement("span");
    label.textContent = choice;
    button.append(key, label);
    button.dataset.choice = choice;
    button.setAttribute("aria-keyshortcuts", String(index + 1));
    button.addEventListener("click", () => answer(choice));
    return button;
  }));
  dispatchEvent(new CustomEvent("question:changed", { detail: { water: state.water, questionId: question.id } }));
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
  const nextButton = byId("nextButton");
  nextButton.hidden = correct;
  nextButton.textContent = state.index === quiz.questions.length - 1 ? "결과 보기" : "다음 문제";
  byId("progressBar").style.width = (state.index + 1) / quiz.questions.length * 100 + "%";
  dispatchEvent(new CustomEvent(correct ? "answer:correct" : "answer:wrong", {
    detail: { combo: state.combo, water: state.water, questionId: question.id }
  }));
  speak(correct ? (state.combo >= 3 ? "combo" : "normalCorrect") : "wrong");
  if (correct) autoAdvanceTimer = setTimeout(next, CORRECT_AUTO_ADVANCE_MS);
}

function finish() {
  clearAutoAdvance();
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
  dispatchEvent(new CustomEvent("game:clear", { detail: { combo: state.bestCombo, water: state.water } }));
  speak("gameClear");
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
  clearAutoAdvance();
  clearTimeout(toadBubbleTimer);
  byId("toadBubble").hidden = true;
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
  const index = Number(event.key) - 1;
  const choice = quiz.choices[index];
  if (!choice) return;
  event.preventDefault();
  answer(choice);
}

byId("nextButton").addEventListener("click", next);
byId("retryButton").addEventListener("click", restart);
addEventListener("keydown", handleKeyboard);
addEventListener("toad:speak", event => showToadBubble(event.detail));
renderQuestion();
scene.ready.then(() => {
  updateWater(state.water);
  dispatchEvent(new CustomEvent("game:start", { detail: { water: state.water } }));
  document.documentElement.dataset.subjectQuizReady = "true";
});
