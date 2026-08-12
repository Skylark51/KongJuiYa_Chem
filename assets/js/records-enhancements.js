import { TRAINING_MODES } from "../../data/training-modes.js";
import { GameStorage } from "./storage.js";
import { displayJarName } from "./theme-system.js";
import { modeMetrics } from "./lobby-logic.js";
import { siteUrl } from "./site-routing.js";

const DEFAULT_QUESTION_COUNT = 10;
const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 100;
const storage = new GameStorage();

const clampQuestionCount = value => {
  const number = Math.round(Number(value));
  return Number.isFinite(number)
    ? Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, number))
    : DEFAULT_QUESTION_COUNT;
};

const totalAnswers = () => Object.values(storage.data.statistics || {}).reduce((sum, stats) => {
  const metrics = modeMetrics(stats);
  return sum + metrics.attempts;
}, 0);

function ensureStylesheet() {
  const href = "assets/css/records-enhancements.css?v=20260807-records-analytics1";
  if (document.querySelector('link[data-site-stylesheet="assets/css/records-enhancements.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.siteStylesheet = "assets/css/records-enhancements.css";
  link.href = siteUrl(href);
  document.head.append(link);
}

function refreshSummary() {
  storage.data = storage.load();
  const beanValue = document.getElementById("dashboardBeans");
  const card = beanValue?.closest(".dashboard-stat");
  if (card) {
    const label = card.querySelector("span");
    const note = card.querySelector("small");
    if (label) label.textContent = "총 풀이 문제";
    beanValue.id = "dashboardTotalAnswers";
    beanValue.textContent = totalAnswers().toLocaleString("ko-KR");
    if (note) note.textContent = "누적 답안";
  } else {
    const total = document.getElementById("dashboardTotalAnswers");
    if (total) total.textContent = totalAnswers().toLocaleString("ko-KR");
  }

  const combo = document.getElementById("dashboardBestCombo")?.closest(".dashboard-stat");
  const comboNote = combo?.querySelector("small");
  if (comboNote) {
    const count = clampQuestionCount(storage.data.settings?.questionCount);
    comboNote.textContent = `연속 정답 · 기본 ${count}문항`;
  }
}

function installQuestionCountSetting() {
  const dialog = document.getElementById("settingsDialog");
  const form = dialog?.querySelector("form");
  if (!dialog || !form || document.getElementById("questionCountSetting")) return;

  const label = document.createElement("label");
  label.className = "question-count-setting";
  label.innerHTML = `
    <span>기본 문항 수</span>
    <input id="questionCountSetting" type="number" inputmode="numeric" min="${MIN_QUESTION_COUNT}" max="${MAX_QUESTION_COUNT}" step="1" aria-describedby="questionCountHint">
    <small id="questionCountHint">장독대 시작 시 기본 목표 문항 수 · ${MIN_QUESTION_COUNT}~${MAX_QUESTION_COUNT}</small>
  `;
  const motion = form.querySelector(".toggle-row");
  form.insertBefore(label, motion || form.querySelector(".dialog-actions"));

  const input = label.querySelector("#questionCountSetting");
  const sync = () => {
    storage.data = storage.load();
    input.value = String(clampQuestionCount(storage.data.settings?.questionCount));
  };
  sync();

  for (const id of ["settingsButton", "bottomSettingsButton"]) {
    document.getElementById(id)?.addEventListener("click", () => queueMicrotask(sync));
  }

  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "save") return;
    storage.data = storage.load();
    storage.updateSettings({ questionCount: clampQuestionCount(input.value) });
    refreshSummary();
  });
}

const modeByTitle = new Map(TRAINING_MODES.map(mode => [displayJarName(mode), mode]));

function enhanceRecordCard(card) {
  if (!card || card.dataset.recordEnhanced === "true") return;
  const title = card.querySelector("h3")?.textContent?.trim();
  const mode = modeByTitle.get(title);
  if (!mode) return;

  storage.data = storage.load();
  const metrics = modeMetrics(storage.data.statistics?.[mode.id] || {});
  const details = card.querySelector("dl");
  if (details) {
    const total = document.createElement("div");
    total.innerHTML = `<dt>총 풀이 문제</dt><dd>${metrics.attempts.toLocaleString("ko-KR")}문제</dd>`;
    const best = document.createElement("div");
    const bestResponse = Number(storage.data.statistics?.[mode.id]?.bestResponseMs || 0);
    best.innerHTML = `<dt>최고 반응</dt><dd>${bestResponse > 0 ? Math.round(bestResponse).toLocaleString("ko-KR") + "ms" : "—"}</dd>`;
    details.append(total, best);
  }

  const cue = document.createElement("span");
  cue.className = "record-detail-cue";
  cue.textContent = "상세 기록 보기 →";
  card.append(cue);
  card.dataset.recordEnhanced = "true";
  card.dataset.trainingId = mode.id;
  card.classList.add("record-card-link");
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `${title} 상세 기록 보기`);

  const open = () => {
    location.href = siteUrl(`record-detail.html?training=${encodeURIComponent(mode.id)}`);
  };
  card.addEventListener("click", open);
  card.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    open();
  });
}

function enhanceRecordGrid() {
  document.querySelectorAll("#recordGrid .record-card").forEach(enhanceRecordCard);
}

function installRecordObserver() {
  const grid = document.getElementById("recordGrid");
  if (!grid) return;
  enhanceRecordGrid();
  const observer = new MutationObserver(() => {
    refreshSummary();
    enhanceRecordGrid();
  });
  observer.observe(grid, { childList: true, subtree: true });
}

ensureStylesheet();
installQuestionCountSetting();
refreshSummary();
installRecordObserver();
window.addEventListener("storage", event => {
  if (!event.key || event.key.includes("kongjuiya")) {
    refreshSummary();
    enhanceRecordGrid();
  }
});

document.documentElement.dataset.recordsEnhancements = "ready";
