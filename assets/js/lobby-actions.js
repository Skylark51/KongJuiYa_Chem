import { TRAINING_MODES, TRAINING_CATEGORIES, getTrainingMode } from "../../data/training-modes.js";
import { GameStorage, describeDailyMission } from "./storage.js";
import { UpgradeSystem } from "./upgrade-system.js";
import { applyDeviceMode, getDeviceMode } from "./device-entry.js";
import { GAME_TITLE, applyJarTheme, createJarPreview, displayJarName } from "./theme-system.js";
import { renderDashboard, dashboardMetrics, formatPlayedAt } from "./dashboard-v4.js";
import { hasPlayHistory, modeMetrics, recommendQuickStart } from "./lobby-logic.js";
import { siteUrl } from "./site-routing.js";
import { difficultyLabel, isSessionDifficulty, openDifficultySelection, writeTrainingSelection } from "./jar-session.js";

const CATEGORY_SELECTION_KEY = "kongjuiya-training-category";
const CATEGORY_ORDER = Object.freeze([
  "원자 구조",
  "화학 결합",
  "화학량론",
  "화학 반응",
  "주기적 성질",
  "산화환원",
  "산염기"
]);
const ORDERED_TRAINING_CATEGORIES = Object.freeze([
  ...CATEGORY_ORDER.filter(category => TRAINING_CATEGORIES.includes(category)),
  ...TRAINING_CATEGORIES.filter(category => !CATEGORY_ORDER.includes(category))
]);
const storage = new GameStorage();
const upgrades = new UpgradeSystem(storage);
const $ = selector => document.querySelector(selector);
const number = value => Math.round(Number(value) || 0).toLocaleString("ko-KR");

function storedCategory() {
  try {
    const category = localStorage.getItem(CATEGORY_SELECTION_KEY);
    return category === "전체" || TRAINING_CATEGORIES.includes(category) ? category : "전체";
  } catch {
    return "전체";
  }
}

function selectCategory(category) {
  activeCategory = category === "전체" || TRAINING_CATEGORIES.includes(category) ? category : "전체";
  try {
    localStorage.setItem(CATEGORY_SELECTION_KEY, activeCategory);
  } catch {
    // Keep the selection for the current page even when persistent storage is unavailable.
  }
}

let activeCategory = storedCategory();
let primaryAction = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function setText(selector, text) {
  const node = $(selector);
  if (node) node.textContent = text;
}

function applyTitle() {
  document.title = GAME_TITLE;
  document.querySelectorAll("[data-game-title]").forEach(node => { node.textContent = GAME_TITLE; });
  for (const selector of ["meta[property='og:title']", "meta[name='twitter:title']"]) {
    const node = $(selector);
    if (node) node.setAttribute("content", GAME_TITLE);
  }
}

function applyMotion() {
  document.documentElement.classList.toggle("reduce-motion", storage.data.settings.animations === false);
}

function routeToTraining(mode, difficulty, resume = false) {
  writeTrainingSelection({ trainingId: mode.id, difficulty, resume });
  location.href = siteUrl("콩쥐야_줘때써.html?training=" + encodeURIComponent(mode.id));
}

function returnToJarSelection() {
  if (globalThis.KongJuiYaLobby?.setLobbyScreen) {
    globalThis.KongJuiYaLobby.setLobbyScreen("jars");
    return;
  }
  location.href = siteUrl("subjects/chemistry/?view=jars");
}

function launchTraining(mode, { resume = false } = {}) {
  if (!mode) return;
  if (resume) {
    const difficulty = storage.data.currentRun?.selectedDifficulty || storage.data.currentRun?.difficulty;
    if (isSessionDifficulty(difficulty)) routeToTraining(mode, difficulty, true);
    else returnToJarSelection();
    return;
  }
  openDifficultySelection({ mode }).then(difficulty => {
    if (!difficulty) {
      returnToJarSelection();
      return;
    }
    routeToTraining(mode, difficulty);
  });
}

function currentRunMode() {
  return getTrainingMode(storage.data.currentRun?.trainingId);
}

function renderMainCta() {
  const button = $("#mainCta");
  const alternative = $("#alternativeCta");
  const hint = $("#ctaHint");
  const resumed = currentRunMode();

  if (resumed) {
    const difficulty = storage.data.currentRun?.selectedDifficulty || storage.data.currentRun?.difficulty;
    button.textContent = "이어서 채우기";
    alternative.textContent = "다른 장독대 선택";
    alternative.href = "#trainingSection";
    hint.textContent = displayJarName(resumed) + " · " + (isSessionDifficulty(difficulty) ? difficultyLabel(difficulty) + " 난이도" : "진행 중") + "에서 이어집니다.";
    primaryAction = () => launchTraining(resumed, { resume: true });
    return;
  }

  const recommendation = recommendQuickStart(storage.data);
  if (hasPlayHistory(storage.data)) {
    button.textContent = recommendation.reason === "약점 복습" ? "약점 장독대 시작" : "빠른 퀴즈 시작";
    alternative.textContent = "장독대 선택";
    alternative.href = "#trainingSection";
    hint.textContent = recommendation.reason + " · " + displayJarName(recommendation.mode) + " · 난이도를 골라 시작하세요.";
    primaryAction = () => launchTraining(recommendation.mode, { resume: recommendation.resume });
    return;
  }

  const first = getTrainingMode("atomic_number") || recommendation.mode;
  button.textContent = "원자 번호부터 시작";
  alternative.textContent = "장독대 선택";
  alternative.href = "#trainingSection";
  hint.textContent = "원자 번호 장독대의 난이도를 골라 시작해 보세요.";
  primaryAction = () => launchTraining(first);
}

function renderQuickQuiz() {
  const recommendation = recommendQuickStart(storage.data);
  setText("#quickQuizLabel", recommendation.reason + " · " + displayJarName(recommendation.mode));
  setText("#quickQuizDetail", recommendation.detail + " · 난이도를 골라 시작하세요.");
}

function renderMission(status = "") {
  const mission = storage.getDailyMission();
  const complete = mission.progress >= mission.target;
  const percentage = Math.round(mission.progress / mission.target * 100);
  setText("#missionDescription", describeDailyMission(mission));
  setText("#missionProgressText", mission.progress + " / " + mission.target);
  setText("#missionReward", "보상 콩 " + number(mission.rewardBeans) + "개");
  const fill = $("#missionProgressFill");
  if (fill) fill.style.width = percentage + "%";
  const progress = $("#missionProgress");
  if (progress) {
    progress.setAttribute("aria-valuemax", String(mission.target));
    progress.setAttribute("aria-valuenow", String(mission.progress));
    progress.setAttribute("aria-valuetext", describeDailyMission(mission) + " " + mission.progress + " / " + mission.target);
  }

  const button = $("#missionClaimButton");
  if (button) {
    if (mission.claimed) {
      button.disabled = true;
      button.textContent = "보상 수령 완료";
    } else if (complete) {
      button.disabled = false;
      button.textContent = "보상 받기";
    } else {
      button.disabled = true;
      button.textContent = "미션 진행 중";
    }
  }
  setText("#missionStatus", status || (mission.claimed ? "오늘의 보상을 받았습니다." : complete ? "미션 완료! 보상을 받을 수 있습니다." : ""));
}

function buildMetric(label, value) {
  const item = element("div");
  const term = element("dt", null, label);
  const definition = element("dd", null, value);
  item.append(term, definition);
  return item;
}

function renderTrainingCards() {
  const grid = $("#trainingGrid");
  if (!grid) return;
  const modes = TRAINING_MODES.filter(mode => activeCategory === "전체" || mode.category === activeCategory);
  grid.replaceChildren(...modes.map(mode => {
    const stats = storage.data.statistics?.[mode.id] || {};
    const metrics = modeMetrics(stats);
    const card = element("article", "training-card jar-theme-card");
    card.dataset.trainingId = mode.id;
    applyJarTheme(card, mode.id);
    card.append(createJarPreview(mode));

    const copy = element("div", "jar-card-copy");
    copy.append(
      element("span", "card-category", mode.category),
      element("h3", null, displayJarName(mode)),
      element("p", null, mode.shortDescription)
    );

    const summary = element("dl", "training-metrics");
    summary.append(
      buildMetric("최고 점수", metrics.plays ? number(metrics.bestScore) : "—"),
      buildMetric("정답률", metrics.accuracy == null ? "—" : metrics.accuracy + "%")
    );
    copy.append(summary);

    const start = element("button", "primary-button", "바로 시작");
    start.type = "button";
    start.addEventListener("click", () => launchTraining(mode));
    copy.append(start);
    card.append(copy);
    return card;
  }));
}

function renderCategoryControls() {
  const categories = ["전체", ...ORDERED_TRAINING_CATEGORIES];
  const filter = $("#categoryFilter");
  const select = $("#categorySelect");
  if (filter) {
    filter.replaceChildren(...categories.map(category => {
      const button = element("button", null, category);
      button.type = "button";
      button.classList.toggle("is-active", category === activeCategory);
      button.setAttribute("aria-pressed", String(category === activeCategory));
      button.addEventListener("click", () => {
        selectCategory(category);
        renderCategoryControls();
        renderTrainingCards();
      });
      return button;
    }));
  }
  if (select) {
    select.replaceChildren(...categories.map(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      return option;
    }));
    select.value = activeCategory;
  }
}

function renderDetailedRecords(metrics) {
  const grid = $("#recordGrid");
  if (!grid) return;
  grid.replaceChildren();

  if (!metrics.entries.length) {
    grid.append(element("p", "record-empty", "아직 상세 기록이 없습니다. 첫 장독대를 채우면 여기에 표시됩니다."));
    return;
  }

  metrics.entries
    .slice()
    .sort((left, right) => (right.metrics.lastPlayedAt || "").localeCompare(left.metrics.lastPlayedAt || ""))
    .forEach(entry => {
      const card = element("article", "record-card");
      applyJarTheme(card, entry.mode.id);
      card.append(element("h3", null, displayJarName(entry.mode)));
      const details = element("dl");
      details.append(
        buildMetric("최고 점수", number(entry.metrics.bestScore)),
        buildMetric("정답률", entry.metrics.accuracy == null ? "—" : entry.metrics.accuracy + "%"),
        buildMetric("최고 콤보", number(entry.metrics.bestCombo)),
        buildMetric("평균 반응", entry.metrics.averageResponseMs ? number(entry.metrics.averageResponseMs) + "ms" : "—"),
        buildMetric("최근 플레이", entry.metrics.lastPlayedAt ? formatPlayedAt(entry.metrics.lastPlayedAt) : "—")
      );
      card.append(details);
      grid.append(card);
    });
}

function renderResearchSummary() {
  const cards = upgrades.cards();
  const levelTotal = cards.reduce((sum, card) => sum + card.level, 0);
  setText("#researchSummaryText", "보유 콩 " + number(storage.data.economy?.beans) + "개 · 강화 레벨 " + levelTotal + " / " + cards.reduce((sum, card) => sum + card.maxLevel, 0));
}

function renderLab(status = "") {
  const grid = $("#upgradeGrid");
  if (!grid) return;
  setText("#labBeans", number(storage.data.economy?.beans));
  grid.replaceChildren(...upgrades.cards().map(card => {
    const upgrade = element("article", "upgrade-card");
    upgrade.dataset.upgradeId = card.id;
    const heading = element("div", "upgrade-heading");
    const title = element("h3", null, card.title);
    const level = element("span", "upgrade-level", "Lv. " + card.level + " / " + card.maxLevel);
    heading.append(title, level);
    upgrade.append(heading, element("p", "upgrade-description", card.description));

    const current = element("p", "upgrade-effect");
    current.append(element("strong", null, "현재 효과"), document.createTextNode(card.effect));
    upgrade.append(current);

    const next = element("p", "upgrade-next");
    next.append(element("strong", null, card.isMax ? "최대 레벨" : "다음 레벨"));
    next.append(document.createTextNode(card.isMax ? " 모든 강화가 완료되었습니다." : " " + card.nextEffect));
    upgrade.append(next);

    const action = element("div", "upgrade-action");
    const button = element("button", "primary-button");
    button.type = "button";
    const beans = Number(storage.data.economy?.beans || 0);
    if (card.isMax) {
      button.disabled = true;
      button.textContent = "최대 레벨";
      upgrade.classList.add("is-max");
    } else if (beans < card.nextCost) {
      button.disabled = true;
      button.textContent = "콩 부족 · " + number(card.nextCost) + "개 필요";
      upgrade.classList.add("is-insufficient");
    } else {
      button.textContent = "콩 " + number(card.nextCost) + "개로 강화";
      button.addEventListener("click", () => {
        button.disabled = true;
        const result = upgrades.purchase(card.id);
        if (result.ok) {
          renderAll();
          renderLab(card.title + "을(를) Lv. " + result.level + "로 강화했습니다. 남은 콩 " + number(result.beans) + "개.");
        } else {
          renderLab(result.reason === "insufficient_beans" ? "콩이 부족합니다." : "강화 저장에 실패했습니다.");
        }
      });
    }
    action.append(button);
    upgrade.append(action);
    return upgrade;
  }));
  setText("#upgradeStatus", status);
}

function openLab() {
  renderLab();
  const dialog = $("#labDialog");
  if (dialog && !dialog.open) dialog.showModal();
}

function renderAll() {
  renderMainCta();
  renderQuickQuiz();
  renderMission();
  renderCategoryControls();
  renderTrainingCards();
  const metrics = renderDashboard(storage);
  renderDetailedRecords(metrics);
  renderResearchSummary();
  renderLab();
}

function bindActions() {
  $("#mainCta")?.addEventListener("click", () => primaryAction?.());
  $("#quickQuizButton")?.addEventListener("click", () => {
    const recommendation = recommendQuickStart(storage.data);
    launchTraining(recommendation.mode, { resume: recommendation.resume });
  });
  $("#labButton")?.addEventListener("click", openLab);
  $("#researchSummaryButton")?.addEventListener("click", openLab);
  $("#missionClaimButton")?.addEventListener("click", () => {
    const result = storage.claimDailyMission();
    if (result.ok) {
      renderAll();
      renderMission("보상 콩 " + number(result.reward) + "개를 받았습니다. 현재 보유 콩 " + number(result.beans) + "개.");
    } else if (result.reason === "already_claimed") {
      renderMission("오늘의 보상은 이미 받았습니다.");
    } else if (result.reason === "incomplete") {
      renderMission("미션을 모두 완료하면 보상을 받을 수 있습니다.");
    } else {
      renderMission("보상 저장에 실패했습니다. 다시 시도해 주세요.");
    }
  });
  $("#categorySelect")?.addEventListener("change", event => {
    selectCategory(event.target.value);
    renderCategoryControls();
    renderTrainingCards();
  });
}

function init() {
  applyTitle();
  applyMotion();
  applyDeviceMode(getDeviceMode() || "auto");
  bindActions();
  renderAll();
}

init();
