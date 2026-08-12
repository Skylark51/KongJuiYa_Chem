import { GAME_CONFIG } from "../../data/game-config.js";
import { BEAN_REWARDS } from "../../data/upgrades.js";
import { getSubjectGameContent, subjectIdFromLocation } from "../../data/subject-game-content.js";
import { QuestionEngine } from "./question-engine.js";
import { GameCore } from "./game-core.js";
import { GameStorage } from "./storage.js";
import { SubjectGameStorage } from "./subject-game-storage.js";
import { UpgradeSystem } from "./upgrade-system.js";
import { ActionSystem } from "./action-system.js";
import { UIAdapter } from "./ui-adapter.js";
import { installMetalReactivityChoiceLabels } from "./metal-reactivity-choice-ui.js";
import { QuizCadenceController } from "./quiz-cadence.js";

export const DEFAULT_QUESTION_COUNT = 10;
export const MIN_QUESTION_COUNT = 5;
export const MAX_QUESTION_COUNT = 100;

export function clampQuestionCount(value) {
  const count = Math.round(Number(value));
  return Number.isFinite(count)
    ? Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, count))
    : DEFAULT_QUESTION_COUNT;
}

function readSelection() {
  try { return JSON.parse(sessionStorage.getItem("kongjuiya-training-selection") || "null"); }
  catch { return null; }
}

export function bootstrapGameRuntime({ subjectId = subjectIdFromLocation() } = {}) {
if (globalThis.KongJuiYaGame) return globalThis.KongJuiYaGame;

const content = getSubjectGameContent(subjectId);
document.documentElement.dataset.subject = content.subjectId;
const { trainingModes: TRAINING_MODES, questions: QUESTIONS, getTrainingMode } = content;
const validationErrors = content.validateQuestions();
if (validationErrors.length) {
  throw new Error(`문항 데이터 오류: ${validationErrors.join(", ")}`);
}

const globalStorage = new GameStorage();
const storage = content.subjectId === "chemistry"
  ? globalStorage
  : new SubjectGameStorage(content.subjectId, globalStorage, getTrainingMode);
const selection = readSelection();
const savedQuestionCount = selection?.resume
  ? Number(storage.data.currentRun?.correctAnswersPerStage || 0)
  : 0;
const questionCount = clampQuestionCount(savedQuestionCount || storage.data.settings?.questionCount);
const upgrades = new UpgradeSystem(storage);
const questionEngine = new QuestionEngine(QUESTIONS);
const actions = new ActionSystem({ upgrades, storage });
const cadence = new QuizCadenceController();
const game = new GameCore({
  questionEngine,
  config: Object.freeze({ ...GAME_CONFIG, correctAnswersToClear: questionCount }),
  upgradeSystem: upgrades,
  actionSystem: actions,
  trainingProvider: getTrainingMode,
  cadenceController: cadence
});
const ui = new UIAdapter();
installMetalReactivityChoiceLabels();

const requestedTrainingId = new URLSearchParams(location.search).get("training");
let selectedTrainingId = getTrainingMode(requestedTrainingId)?.id || null;
let selectedDifficulty = storage.data.settings.difficulty || "normal";
let questionStartedAt = performance.now();
let lastFrameTime = performance.now();
let frameRequestId = 0;

function saveCurrentRun() {
  if (["running", "paused"].includes(game.state.status)) {
    storage.saveCurrentRun(game.snapshot());
  }
}

function selectTraining(trainingId) {
  selectedTrainingId = getTrainingMode(trainingId)?.id || null;
  const url = new URL(location.href);
  if (selectedTrainingId) url.searchParams.set("training", selectedTrainingId);
  else url.searchParams.delete("training");
  history.replaceState({}, "", url);
}

function scheduleFrame() {
  if (frameRequestId || game.state.status !== "running" || document.hidden) return;
  lastFrameTime = performance.now();
  frameRequestId = requestAnimationFrame(renderFrame);
}

function renderFrame(now) {
  frameRequestId = 0;
  if (game.state.status !== "running" || document.hidden) return;

  game.tick((now - lastFrameTime) / 1000);
  lastFrameTime = now;
  ui.render();
  scheduleFrame();
}

function start(options = {}) {
  if (!selectedTrainingId) {
    ui.feedback("먼저 장독대를 선택해 주세요.", "wrong");
    return;
  }

  storage.startRun(selectedTrainingId, selectedDifficulty);
  game.start({
    trainingId: selectedTrainingId,
    difficulty: selectedDifficulty,
    ...options
  });
  questionStartedAt = performance.now();
  saveCurrentRun();
  ui.clearAnswer();
  ui.render();
  scheduleFrame();
}

function submit(value) {
  const result = game.submit(value ?? ui.answer());
  if (result.accepted) {
    questionStartedAt = performance.now();
    saveCurrentRun();
    ui.clearAnswer();
    ui.render();
    return;
  }

  if (result.reason === "empty") {
    ui.feedback("정답을 입력해 주세요.", "wrong");
  }
}

ui.bind(game, { start, submit, restart: start });
ui.installTrainingSelector(
  TRAINING_MODES.map(mode => ({
    ...mode,
    bestScore: storage.getTrainingStats(mode.id).bestScore
  })),
  selectedTrainingId,
  selectTraining
);
ui.installDifficulty(selectedDifficulty, value => {
  selectedDifficulty = value;
  storage.updateSettings({ difficulty: value });
});

game.on("answer:timeout", detail => {
  storage.recordAnswer(
    detail.question,
    false,
    true,
    detail.responseMs,
    game.state.difficulty
  );
  questionStartedAt = performance.now();
  saveCurrentRun();
});
game.on("answer:correct", detail => {
  storage.recordAnswer(
    detail.question,
    true,
    false,
    detail.responseMs,
    game.state.difficulty
  );
  storage.recordWaterPour(detail.state.trainingId);
  saveCurrentRun();
});
game.on("answer:wrong", detail => {
  storage.recordAnswer(
    detail.question,
    false,
    false,
    detail.responseMs,
    game.state.difficulty
  );
  saveCurrentRun();
});
game.on("game:pause", () => {
  if (frameRequestId) cancelAnimationFrame(frameRequestId);
  frameRequestId = 0;
  saveCurrentRun();
});
game.on("game:resume", () => {
  ui.render();
  scheduleFrame();
});
game.on("fever:start", detail => {
  storage.recordFeverTier(detail.feverTier, detail.state.trainingId);
});
game.on("game:over", detail => {
  if (frameRequestId) cancelAnimationFrame(frameRequestId);
  frameRequestId = 0;
  storage.finishRun(detail.state);
});
game.on("game:clear", detail => {
  if (frameRequestId) cancelAnimationFrame(frameRequestId);
  frameRequestId = 0;

  const previousBest = storage.getTrainingStats(detail.state.trainingId).bestScore;
  if (detail.state.score > previousBest) {
    const bonus = actions.earn(
      BEAN_REWARDS.newHighScore,
      "new_high_score",
      detail.state.trainingId
    );
    detail.state.beansEarned = (detail.state.beansEarned || 0) + bonus;
  }
  storage.finishRun(detail.state);
});

document.addEventListener("visibilitychange", () => {
  lastFrameTime = performance.now();
  if (document.hidden && game.state.status === "running") game.pause();
  else scheduleFrame();
});
document.addEventListener("keydown", event => {
  if (!event.ctrlKey && !event.altKey && !event.metaKey && ui.chooseShortcut(event.key)) {
    event.preventDefault();
    return;
  }
  if (
    event.code === "Space" &&
    !document.getElementById("ui-gameApp")?.classList.contains("is-opening-countdown") &&
    !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target?.tagName)
  ) {
    event.preventDefault();
    game.togglePause();
    ui.render();
  }
});

window.addEventListener("upgrade:purchased", () => game.speak("upgradePurchased"));
window.addEventListener("ui:device-mode", event => {
  storage.updateSettings({ deviceMode: event.detail?.mode || "auto" });
});
window.addEventListener("beforeunload", () => {
  if (frameRequestId) cancelAnimationFrame(frameRequestId);
  frameRequestId = 0;
  saveCurrentRun();
  cadence.destroy();
});

window.dispatchEvent(new CustomEvent("upgrades:loaded", {
  detail: { upgrades: upgrades.levels() }
}));

const api = Object.freeze({
  subjectId: content.subjectId,
  game,
  questionEngine,
  storage,
  globalStorage,
  upgrades,
  actions,
  cadence,
  questionCount,
  TRAINING_MODES,
  start,
  submit,
  selectTraining,
  purchaseUpgrade: id => upgrades.purchase(id),
  getUpgradeCards: shop => upgrades.cards(shop)
});
globalThis.KongJuiYaGame = api;
document.documentElement.dataset.gameRuntime = "ready";
return api;
}
