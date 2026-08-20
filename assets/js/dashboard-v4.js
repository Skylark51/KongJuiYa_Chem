import { TRAINING_MODES } from "../../data/training-modes.js";
import { displayJarName } from "./theme-system.js";
import { modeMetrics, playedModes } from "./lobby-logic.js";
import { buildJarRecordAnalytics } from "./jar-records.js";

const number = value => Math.round(Number(value) || 0).toLocaleString("ko-KR");
const percent = value => value == null ? "—" : Math.round(value) + "%";
const svg = (name, attributes = {}) => {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
};

export function formatPlayedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function dashboardMetrics(data, modes = TRAINING_MODES) {
  const entries = playedModes(data, modes);
  const analytics = buildJarRecordAnalytics({
    records: data.recentRuns,
    modes,
    subject: "chemistry",
    statistics: data.statistics,
    overall: data.overall
  });
  const totalAnswers = entries.reduce((sum, entry) => sum + entry.metrics.attempts, 0);
  const totalCorrect = entries.reduce((sum, entry) => sum + entry.metrics.correct, 0);
  const responseCount = entries.reduce((sum, entry) => sum + entry.metrics.responseCount, 0);
  const responseTotal = entries.reduce((sum, entry) => sum + entry.metrics.averageResponseMs * entry.metrics.responseCount, 0);
  const statPlays = entries.reduce((sum, entry) => sum + entry.metrics.plays, 0);
  const totalPlays = Math.max(Number(data.overall?.totalPlays || 0), statPlays);
  const bestCombo = Math.max(Number(data.overall?.bestCombo || 0), ...entries.map(entry => entry.metrics.bestCombo), 0);
  const mostMissed = entries
    .filter(entry => entry.metrics.misses > 0)
    .sort((left, right) => right.metrics.misses - left.metrics.misses || right.metrics.errorRate - left.metrics.errorRate)[0] || null;
  const latestRun = [...(data.recentRuns || [])]
    .filter(run => run?.endedAt)
    .sort((left, right) => new Date(right.endedAt) - new Date(left.endedAt))[0];
  const latestStat = entries
    .filter(entry => entry.metrics.lastPlayedAt)
    .sort((left, right) => new Date(right.metrics.lastPlayedAt) - new Date(left.metrics.lastPlayedAt))[0];

  return {
    totalPlays: analytics.totals.completedPlays,
    totalAnswers: analytics.totals.totalQuestions,
    correctAnswers: analytics.totals.correctAnswers,
    accuracy: analytics.totals.accuracy,
    bestCombo: analytics.totals.maxCombo,
    beans: Number(data.economy?.beans || 0),
    averageResponseMs: responseCount ? Math.round(responseTotal / responseCount) : null,
    mostMissed,
    latestPlayedAt: analytics.sessions.at(-1)?.playDate || latestRun?.endedAt || latestStat?.metrics.lastPlayedAt || null,
    entries,
    recentRuns: analytics.recentSessions,
    analytics
  };
}

function replaceTrend(region, runs) {
  region.replaceChildren();
  const comparableRuns = runs.filter(run => run.accuracy != null);
  if (!comparableRuns.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty-state";
    empty.textContent = runs.length ? "정답률을 알 수 있는 새 기록부터 성장 흐름을 보여드립니다." : "아직 플레이 기록이 없습니다. 첫 장독대를 채우면 최근 정답률 흐름을 보여드립니다.";
    region.append(empty);
    return;
  }

  if (comparableRuns.length === 1) {
    const run = comparableRuns[0];
    const single = document.createElement("div");
    single.className = "dashboard-single-run";
    const score = document.createElement("strong");
    score.textContent = percent(run.accuracy);
    const detail = document.createElement("span");
    detail.textContent = formatPlayedAt(run.playDate) + " · 첫 기록";
    single.append(score, detail);
    region.append(single);
    return;
  }

  const ordered = [...comparableRuns];
  const scores = ordered.map(run => Number(run.accuracy));
  const minimum = Math.min(...scores);
  const maximum = Math.max(...scores);
  const range = Math.max(1, maximum - minimum);
  const width = 480;
  const height = 170;
  const padding = { top: 20, right: 22, bottom: 28, left: 28 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const pointFor = (score, index) => ({
    x: padding.left + index * (chartWidth / (scores.length - 1)),
    y: padding.top + (maximum - score) / range * chartHeight
  });

  const chart = svg("svg", {
    class: "dashboard-chart",
    role: "img",
    "aria-label": "최근 " + ordered.length + "회 플레이 정답률 추이",
    viewBox: "0 0 " + width + " " + height,
    preserveAspectRatio: "xMidYMid meet"
  });
  const title = svg("title");
  title.textContent = "최근 " + ordered.length + "회 플레이 정답률 추이";
  chart.append(title);

  const guides = svg("g", { class: "dashboard-grid-lines", "aria-hidden": "true" });
  for (let index = 0; index < 3; index++) {
    const y = padding.top + index * (chartHeight / 2);
    guides.append(svg("line", { x1: padding.left, x2: width - padding.right, y1: y, y2: y }));
  }
  chart.append(guides);

  const points = scores.map(pointFor);
  chart.append(svg("polyline", {
    class: "dashboard-trend-line",
    points: points.map(point => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ")
  }));
  const dots = svg("g", { class: "dashboard-trend-dots", "aria-hidden": "true" });
  points.forEach((point, index) => dots.append(svg("circle", {
    cx: point.x.toFixed(1),
    cy: point.y.toFixed(1),
    r: 4,
    "data-score": scores[index]
  })));
  chart.append(dots);

  const labels = svg("g", { class: "dashboard-chart-labels", "aria-hidden": "true" });
  const start = svg("text", { x: padding.left, y: height - 8, "text-anchor": "start" });
  start.textContent = "이전";
  const end = svg("text", { x: width - padding.right, y: height - 8, "text-anchor": "end" });
  end.textContent = "최근";
  labels.append(start, end);
  chart.append(labels);
  region.append(chart);
}

function statusClass(status) {
  if (status === "강점") return "is-strength";
  if (status === "보완 필요") return "is-needs-work";
  return "";
}

function renderModeBars(root, categories) {
  root.replaceChildren();
  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty-state compact jar-record-empty";
    empty.textContent = "플레이한 장독대의 영역별 실력이 여기에 표시됩니다.";
    root.append(empty);
    return;
  }

  categories.forEach(category => {
    const row = document.createElement("article");
    row.className = "jar-category-row";
    const label = document.createElement("div");
    label.className = "jar-category-label";
    const title = document.createElement("strong");
    title.textContent = category.category;
    const detail = document.createElement("span");
    detail.textContent = "풀이 " + number(category.totalQuestions) + "문항 · 정답률 " + percent(category.accuracy);
    label.append(title, detail);

    const progress = document.createElement("div");
    progress.className = "jar-category-progress";
    const recent = document.createElement("span");
    const recentLabel = document.createElement("span");
    recentLabel.textContent = "최근 정답률";
    const recentValue = document.createElement("b");
    recentValue.textContent = percent(category.recentAccuracy);
    recent.append(recentLabel, recentValue);
    const track = document.createElement("div");
    track.className = "jar-category-track";
    track.setAttribute("aria-label", category.category + " 정답률 " + percent(category.accuracy));
    const fill = document.createElement("i");
    fill.style.width = Math.max(0, Math.min(100, category.accuracy ?? 0)) + "%";
    track.append(fill);
    progress.append(recent, track);

    const result = document.createElement("b");
    result.className = "jar-category-status " + statusClass(category.status);
    result.textContent = category.status;
    row.append(label, progress, result);
    root.append(row);
  });
}

export function renderDashboard(storage, root = document) {
  const metrics = dashboardMetrics(storage.data);
  const setText = (selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  };

  setText("#dashboardTotalPlays", number(metrics.totalPlays));
  setText("#dashboardTotalAnswers", number(metrics.totalAnswers));
  setText("#dashboardCorrectAnswers", number(metrics.correctAnswers));
  setText("#dashboardAccuracy", percent(metrics.accuracy));
  setText("#dashboardBestCombo", number(metrics.bestCombo));
  setText("#dashboardGoalText", metrics.analytics.nextGoal);
  const change = metrics.analytics.growth.accuracyChange;
  setText("#dashboardAccuracyChange", change == null ? "첫 기록 후 비교 가능" : (change > 0 ? "+" : "") + change + "%");
  setText("#dashboardPersonalBest", percent(metrics.analytics.growth.personalBest));
  const bestNotice = metrics.analytics.growth.latestIsPersonalBest
    ? "개인 최고 정답률 갱신!"
    : metrics.analytics.growth.latestAccuracy == null ? "기록을 쌓아 보세요" : "다음 장독대에서 갱신 도전";
  setText("#dashboardBestNotice", bestNotice);
  const notice = root.querySelector("#dashboardBestNotice")?.closest("div");
  notice?.classList.toggle("is-personal-best", metrics.analytics.growth.latestIsPersonalBest);

  const trendRegion = root.querySelector("#dashboardTrendRegion");
  if (trendRegion) replaceTrend(trendRegion, metrics.recentRuns);

  const bars = root.querySelector("#dashboardModeBars");
  if (bars) renderModeBars(bars, metrics.analytics.categories);
  return metrics;
}
