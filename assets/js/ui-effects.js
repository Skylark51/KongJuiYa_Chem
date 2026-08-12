import { applyDeviceMode, getDeviceMode, syncViewport } from "./device-entry.js";
import { GAME_TITLE, displayJarName } from "./theme-system.js";
import { mountHistoricalBgm } from "./historical-bgm.js";
import { mountMobileKeypad } from "./mobile-keypad.js";
import { mountGameScene } from "./game-cosmetics-entry.js";
import { chemistryLobbyUrl } from "./site-routing.js";

const SELECTION_KEY = "kongjuiya-training-selection";
const byId = id => document.getElementById(id);
const formatNumber = value => Math.round(Number(value) || 0).toLocaleString("ko-KR");
const DIFFICULTY_NAMES = Object.freeze({ easy: "쉬움", normal: "보통", hard: "어려움" });

function setOfficialTitle() {
  document.title = GAME_TITLE;
  document.querySelectorAll("[data-game-title]").forEach(node => {
    node.textContent = GAME_TITLE;
  });
  for (const selector of ["meta[property='og:title']", "meta[name='twitter:title']"]) {
    const node = document.querySelector(selector);
    if (node) node.content = GAME_TITLE;
  }
}

function readSelection() {
  try {
    return JSON.parse(sessionStorage.getItem(SELECTION_KEY) || "null");
  } catch {
    return null;
  }
}

function applyMotionPreference(storage) {
  document.documentElement.classList.toggle(
    "reduce-motion",
    storage.data.settings?.animations === false
  );
}

function listen(removers, type, handler, target = window) {
  target.addEventListener(type, handler);
  removers.push(() => target.removeEventListener(type, handler));
}

export async function initializeGamePage(api = globalThis.KongJuiYaGame) {
  if (!api) throw new Error("게임 엔진이 준비되지 않았습니다.");
  const storage = api.storage;
  mountHistoricalBgm({ initialVolume: storage.data.settings?.volume ?? 0.5 });
  const selection = readSelection();
  const requestedTrainingId = new URLSearchParams(location.search).get("training");

  if (!requestedTrainingId && !selection?.trainingId) {
    location.replace(chemistryLobbyUrl("jars"));
    return;
  }

  const modeById = id => api.TRAINING_MODES.find(item => item.id === id) || null;
  const mode = modeById(requestedTrainingId) || modeById(selection?.trainingId);
  if (!mode) {
    throw new Error(`알 수 없는 장독대 ID: ${requestedTrainingId || selection?.trainingId || "(없음)"}`);
  }

  const savedDifficulty = storage.data.settings?.difficulty;
  const difficulty = mode.difficultyLevels?.includes(selection?.difficulty)
    ? selection.difficulty
    : mode.difficultyLevels?.includes(savedDifficulty)
      ? savedDifficulty
      : mode.recommendedDifficulty || "normal";

  const resumeState = selection?.resume && storage.data.currentRun?.trainingId === mode.id
    ? storage.data.currentRun
    : null;

  const app = byId("ui-gameApp");
  if (!app) throw new Error("게임 화면 루트가 없습니다.");
  app.dataset.trainingId = mode.id;

  applyMotionPreference(storage);
  syncViewport();
  applyDeviceMode(getDeviceMode() || "auto", { force: true });
  api.selectTraining(mode.id);

  const difficultySelect = byId("ui-difficultySelect");
  if (difficultySelect) {
    difficultySelect.value = difficulty;
    difficultySelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const jarName = displayJarName(mode);
  byId("ui-trainingName").textContent = jarName;
  byId("ui-trainingCategory").textContent = mode.category;
  byId("ui-difficultyLabel").textContent = DIFFICULTY_NAMES[difficulty] || "보통";
  byId("ui-progressTraining").textContent = jarName;
  byId("categoryLabel").textContent = `${mode.category} · ${jarName}`;
  byId("ui-targetScore").textContent = formatNumber(3000);

  const scene = mountGameScene(app, { storage });
  const removers = [];
  const targetQuestionCount = api.questionCount;
  let questionCount = resumeState ? Math.min(targetQuestionCount, Number(resumeState.correctInStage || 0) + 1) : 1;
  let correctCount = resumeState ? Number(resumeState.correctInStage || 0) : 0;
  let wrongCount = 0;
  let bubbleTimer = 0;
  let feverTimer = 0;
  let keypad = null;

  function announce(text) {
    byId("ui-accessibleStatus").textContent = text;
  }

  function updateCounts() {
    byId("ui-questionCount").textContent = Math.min(targetQuestionCount, questionCount);
    byId("ui-correctCount").textContent = correctCount;
    byId("ui-wrongCount").textContent = wrongCount;
  }

  function syncQuestionTargetUi() {
    const progress = document.querySelector(".question-progress-line > span");
    const index = byId("ui-questionCount");
    if (progress && index) {
      progress.replaceChildren(document.createTextNode("문제 "), index, document.createTextNode(` / ${targetQuestionCount}`));
    }
    const completed = byId("correctInStage");
    if (completed?.parentNode) {
      completed.parentNode.replaceChildren(completed, document.createTextNode(`/${targetQuestionCount}`));
    }
    document.documentElement.dataset.defaultQuestionCount = String(targetQuestionCount);
  }

  function showToadBubble(detail = {}) {
    if (!detail.text) return;
    clearTimeout(bubbleTimer);
    const bubble = byId("toadBubble");
    bubble.hidden = false;
    bubble.dataset.style = detail.category || detail.style || "normal";
    byId("toadBubbleText").textContent = detail.text;
    bubbleTimer = setTimeout(() => {
      bubble.hidden = true;
    }, Math.max(1700, Math.min(2800, detail.duration || 2200)));
  }

  function updatePauseButton(paused) {
    const button = byId("ui-pauseButton");
    button.textContent = paused ? "▶" : "Ⅱ";
    button.setAttribute("aria-pressed", String(paused));
    button.setAttribute("aria-label", paused ? "게임 계속하기" : "게임 일시정지");
  }

  function showAdSlot() {
    const dialog = byId("adDialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  function requestHome() {
    if (api.game.state.status === "running") api.game.pause();
    const dialog = byId("exitDialog");
    if (!dialog.open) dialog.showModal();
  }

  function decorateResult(clear) {
    const panel = byId("resultPanel");
    if (!panel) return;

    const heading = panel.querySelector("h2");
    if (heading) {
      heading.id = "resultTitle";
      heading.textContent = clear ? "장독대 채우기 완료" : "물이 모두 샜습니다";
    }

    const restartButton = panel.querySelector("#ui-restartGameButton");
    if (restartButton) restartButton.textContent = "같은 장독대 다시 채우기";

    if (!panel.querySelector(".result-home-button")) {
      const homeButton = document.createElement("button");
      homeButton.type = "button";
      homeButton.className = "result-home-button";
      homeButton.textContent = "장독대 고르기로";
      homeButton.addEventListener("click", () => {
        location.href = chemistryLobbyUrl("jars");
      });
      panel.append(homeButton);
    }
  }

  function startFeverUi(detail = {}) {
    const tier = detail.tier || detail.feverTier || 1;
    byId("feverLabel").textContent = `FEVER ${tier}`;
    byId("feverMultiplier").textContent = `×${detail.scoreMultiplier || detail.multiplier || 2}`;

    clearInterval(feverTimer);
    let remaining = Number(detail.remaining || detail.duration || 8);
    byId("feverTimer").textContent = `피버 ${remaining.toFixed(1)}초`;
    feverTimer = setInterval(() => {
      remaining = Math.max(0, remaining - 0.1);
      byId("feverTimer").textContent = `피버 ${remaining.toFixed(1)}초`;
      if (!remaining) clearInterval(feverTimer);
    }, 100);
  }

  function endFeverUi() {
    clearInterval(feverTimer);
    byId("feverLabel").textContent = "FEVER 준비";
    byId("feverMultiplier").textContent = "×1";
    byId("feverTimer").textContent = "연속 정답으로 피버를 충전하세요.";
  }

  byId("ui-pauseButton").addEventListener("click", () => {
    if (!app.classList.contains("is-opening-countdown")) api.game.togglePause();
  });
  byId("ui-homeButton").addEventListener("click", requestHome);
  byId("continueButton").addEventListener("click", () => {
    if (api.game.state.status === "paused") api.game.resume();
  });
  byId("confirmHomeButton").addEventListener("click", () => {
    location.href = chemistryLobbyUrl("jars");
  });
  byId("exitDialog").addEventListener("close", () => {
    if (byId("exitDialog").returnValue !== "home" && api.game.state.status === "paused") {
      api.game.resume();
    }
  });

  listen(removers, "keydown", event => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (app.classList.contains("is-opening-countdown")) return;
    if (api.game.state.status === "running") api.game.pause();
    else if (api.game.state.status === "paused") api.game.resume();
  }, document);

  listen(removers, "question:changed", event => {
    const promptLength = String(event.detail?.question?.prompt || "").length;
    app.dataset.questionLength = promptLength > 74 ? "long" : promptLength > 32 ? "medium" : "short";
  });
  listen(removers, "toad:speak", event => showToadBubble(event.detail));
  listen(removers, "answer:correct", event => {
    correctCount += 1;
    questionCount += 1;
    updateCounts();
    byId("splash").textContent = `물 +${Math.round(event.detail?.waterGain || 0)} · +${Math.round(event.detail?.scoreGain || 0)}점`;
    announce("정답입니다. 장독대에 물을 부었습니다.");
  });
  listen(removers, "answer:wrong", () => {
    wrongCount += 1;
    questionCount += 1;
    updateCounts();
    announce("오답입니다. 두꺼비가 밀렸습니다.");
  });
  listen(removers, "answer:timeout", () => {
    wrongCount += 1;
    questionCount += 1;
    updateCounts();
    announce("시간이 초과되어 물이 샙니다.");
  });
  listen(removers, "water:warning", () => announce("물이 절반 이하로 줄었습니다."));
  listen(removers, "water:critical", () => announce("물이 매우 부족합니다."));
  listen(removers, "game:pause", () => updatePauseButton(true));
  listen(removers, "game:resume", () => updatePauseButton(false));
  listen(removers, "game:over", () => {
    decorateResult(false);
    announce("게임 오버");
    keypad?.setLocked(true);
    showAdSlot();
  });
  listen(removers, "game:clear", () => {
    decorateResult(true);
    byId("feedback").textContent = "장독대 채우기 완료!";
    announce("장독대 채우기 완료");
    keypad?.setLocked(true);
    showAdSlot();
  });
  listen(removers, "fever:charge", event => {
    const detail = event.detail || {};
    const value = Math.min(100, (detail.charge || 0) / Math.max(1, detail.required || 3) * 100);
    byId("feverFill").style.width = `${value}%`;
    byId("feverGauge").setAttribute("aria-valuenow", String(Math.round(value)));
  });
  listen(removers, "fever:start", event => startFeverUi(event.detail));
  listen(removers, "fever:extend", event => startFeverUi(event.detail));
  listen(removers, "fever:end", endFeverUi);
  listen(removers, "ui:device-mode", () => syncViewport());

  api.start({ difficulty, resumeState });
  keypad = mountMobileKeypad({
    api,
    form: byId("ui-answerForm"),
    input: byId("answerInput"),
    dock: byId("ui-mobileInputDock")
  });

  updateCounts();
  syncQuestionTargetUi();
  updatePauseButton(false);

  addEventListener("beforeunload", () => {
    clearTimeout(bubbleTimer);
    clearInterval(feverTimer);
    keypad?.destroy();
    scene.destroy();
    removers.splice(0).forEach(remove => remove());
  }, { once: true });
}

setOfficialTitle();
