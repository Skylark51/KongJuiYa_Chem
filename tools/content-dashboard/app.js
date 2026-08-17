import { questionsToCsv } from "./content-analyzer.js";
import {
  filterQuestions,
  paginateQuestions,
  questionDetailModel,
  sortQuestions
} from "./dashboard-model.js";

const $ = selector => document.querySelector(selector);
const number = value => Number(value || 0).toLocaleString("ko-KR");

const state = {
  report: null,
  categorySubject: "chemistry",
  categorySort: "count-desc",
  filters: {
    search: "",
    subject: "",
    category: "",
    difficulty: "",
    type: "",
    asset: "",
    animation: "",
    explanation: "",
    status: ""
  },
  sort: { key: "id", direction: "asc" },
  page: 1,
  pageSize: 50
};

function node(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== "") element.textContent = text;
  return element;
}

function clear(element) {
  element.replaceChildren();
  return element;
}

function badge(kind, text) {
  return node("span", `status-badge ${kind}`, text);
}

function setOptions(select, options, allLabel = "전체") {
  const current = select.value;
  clear(select).append(new Option(allLabel, ""));
  for (const option of options) {
    select.append(new Option(option.label, option.value));
  }
  if ([...select.options].some(option => option.value === current)) select.value = current;
}

function barTrack(value, maximum) {
  const track = node("div", "bar-track");
  const fill = node("div", "bar-fill");
  fill.style.width = `${maximum ? Math.max(1, value / maximum * 100) : 0}%`;
  track.append(fill);
  return track;
}

function renderKpis() {
  const { report } = state;
  const cards = [
    { label: "전체 문제", value: report.summary.totalQuestions },
    ...report.subjects.map(subject => ({ label: subject.label, value: subject.questionCount })),
    { label: "오류", value: report.summary.errorCount, kind: "error" },
    { label: "경고", value: report.summary.warningCount, kind: "warning" }
  ];
  const grid = clear($("#kpiGrid"));
  for (const card of cards) {
    const item = node("article", `kpi-card ${card.kind || ""}`);
    item.append(node("span", "label", card.label), node("strong", "", number(card.value)));
    grid.append(item);
  }
}

function renderSubjects() {
  const rows = clear($("#subjectRows"));
  const maximum = Math.max(1, ...state.report.subjects.map(subject => subject.questionCount));
  for (const subject of state.report.subjects) {
    const row = document.createElement("tr");
    const nameCell = node("td", "subject-name", subject.label);
    const countCell = node("td");
    const barLine = node("div");
    barLine.style.display = "flex";
    barLine.style.alignItems = "center";
    barLine.append(barTrack(subject.questionCount, maximum), node("span", "bar-value", number(subject.questionCount)));
    countCell.append(barLine);
    row.append(
      nameCell,
      countCell,
      node("td", "", number(subject.categoryCount)),
      node("td", "", number(subject.averagePerCategory)),
      node("td", "", number(subject.imageQuestionCount)),
      node("td", "", number(subject.animationQuestionCount)),
      node("td", "", number(subject.explanationCount)),
      node("td", "", number(subject.missingExplanationCount))
    );
    rows.append(row);
  }
}

function sortCategories(categories) {
  const [key, direction] = state.categorySort.split("-");
  const sign = direction === "asc" ? 1 : -1;
  return [...categories].sort((left, right) => {
    if (key === "name") return left.name.localeCompare(right.name, "ko") * sign;
    const field = key === "count" ? "questionCount" : key === "error" ? "errorCount" : "warningCount";
    return (left[field] - right[field]) * sign || left.name.localeCompare(right.name, "ko");
  });
}

function renderCategories() {
  const categories = sortCategories(
    state.report.categories.filter(category => category.subjectId === state.categorySubject)
  );
  const list = clear($("#categoryList"));
  if (!categories.length) {
    list.append(node("p", "hint", "등록된 category가 없습니다."));
    return;
  }
  for (const category of categories) {
    const item = node("article", `metric-item ${category.isLowCount ? "low" : ""}`);
    const head = node("div", "metric-head");
    head.append(node("strong", "", category.name), node("span", "", `${number(category.questionCount)}문제`));
    const meta = node("div", "metric-meta");
    meta.append(
      node("span", "", `Asset ${number(category.assetQuestionCount)}`),
      node("span", "", `해설 누락 ${number(category.missingExplanationCount)}`),
      node("span", "", `오류 ${number(category.errorCount)}`),
      node("span", "", `경고 ${number(category.warningCount)}`)
    );
    if (category.isLowCount) meta.append(badge("warning", "저밀도 category"));
    item.append(head, meta);
    list.append(item);
  }
}

function distributionGroup(title, distribution) {
  const group = node("section", "distribution-group");
  group.append(node("h3", "", title));
  const maximum = Math.max(1, ...distribution.map(item => item.count));
  if (!distribution.length) {
    group.append(node("p", "hint", "등록된 문제가 없습니다."));
    return group;
  }
  for (const item of distribution) {
    const row = node("div", "distribution-row");
    row.append(
      node("span", "", item.label),
      barTrack(item.count, maximum),
      node("strong", "", number(item.count))
    );
    group.append(row);
  }
  return group;
}

function renderDifficulty() {
  const groups = clear($("#difficultyGroups"));
  groups.append(distributionGroup("전체", state.report.difficulties.overall));
  for (const subject of state.report.subjects) {
    groups.append(distributionGroup(subject.label, state.report.difficulties.bySubject[subject.id] || []));
  }
}

function renderTypes() {
  const list = clear($("#typeList"));
  const maximum = Math.max(1, ...state.report.types.overall.map(item => item.count));
  for (const type of state.report.types.overall) {
    const item = node("article", "metric-item");
    const head = node("div", "metric-head");
    head.append(node("strong", "", type.label), node("span", "", number(type.count)));
    item.append(head, barTrack(type.count, maximum));
    list.append(item);
  }
}

function renderAssets() {
  const asset = state.report.assets;
  const stats = [
    ["전체 visual asset", asset.totalFiles],
    ["문제 참조 asset", asset.referencedCount],
    ["사용 이미지", asset.usedImageCount],
    ["사용 animation", asset.usedAnimationCount],
    ["깨진 참조", asset.missingReferenceCount],
    ["미사용 후보", asset.unusedCandidateCount]
  ];
  const grid = clear($("#assetStats"));
  for (const [label, value] of stats) {
    const item = node("article", "asset-stat");
    item.append(node("span", "", label), node("strong", "", number(value)));
    grid.append(item);
  }
}

function renderIssues() {
  const issues = state.report.issues;
  const errors = issues.filter(issue => issue.severity === "error").length;
  const warnings = issues.filter(issue => issue.severity === "warning").length;
  clear($("#issueSummary")).append(
    badge("error", `ERROR ${number(errors)}`),
    badge("warning", `WARNING ${number(warnings)}`)
  );
  const rows = clear($("#issueRows"));
  const shown = issues.slice(0, 200);
  for (const issue of shown) {
    const row = document.createElement("tr");
    row.append(
      node("td", `severity-text ${issue.severity}`, issue.severity.toUpperCase()),
      node("td", "", issue.code),
      node("td", "", state.report.subjects.find(subject => subject.id === issue.subjectId)?.label || "전체"),
      node("td", "", issue.questionId || issue.category || "—"),
      node("td", "", issue.message)
    );
    rows.append(row);
  }
  $("#issueLimitNote").textContent = issues.length > shown.length
    ? `성능을 위해 상위 ${shown.length}건만 표시합니다. 전체 내역은 JSON export에서 확인하세요.`
    : `전체 ${number(issues.length)}건을 표시합니다.`;
}

function currentQuestions() {
  return sortQuestions(
    filterQuestions(state.report.questions, state.filters),
    state.sort
  );
}

function statusCell(question) {
  const cell = node("td");
  if (question.errorCount) cell.append(badge("error", `오류 ${question.errorCount}`));
  if (question.warningCount) cell.append(badge("warning", `경고 ${question.warningCount}`));
  if (!question.errorCount && !question.warningCount) cell.append(badge("ok", "정상"));
  return cell;
}

function renderQuestionRows() {
  const filtered = currentQuestions();
  const page = paginateQuestions(filtered, state.page, state.pageSize);
  state.page = page.page;
  const rows = clear($("#questionRows"));
  for (const question of page.items) {
    const row = document.createElement("tr");
    row.tabIndex = 0;
    row.dataset.uid = question.uid;
    row.dataset.testid = "question-row";
    const promptCell = node("td");
    const prompt = node("span", "ellipsis", question.prompt || "(본문 없음)");
    prompt.title = question.prompt;
    promptCell.append(prompt);
    row.append(
      node("td", "", question.id || "(ID 없음)"),
      node("td", "", question.subjectLabel),
      node("td", "", question.category || "(미분류)"),
      node("td", "", question.difficultyLabel),
      promptCell,
      node("td", "", question.typeLabel),
      node("td", "", question.assetPaths.length ? `${question.assetPaths.length}개` : "없음"),
      node("td", "", question.explanation ? "있음" : "없음"),
      statusCell(question)
    );
    const open = () => openQuestionDetail(question.uid);
    row.addEventListener("click", open);
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    rows.append(row);
  }
  if (!page.items.length) {
    const row = document.createElement("tr");
    const cell = node("td", "hint", "조건에 맞는 문제가 없습니다.");
    cell.colSpan = 9;
    row.append(cell);
    rows.append(row);
  }
  $("#questionCount").textContent = `전체 ${number(page.totalItems)}개 중 ${number(page.items.length)}개 표시`;
  $("#pageInfo").textContent = `${number(page.page)} / ${number(page.totalPages)}`;
  $("#prevPage").disabled = page.page <= 1;
  $("#nextPage").disabled = page.page >= page.totalPages;
  for (const button of document.querySelectorAll("[data-sort]")) {
    button.removeAttribute("data-direction");
    if (button.dataset.sort === state.sort.key) button.dataset.direction = state.sort.direction;
  }
}

function openQuestionDetail(uid) {
  const detail = questionDetailModel(state.report, uid);
  if (!detail) return;
  $("#detailSubject").textContent = detail.subjectLabel;
  $("#detailTitle").textContent = detail.prompt.slice(0, 80) || "본문 없는 문제";
  $("#detailId").textContent = detail.id || "(없음)";
  $("#detailCategory").textContent = detail.category || "(미분류)";
  $("#detailDifficulty").textContent = detail.difficultyLabel;
  $("#detailType").textContent = `${detail.typeLabel} · ${detail.type}`;
  $("#detailAnimation").textContent = detail.hasAnimation ? "있음" : "없음";
  $("#detailPrompt").textContent = detail.prompt || "(없음)";
  $("#detailAnswer").textContent = detail.answer || "(없음)";
  $("#detailExplanation").textContent = detail.explanation || "(해설 없음)";
  $("#detailAssets").textContent = detail.assetPaths.join("\n") || "(asset 없음)";

  const statuses = clear($("#detailStatus"));
  if (detail.errorCount) statuses.append(badge("error", `오류 ${detail.errorCount}`));
  if (detail.warningCount) statuses.append(badge("warning", `경고 ${detail.warningCount}`));
  if (!detail.errorCount && !detail.warningCount) statuses.append(badge("ok", "정상"));

  const choices = clear($("#detailChoices"));
  if (detail.choices.length) {
    for (const choice of detail.choices) choices.append(node("li", "", `${choice.key}. ${choice.label}`));
  } else {
    choices.append(node("li", "hint", "선택지 없음"));
  }

  const issues = clear($("#detailIssues"));
  if (detail.issues.length) {
    for (const issue of detail.issues) {
      const item = node("li", `severity-text ${issue.severity}`);
      item.textContent = `${issue.severity.toUpperCase()} · ${issue.code} · ${issue.message}`;
      issues.append(item);
    }
  } else {
    issues.append(node("li", "", "검출된 오류·경고 없음"));
  }

  const preview = $("#detailPreview");
  if (detail.imagePath) {
    preview.src = `../../${detail.imagePath}`;
    preview.alt = `${detail.id} asset 미리보기`;
    preview.hidden = false;
  } else {
    preview.removeAttribute("src");
    preview.hidden = true;
  }
  $("#questionDetail").showModal();
}

function renderAll() {
  renderKpis();
  renderSubjects();
  renderCategories();
  renderDifficulty();
  renderTypes();
  renderAssets();
  renderIssues();
  renderQuestionRows();
}

function syncCategoryFilter() {
  const categories = state.report.categories
    .filter(category => !state.filters.subject || category.subjectId === state.filters.subject)
    .map(category => ({ value: category.name, label: category.name }))
    .filter((item, index, list) => list.findIndex(candidate => candidate.value === item.value) === index)
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
  setOptions($("#categoryFilter"), categories, "전체");
  state.filters.category = $("#categoryFilter").value;
}

function initializeSelects() {
  const subjects = state.report.subjects.map(subject => ({ value: subject.id, label: subject.label }));
  setOptions($("#categorySubject"), subjects, "과목 선택");
  $("#categorySubject").value = state.categorySubject;
  setOptions($("#subjectFilter"), subjects, "전체");
  setOptions(
    $("#difficultyFilter"),
    state.report.difficulties.overall.map(item => ({ value: item.key, label: item.label })),
    "전체"
  );
  setOptions(
    $("#typeFilter"),
    state.report.types.overall.map(item => ({ value: item.key, label: item.label })),
    "전체"
  );
  syncCategoryFilter();
}

function downloadFile(filename, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function bindEvents() {
  $("#categorySubject").addEventListener("change", event => {
    state.categorySubject = event.target.value || "chemistry";
    renderCategories();
  });
  $("#categorySort").addEventListener("change", event => {
    state.categorySort = event.target.value;
    renderCategories();
  });
  $("#searchFilter").addEventListener("input", event => {
    state.filters.search = event.target.value;
    state.page = 1;
    renderQuestionRows();
  });
  $("#subjectFilter").addEventListener("change", event => {
    state.filters.subject = event.target.value;
    state.filters.category = "";
    syncCategoryFilter();
    state.page = 1;
    renderQuestionRows();
  });
  $("#categoryFilter").addEventListener("change", event => {
    state.filters.category = event.target.value;
    state.page = 1;
    renderQuestionRows();
  });
  const filterBindings = [
    ["difficultyFilter", "difficulty"],
    ["typeFilter", "type"],
    ["assetFilter", "asset"],
    ["animationFilter", "animation"],
    ["explanationFilter", "explanation"],
    ["statusFilter", "status"]
  ];
  for (const [id, key] of filterBindings) {
    $(`#${id}`).addEventListener("change", event => {
      state.filters[key] = event.target.value;
      state.page = 1;
      renderQuestionRows();
    });
  }
  for (const button of document.querySelectorAll("[data-sort]")) {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      state.sort = {
        key,
        direction: state.sort.key === key && state.sort.direction === "asc" ? "desc" : "asc"
      };
      state.page = 1;
      renderQuestionRows();
    });
  }
  $("#pageSize").addEventListener("change", event => {
    state.pageSize = Number(event.target.value);
    state.page = 1;
    renderQuestionRows();
  });
  $("#prevPage").addEventListener("click", () => {
    state.page -= 1;
    renderQuestionRows();
  });
  $("#nextPage").addEventListener("click", () => {
    state.page += 1;
    renderQuestionRows();
  });
  $("#exportJson").addEventListener("click", () => {
    downloadFile("content-report.json", "application/json;charset=utf-8", JSON.stringify(state.report, null, 2));
  });
  $("#exportCsv").addEventListener("click", () => {
    downloadFile("content-inventory.csv", "text/csv;charset=utf-8", `\uFEFF${questionsToCsv(state.report.questions)}`);
  });
}

async function loadReport() {
  const response = await fetch("./generated/content-report.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`report 요청 실패: HTTP ${response.status}`);
  const report = await response.json();
  if (!Array.isArray(report.questions) || !Array.isArray(report.issues)) {
    throw new Error("content-report.json schema가 올바르지 않습니다.");
  }
  return report;
}

async function start() {
  try {
    state.report = await loadReport();
    $("#analysisTime").textContent = new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(state.report.meta.generatedAt));
    initializeSelects();
    bindEvents();
    renderAll();
    $("#loadStatus").className = "load-status ready";
    document.documentElement.dataset.dashboardReady = "true";
    globalThis.ContentDashboard = Object.freeze({
      report: state.report,
      openQuestionDetail
    });
  } catch (error) {
    $("#loadStatus").className = "load-status error";
    $("#loadStatus").textContent = `대시보드를 불러오지 못했습니다. npm run content:analyze 실행 후 다시 확인하세요. (${error.message})`;
    document.documentElement.dataset.dashboardReady = "error";
    console.error(error);
  }
}

start();
