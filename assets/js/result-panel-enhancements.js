import { activeSubjectLobbyUrl } from "./site-routing.js";

const RUN_RESPONSE_KEY = "kongjuiya-current-run-response";

let trainingId = null;
let previousBestScore = 0;
let responseTotalMs = 0;
let responseCount = 0;

const finite = value => Number.isFinite(Number(value));

function readSavedResponses(id) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RUN_RESPONSE_KEY) || "null");
    if (!saved || saved.trainingId !== id) return { totalMs: 0, count: 0 };
    return {
      totalMs: Math.max(0, Number(saved.totalMs) || 0),
      count: Math.max(0, Math.floor(Number(saved.count) || 0))
    };
  } catch {
    return { totalMs: 0, count: 0 };
  }
}

function saveResponses() {
  if (!trainingId) return;
  try {
    sessionStorage.setItem(RUN_RESPONSE_KEY, JSON.stringify({
      trainingId,
      totalMs: responseTotalMs,
      count: responseCount
    }));
  } catch {
    // Result metrics are optional if session storage is unavailable.
  }
}

function clearSavedResponses() {
  try {
    sessionStorage.removeItem(RUN_RESPONSE_KEY);
  } catch {
    // Ignore storage failures after a run has ended.
  }
}

function recordResponse(detail = {}) {
  const responseMs = detail.responseMs ?? detail.state?.lastResponseMs;
  if (!finite(responseMs) || Number(responseMs) < 0) return;
  responseTotalMs += Number(responseMs);
  responseCount += 1;
  saveResponses();
}

function averageResponseSeconds() {
  return responseCount > 0 ? responseTotalMs / responseCount / 1000 : 0;
}

function appendAverageMetric(panel) {
  const summary = panel?.querySelector("p:not(.result-record-banner)");
  if (!summary) return;
  const metric = `문제당 평균 ${averageResponseSeconds().toFixed(2)}s`;
  if (/문제당 평균\s+[\d.]+s/.test(summary.textContent || "")) {
    summary.textContent = summary.textContent.replace(/문제당 평균\s+[\d.]+s/, metric);
  } else {
    summary.textContent = `${summary.textContent} · ${metric}`;
  }
  summary.classList.add("result-metrics");
}

function ensureRecordBanner(panel, detail = {}) {
  const score = Math.round(Number(detail.state?.score) || 0);
  const isClear = detail.state?.status === "clear" || panel?.querySelector("h2")?.textContent?.includes("완료");
  const isNewHighScore = isClear && score > previousBestScore;
  let banner = panel?.querySelector(".result-record-banner");

  if (!isNewHighScore) {
    banner?.remove();
    return;
  }

  if (!banner) {
    banner = document.createElement("p");
    banner.className = "result-record-banner";
    banner.textContent = "최고 기록 갱신!";
    const heading = panel.querySelector("h2");
    panel.insertBefore(banner, heading || panel.firstChild);
  }
}

function ensureResultButtons(panel) {
  const restart = panel?.querySelector("#ui-restartGameButton");
  if (restart) {
    restart.textContent = "다시하기";
    restart.classList.add("result-action-button", "result-restart-button");
  }

  let jars = panel?.querySelector(".result-home-button");
  if (!jars) {
    jars = document.createElement("button");
    jars.type = "button";
    jars.className = "result-home-button result-action-button";
    jars.addEventListener("click", () => {
      location.href = activeSubjectLobbyUrl("jars");
    });
  }
  jars.textContent = "다른 장독대 고르기";

  let records = panel?.querySelector(".result-records-button");
  if (!records) {
    records = document.createElement("button");
    records.type = "button";
    records.className = "result-records-button result-action-button";
    records.addEventListener("click", () => {
      location.href = activeSubjectLobbyUrl("records");
    });
  }
  records.textContent = "기록으로 이동";

  const orderedButtons = [
    records,
    restart,
    jars
  ].filter(Boolean);

  panel.append(...orderedButtons);
}

function enhanceResult(detail = {}) {
  const panel = document.getElementById("resultPanel");
  if (!panel || panel.classList.contains("hidden")) return;
  appendAverageMetric(panel);
  ensureRecordBanner(panel, detail);
  ensureResultButtons(panel);
}

window.addEventListener("game:start", event => {
  const detail = event.detail || {};
  trainingId = detail.state?.trainingId || detail.training?.id || null;
  const stats = trainingId
    ? globalThis.KongJuiYaGame?.storage?.getTrainingStats?.(trainingId)
    : null;
  previousBestScore = Math.max(0, Number(stats?.bestScore) || 0);

  if (detail.resumed && trainingId) {
    const saved = readSavedResponses(trainingId);
    responseTotalMs = saved.totalMs;
    responseCount = saved.count;
  } else {
    responseTotalMs = 0;
    responseCount = 0;
    clearSavedResponses();
  }
});

window.addEventListener("answer:correct", event => recordResponse(event.detail));
window.addEventListener("answer:wrong", event => recordResponse(event.detail));
window.addEventListener("answer:timeout", event => recordResponse(event.detail));

window.addEventListener("game:clear", event => {
  const detail = event.detail || {};
  setTimeout(() => {
    enhanceResult(detail);
    clearSavedResponses();
  }, 0);
});

window.addEventListener("game:over", event => {
  const detail = event.detail || {};
  setTimeout(() => {
    enhanceResult(detail);
    clearSavedResponses();
  }, 0);
});
