import { subjectById } from "../../data/subjects.js";
import { categoriesForSubject, quizzesForSubject } from "../../data/subject-quizzes.js";
import { siteUrl } from "./site-routing.js";
import { GLOBAL_STORAGE_KEYS, SubjectStorage, summarizeSubjectRecords } from "./subject-storage.js";

const subjectId = document.documentElement.dataset.subject;
const subject = subjectById(subjectId);
const root = document.getElementById("subjectShell");
const VALID_VIEWS = new Set(["home", "jars", "records"]);
if (!subject || !root || subject.id === "chemistry") throw new Error("Unknown subject shell: " + (subjectId || "missing"));

const storage = new SubjectStorage(subject.id);
const quizzes = quizzesForSubject(subject.id);
const categories = categoriesForSubject(subject.id);
let activeCategory = storage.read("selected-category", "전체");
if (activeCategory !== "전체" && !categories.includes(activeCategory)) activeCategory = "전체";

const shopHref = siteUrl("shop.html?subject=" + encodeURIComponent(subject.id));
const portalHref = siteUrl("");
document.documentElement.dataset.theme = subject.theme;
document.title = "콩쥐야 줘때써 - " + subject.name + "편";
try {
  localStorage.setItem(GLOBAL_STORAGE_KEYS.lastSubject, subject.id);
} catch {
  // URL links still carry the subject when storage is unavailable.
}

root.innerHTML = [
  '<a class="skip-link" href="#subjectMain">본문으로 바로가기</a>',
  '<header class="subject-topbar">',
  '<a class="subject-brand" href="?view=home" data-view-target="home" aria-label="__SUBJECT__편 홈으로 이동"><span aria-hidden="true">甕</span><span><strong>콩쥐야 줘때써 - __SUBJECT__편</strong><small>__ENGLISH__ TRAINING HALL</small></span></a>',
  '<nav class="subject-desktop-nav" aria-label="__SUBJECT__편 주요 메뉴"><button type="button" data-view-target="home">홈</button><button type="button" data-view-target="jars">장독대</button><button type="button" data-view-target="records">기록</button><a href="__SHOP__">콩 상점</a></nav>',
  '<div class="subject-top-actions"><a class="portal-return" href="__PORTAL__" aria-label="과학 통합관으로 돌아가기">과학 통합관</a><button class="settings-button" type="button" data-settings-open aria-label="설정 열기">⚙</button></div>',
  '</header><main id="subjectMain">',
  '<section class="subject-view subject-home-view" data-subject-view="home"><div class="subject-hero"><div class="subject-hero-copy">',
  '<p class="eyebrow">SCIENCE SUBJECT HALL</p><span class="subject-icon" aria-hidden="true">__ICON__</span><h1>__SUBJECT__편</h1><strong>__ENGLISH_TITLE__</strong>',
  '<p>콩쥐가 붓는 물을 지키고, 두꺼비와 함께 __SUBJECT__ 장독대를 채워 보세요.</p><button class="primary-action" type="button" data-view-target="jars">장독대 둘러보기</button></div>',
  '<div class="subject-story" aria-label="기본 게임 방식"><span><b>01</b> 문제를 맞혀 물을 붓습니다</span><span><b>02</b> 두꺼비가 장독대 구멍을 막습니다</span><span><b>03</b> 물을 끝까지 채우면 성공입니다</span></div></div>',
  '<article class="subject-welcome"><p class="eyebrow">__ENGLISH__</p><h2>__SUBJECT__ 학습관</h2><p>화학편과 같은 장독대 게임 시스템을 사용합니다. 퀴즈가 등록되면 장독대 화면에 자동으로 나타납니다.</p></article></section>',
  '<section class="subject-view subject-panel" data-subject-view="jars" hidden aria-labelledby="jarTitle"><header class="section-heading"><div><p class="eyebrow">JAR SELECTION</p><h2 id="jarTitle" tabindex="-1">채울 장독대를 고르세요</h2></div><p>__SUBJECT__ 퀴즈와 카테고리는 registry에서 자동으로 불러옵니다.</p></header>',
  '<div id="subjectCategoryFilter" class="subject-category-filter" aria-label="__SUBJECT__ 카테고리" hidden></div><div id="subjectQuizGrid" class="subject-quiz-grid" aria-live="polite"></div>',
  '<div id="subjectQuizEmpty" class="subject-empty" role="status"><span aria-hidden="true">甕</span><h3>아직 등록된 __SUBJECT__ 장독대가 없습니다.</h3><p>새로운 퀴즈가 추가될 예정입니다.</p></div></section>',
  '<section class="subject-view subject-panel" data-subject-view="records" hidden aria-labelledby="recordsTitle"><header class="section-heading"><div><p class="eyebrow">PLAY RECORD</p><h2 id="recordsTitle" tabindex="-1">__SUBJECT__ 장독대 기록</h2></div><p>이 과목에서 실제로 플레이한 결과만 표시합니다.</p></header>',
  '<div class="subject-record-summary"><article><span>총 플레이</span><strong id="subjectTotalPlays">0</strong></article><article><span>전체 정답률</span><strong id="subjectAccuracy">—</strong></article><article><span>최고 콤보</span><strong id="subjectBestCombo">0</strong></article><article><span>총 풀이 문제</span><strong id="subjectTotalAnswers">0</strong></article></div><div id="subjectRecordList" class="subject-record-list" aria-live="polite"></div></section>',
  '</main><nav class="subject-mobile-nav" aria-label="__SUBJECT__편 주요 메뉴"><button type="button" data-view-target="home"><span aria-hidden="true">⌂</span>홈</button><button type="button" data-view-target="jars"><span aria-hidden="true">甕</span>장독대</button><button type="button" data-view-target="records"><span aria-hidden="true">冊</span>기록</button><a href="__SHOP__"><span aria-hidden="true">豆</span>상점</a><button type="button" data-settings-open aria-label="설정 열기"><span aria-hidden="true">⚙</span>설정</button><a href="__PORTAL__" aria-label="과학 통합관으로 돌아가기"><span aria-hidden="true">科</span>통합관</a></nav>',
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
  grid.replaceChildren(...visible.map(quiz => {
    const card = document.createElement("article");
    card.className = "subject-quiz-card";
    const category = document.createElement("span");
    category.textContent = quiz.category;
    const title = document.createElement("h3");
    title.textContent = quiz.title;
    const description = document.createElement("p");
    description.textContent = quiz.description;
    const action = quiz.implementation
      ? document.createElement("a")
      : document.createElement("button");
    action.className = "primary-action";
    if (quiz.implementation) {
      action.href = siteUrl(quiz.implementation);
      action.textContent = "장독대 시작";
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

function renderRecords() {
  const records = storage.read("records", []);
  const summary = summarizeSubjectRecords(records);
  document.getElementById("subjectTotalPlays").textContent = String(summary.plays);
  document.getElementById("subjectAccuracy").textContent = summary.accuracy == null ? "—" : summary.accuracy + "%";
  document.getElementById("subjectBestCombo").textContent = String(summary.bestCombo);
  document.getElementById("subjectTotalAnswers").textContent = String(summary.answers);
  const list = document.getElementById("subjectRecordList");
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "record-empty";
    empty.textContent = "플레이 기록 없음";
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...records.map(record => {
    const item = document.createElement("article");
    item.className = "subject-record-card";
    const title = document.createElement("h3");
    title.textContent = record.title || record.quizId || "장독대 기록";
    const copy = document.createElement("p");
    const correct = Number(record.correct) || 0;
    const wrong = Number(record.wrong) || 0;
    copy.textContent = "정답 " + correct + " · 오답 " + wrong + " · 총 " + (correct + wrong) + "문제";
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
