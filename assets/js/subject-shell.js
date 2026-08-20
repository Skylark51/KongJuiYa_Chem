import { subjectById } from "../../data/subjects.js";
import { categoriesForSubject, quizzesForSubject } from "../../data/subject-quizzes.js";
import { getSubjectGameContent } from "../../data/subject-game-content.js";
import { siteUrl } from "./site-routing.js";
import { GLOBAL_STORAGE_KEYS, SubjectStorage } from "./subject-storage.js";
import { createSubjectToolbarMarkup } from "./subject-toolbar/markup.js";
import { openDifficultySelection, writeTrainingSelection } from "./jar-session.js";
import { buildJarRecordAnalytics } from "./jar-records.js";

const subjectId = document.documentElement.dataset.subject;
const subject = subjectById(subjectId);
const root = document.getElementById("subjectShell");
const VALID_VIEWS = new Set(["home", "jars", "records"]);
if (!subject || !root || subject.id === "chemistry") throw new Error("Unknown subject shell: " + (subjectId || "missing"));

const storage = new SubjectStorage(subject.id);
const quizzes = quizzesForSubject(subject.id);
const categories = categoriesForSubject(subject.id);
const recordModes = getSubjectGameContent(subject.id)?.trainingModes || [];
let activeCategory = storage.read("selected-category", "전체");
if (activeCategory !== "전체" && !categories.includes(activeCategory)) activeCategory = "전체";

const shopHref = siteUrl("shop.html?subject=" + encodeURIComponent(subject.id));
const portalHref = siteUrl("");
const toolbarMarkup = createSubjectToolbarMarkup({ subject, shopHref, portalHref });
document.documentElement.dataset.theme = subject.theme;
document.title = "콩쥐야 줘때써 - " + subject.name + "편";

function ensureRecordStyles() {
  if (document.querySelector('link[data-subject-jar-record-styles="true"]')) return;
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.dataset.subjectJarRecordStyles = "true";
  stylesheet.href = siteUrl("assets/css/jar-records.css?v=20260820-growth1");
  document.head.append(stylesheet);
  const layout = document.createElement("link");
  layout.rel = "stylesheet";
  layout.dataset.subjectJarRecordStyles = "true";
  layout.href = siteUrl("assets/css/subject-jar-records.css?v=20260820-growth1");
  document.head.append(layout);
}

ensureRecordStyles();
try {
  localStorage.setItem(GLOBAL_STORAGE_KEYS.lastSubject, subject.id);
} catch {
  // URL links still carry the subject when storage is unavailable.
}

root.innerHTML = [
  '<a class="skip-link" href="#subjectMain">본문으로 바로가기</a>',
  toolbarMarkup.top,
  '<main id="subjectMain">',
  '<section class="subject-view subject-home-view" data-subject-view="home"><div class="subject-hero"><div class="subject-hero-copy">',
  '<p class="eyebrow">SCIENCE SUBJECT HALL</p><span class="subject-icon" aria-hidden="true">__ICON__</span><h1>__SUBJECT__편</h1><strong>__ENGLISH_TITLE__</strong>',
  '<p>콩쥐가 붓는 물을 지키고, 두꺼비와 함께 __SUBJECT__ 장독대를 채워 보세요.</p><button class="primary-action" type="button" data-view-target="jars">장독대 둘러보기</button></div>',
  '<div class="subject-story" aria-label="기본 게임 방식"><span><b>01</b> 문제를 맞혀 물을 붓습니다</span><span><b>02</b> 두꺼비가 장독대 구멍을 막습니다</span><span><b>03</b> 물을 끝까지 채우면 성공입니다</span></div></div>',
  '<article class="subject-welcome"><p class="eyebrow">__ENGLISH__</p><h2>__SUBJECT__ 학습관</h2><p>화학편과 같은 장독대 게임 시스템을 사용합니다. 퀴즈가 등록되면 장독대 화면에 자동으로 나타납니다.</p></article></section>',
  '<section class="subject-view subject-panel" data-subject-view="jars" hidden aria-labelledby="jarTitle"><header class="section-heading"><div><p class="eyebrow">JAR SELECTION</p><h2 id="jarTitle" tabindex="-1">채울 장독대를 고르세요</h2></div><p>__SUBJECT__ 퀴즈와 카테고리는 registry에서 자동으로 불러옵니다.</p></header>',
  '<div id="subjectCategoryFilter" class="subject-category-filter" aria-label="__SUBJECT__ 카테고리" hidden></div><div id="subjectQuizGrid" class="subject-quiz-grid" aria-live="polite"></div>',
  '<div id="subjectQuizEmpty" class="subject-empty" role="status"><span aria-hidden="true">甕</span><h3>아직 등록된 __SUBJECT__ 장독대가 없습니다.</h3><p>새로운 퀴즈가 추가될 예정입니다.</p></div></section>',
  '<section class="subject-view subject-panel" data-subject-view="records" hidden aria-labelledby="recordsTitle"><header class="section-heading"><div><p class="eyebrow">PLAY RECORD</p><h2 id="recordsTitle" tabindex="-1">__SUBJECT__ 장독대 기록</h2></div><p>내 이전 기록과 비교해 성장 흐름을 확인하세요.</p></header>',
  '<article class="jar-record-goal subject-record-goal" aria-live="polite"><p><strong id="subjectNextGoal">첫 장독대를 채우면 다음 목표를 알려드려요.</strong></p></article><div class="subject-record-summary"><article><span>장독대 완료</span><strong id="subjectTotalPlays">0</strong></article><article><span>총 풀이 문항</span><strong id="subjectTotalAnswers">0</strong></article><article><span>총 정답 수</span><strong id="subjectCorrectAnswers">0</strong></article><article><span>전체 정답률</span><strong id="subjectAccuracy">—</strong></article><article><span>최고 연속 정답</span><strong id="subjectBestCombo">0</strong></article></div><section class="subject-record-growth" aria-labelledby="subjectGrowthTitle"><h3 id="subjectGrowthTitle">최근 성장</h3><dl class="jar-growth-grid"><div><dt>직전 플레이 대비</dt><dd id="subjectAccuracyChange">첫 기록 후 비교 가능</dd></div><div><dt>개인 최고 정답률</dt><dd id="subjectPersonalBest">—</dd></div><div><dt>성장 기록</dt><dd id="subjectBestNotice">기록을 쌓아 보세요</dd></div></dl><div id="subjectRecordTrend" class="subject-record-trend" aria-live="polite"></div></section><section class="subject-record-categories" aria-labelledby="subjectCategoryRecordTitle"><h3 id="subjectCategoryRecordTitle">영역별 실력</h3><div id="subjectCategoryList" class="jar-category-list" aria-live="polite"></div></section><div id="subjectRecordList" class="subject-record-list" aria-live="polite"></div></section>',
  '</main>',
  toolbarMarkup.bottom,
  '<dialog id="subjectSettings" class="subject-settings" aria-labelledby="subjectSettingsTitle"><form method="dialog"><button class="dialog-close" value="cancel" aria-label="설정 닫기">×</button><p class="eyebrow">GLOBAL SETTINGS</p><h2 id="subjectSettingsTitle">콩쥐야 줘때써 설정</h2><p>음량과 화면 모드는 모든 과목에서 공유됩니다.</p><label>전체 음량 <input id="subjectVolume" type="range" min="0" max="1" step="0.05"></label><label>기기 화면<select id="subjectDeviceMode"><option value="auto">자동 감지</option><option value="desktop">PC 버전</option><option value="mobile">모바일 버전</option></select></label><label class="toggle-row"><input id="subjectMotion" type="checkbox"> 애니메이션 사용</label><div class="dialog-actions"><button value="cancel">취소</button><button class="primary-action" value="save">저장</button></div></form></dialog>'
].join("").replaceAll("__SUBJECT__", subject.name).replaceAll("__ENGLISH_TITLE__", subject.englishName).replaceAll("__ENGLISH__", subject.englishName.toUpperCase()).replaceAll("__ICON__", subject.icon).replaceAll("__SHOP__", shopHref).replaceAll("__PORTAL__", portalHref);

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function applyDeviceMode(mode) {
  const detected = innerWidth <= 820 || matchMedia("(pointer: coarse)").matches && innerWidth < 1100 ? "mobile" : "desktop";
  document.documentElement.dataset.deviceMode = mode;
  document.documentElement.dataset.deviceLayout = mode === "mobile" || mode === "desktop" ? mode : detected;
}

function renderCategories() {
  const filter = document.getElementById("subjectCategoryFilter");
  if (!filter || !categories.length) {
    if (filter) filter.hidden = true;
    return;
  }
  filter.hidden = false;
  filter.replaceChildren(...["전체", ...categories].map(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.classList.toggle("is-active", category === activeCategory);
    button.setAttribute("aria-pressed", String(category === activeCategory));
    button.addEventListener("click", () => {
      activeCategory = category;
      storage.write("selected-category", category);
      renderCategories();
      renderQuizzes();
    });
    return button;
  }));
}

function renderQuizzes() {
  const grid = document.getElementById("subjectQuizGrid");
  const empty = document.getElementById("subjectQuizEmpty");
  const visible = quizzes.filter(quiz => activeCategory === "전체" || quiz.category === activeCategory);
  empty.hidden = visible.length > 0;
  const emptyTitle = empty.querySelector("h3");
  const emptyCopy = empty.querySelector("p");
  if (!visible.length && quizzes.length && activeCategory !== "전체") {
    emptyTitle.textContent = "이 범주에는 아직 등록된 장독대가 없습니다.";
    emptyCopy.textContent = activeCategory + " 장독대가 추가될 예정입니다.";
  } else {
    emptyTitle.textContent = "아직 등록된 " + subject.name + " 장독대가 없습니다.";
    emptyCopy.textContent = "새로운 퀴즈가 추가될 예정입니다.";
  }
  grid.replaceChildren(...visible.map(quiz => {
    const card = document.createElement("article");
    card.className = "subject-quiz-card";
    const category = document.createElement("span");
    category.textContent = quiz.category;
    const title = document.createElement("h3");
    title.textContent = quiz.title;
    const description = document.createElement("p");
    description.textContent = quiz.description;
    const action = document.createElement("button");
    action.className = "primary-action";
    if (quiz.implementation) {
      action.type = "button";
      action.textContent = "장독대 시작";
      action.addEventListener("click", () => {
        const target = new URL(siteUrl(quiz.implementation));
        const trainingId = target.searchParams.get("training");
        if (!trainingId) return;
        openDifficultySelection({ mode: quiz }).then(difficulty => {
          if (!difficulty) {
            setView("jars", { replace: true });
            return;
          }
          writeTrainingSelection({ trainingId, difficulty, resume: false });
          location.href = target.href;
        });
      });
    } else {
      card.classList.add("is-planned");
      action.type = "button";
      action.disabled = true;
      action.textContent = "문제 준비 중";
      action.setAttribute("aria-label", quiz.title + " 문제 준비 중");
    }
    card.append(category, title, description, action);
    return card;
  }));
}

const numberText = value => Math.round(Number(value) || 0).toLocaleString("ko-KR");
const percentText = value => value == null ? "—" : Math.round(value) + "%";

function statusClass(status) {
  if (status === "강점") return "is-strength";
  if (status === "보완 필요") return "is-needs-work";
  return "";
}

function renderSubjectTrend(region, sessions) {
  region.replaceChildren();
  const comparable = sessions.filter(session => session.accuracy != null);
  if (!comparable.length) {
    const empty = document.createElement("p");
    empty.className = "jar-record-empty";
    empty.textContent = sessions.length ? "정답률을 알 수 있는 새 기록부터 성장 흐름을 보여드립니다." : "첫 장독대를 채우면 최근 7회 정답률 흐름을 보여드립니다.";
    region.append(empty);
    return;
  }
  comparable.forEach((session, index) => {
    const column = document.createElement("div");
    const bar = document.createElement("i");
    bar.style.height = Math.max(5, Math.min(100, session.accuracy)) + "%";
    bar.setAttribute("aria-label", (index + 1) + "회차 정답률 " + percentText(session.accuracy));
    const label = document.createElement("span");
    label.textContent = percentText(session.accuracy);
    column.append(bar, label);
    region.append(column);
  });
}

function renderSubjectCategories(region, categories) {
  region.replaceChildren();
  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "jar-record-empty";
    empty.textContent = "영역별 기록은 장독대를 시작하면 표시됩니다.";
    region.append(empty);
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
    detail.textContent = "풀이 " + numberText(category.totalQuestions) + "문항 · 정답률 " + percentText(category.accuracy);
    label.append(title, detail);
    const progress = document.createElement("div");
    progress.className = "jar-category-progress";
    const recent = document.createElement("span");
    const recentLabel = document.createElement("span");
    recentLabel.textContent = "최근 정답률";
    const recentValue = document.createElement("b");
    recentValue.textContent = percentText(category.recentAccuracy);
    recent.append(recentLabel, recentValue);
    const track = document.createElement("div");
    track.className = "jar-category-track";
    const fill = document.createElement("i");
    fill.style.width = Math.max(0, Math.min(100, category.accuracy ?? 0)) + "%";
    track.append(fill);
    progress.append(recent, track);
    const status = document.createElement("b");
    status.className = "jar-category-status " + statusClass(category.status);
    status.textContent = category.status;
    row.append(label, progress, status);
    region.append(row);
  });
}

function renderRecords() {
  const records = storage.read("records", []);
  const overall = storage.read("record-summary", {});
  const analytics = buildJarRecordAnalytics({ records, modes: recordModes, subject: subject.id, overall });
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  setText("subjectTotalPlays", numberText(analytics.totals.completedPlays));
  setText("subjectTotalAnswers", numberText(analytics.totals.totalQuestions));
  setText("subjectCorrectAnswers", numberText(analytics.totals.correctAnswers));
  setText("subjectAccuracy", percentText(analytics.totals.accuracy));
  setText("subjectBestCombo", numberText(analytics.totals.maxCombo));
  setText("subjectNextGoal", analytics.nextGoal);
  const change = analytics.growth.accuracyChange;
  setText("subjectAccuracyChange", change == null ? "첫 기록 후 비교 가능" : (change > 0 ? "+" : "") + change + "%");
  setText("subjectPersonalBest", percentText(analytics.growth.personalBest));
  const bestNotice = analytics.growth.latestIsPersonalBest
    ? "개인 최고 정답률 갱신!"
    : analytics.growth.latestAccuracy == null ? "기록을 쌓아 보세요" : "다음 장독대에서 갱신 도전";
  setText("subjectBestNotice", bestNotice);
  document.getElementById("subjectBestNotice")?.closest("div")?.classList.toggle("is-personal-best", analytics.growth.latestIsPersonalBest);
  renderSubjectTrend(document.getElementById("subjectRecordTrend"), analytics.recentSessions);
  renderSubjectCategories(document.getElementById("subjectCategoryList"), analytics.categories);

  const list = document.getElementById("subjectRecordList");
  if (!analytics.sessions.length) {
    const empty = document.createElement("p");
    empty.className = "record-empty";
    empty.textContent = "플레이 기록 없음";
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...analytics.sessions.slice().reverse().map(record => {
    const item = document.createElement("article");
    item.className = "subject-record-card";
    const title = document.createElement("h3");
    title.textContent = record.title || record.trainingId || "장독대 기록";
    const copy = document.createElement("p");
    copy.textContent = "정답 " + record.correctAnswers + " · 오답 " + (record.wrongAnswers + record.timeoutAnswers) + " · 총 " + record.totalQuestions + "문항 · " + percentText(record.accuracy);
    item.append(title, copy);
    return item;
  }));
}

function setView(view, options = {}) {
  const next = VALID_VIEWS.has(view) ? view : "home";
  document.querySelectorAll("[data-subject-view]").forEach(node => { node.hidden = node.dataset.subjectView !== next; });
  document.querySelectorAll("[data-view-target]").forEach(control => {
    if (control.dataset.viewTarget === next) control.setAttribute("aria-current", "page");
    else control.removeAttribute("aria-current");
  });
  const url = new URL(location.href);
  if (next === "home") url.searchParams.delete("view");
  else url.searchParams.set("view", next);
  history[options.replace ? "replaceState" : "pushState"]({ view: next }, "", url);
  if (options.focus) document.querySelector('[data-subject-view="' + next + '"] h1, [data-subject-view="' + next + '"] h2')?.focus();
}

function mountSettings() {
  const dialog = document.getElementById("subjectSettings");
  const volume = document.getElementById("subjectVolume");
  const device = document.getElementById("subjectDeviceMode");
  const motion = document.getElementById("subjectMotion");
  const open = () => {
    const audio = readJson(GLOBAL_STORAGE_KEYS.audioSettings, { bgmVolume: 0.8, sfxVolume: 0.8 });
    const preferences = readJson(GLOBAL_STORAGE_KEYS.uiPreferences, { animations: true });
    volume.value = String(Math.max(0, Math.min(1, Number(audio.bgmVolume ?? audio.sfxVolume ?? 0.8))));
    device.value = localStorage.getItem(GLOBAL_STORAGE_KEYS.deviceMode) || "auto";
    motion.checked = preferences.animations !== false;
    if (!dialog.open) dialog.showModal();
  };
  document.querySelectorAll("[data-settings-open]").forEach(button => button.addEventListener("click", open));
  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "save") return;
    const level = Number(volume.value);
    const audio = readJson(GLOBAL_STORAGE_KEYS.audioSettings, {});
    const nextAudio = { ...audio, bgmVolume: level, sfxVolume: level };
    localStorage.setItem(GLOBAL_STORAGE_KEYS.audioSettings, JSON.stringify(nextAudio));
    localStorage.setItem(GLOBAL_STORAGE_KEYS.deviceMode, device.value);
    localStorage.setItem(GLOBAL_STORAGE_KEYS.uiPreferences, JSON.stringify({ animations: motion.checked }));
    document.documentElement.classList.toggle("reduce-motion", !motion.checked);
    applyDeviceMode(device.value);
    dispatchEvent(new CustomEvent("kongjui:audio-settings", { detail: nextAudio }));
  });
}

document.querySelectorAll("[data-view-target]").forEach(control => control.addEventListener("click", event => {
  event.preventDefault();
  setView(control.dataset.viewTarget, { focus: true });
}));
addEventListener("popstate", () => setView(new URL(location.href).searchParams.get("view"), { replace: true }));
const globalPreferences = readJson(GLOBAL_STORAGE_KEYS.uiPreferences, { animations: true });
document.documentElement.classList.toggle("reduce-motion", globalPreferences.animations === false);
applyDeviceMode(localStorage.getItem(GLOBAL_STORAGE_KEYS.deviceMode) || "auto");
renderCategories();
renderQuizzes();
renderRecords();
mountSettings();
setView(new URL(location.href).searchParams.get("view"), { replace: true });
document.documentElement.dataset.subjectShellReady = "true";
