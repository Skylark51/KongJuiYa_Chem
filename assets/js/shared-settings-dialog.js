import { GameStorage } from "./storage.js";
import { GLOBAL_STORAGE_KEYS } from "./subject-storage.js";
import { getDeviceMode, setDeviceMode } from "./device-entry.js";

const SUPPORTED_PAGES = new Set(["lobby", "subject-shell", "game"]);
const LEGACY_DIALOG_IDS = ["settingsDialog", "subjectSettings", "audioSettingsDialog"];
const AUDIO_DEFAULTS = Object.freeze({ bgmVolume: 0.8, sfxVolume: 0.8, mute: false });
const DIFFICULTIES = new Set(["easy", "normal", "hard"]);
const DEVICE_MODES = new Set(["auto", "desktop", "mobile"]);
const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 100;
const DEFAULT_QUESTION_COUNT = 10;
let mounted = false;
let legacyObserver = null;
let sharedStorage = null;

const clamp01 = value => Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : 0));
const clampQuestionCount = value => {
  const number = Math.round(Number(value));
  return Number.isFinite(number)
    ? Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, number))
    : DEFAULT_QUESTION_COUNT;
};

function readJson(storage, key, fallback = {}) {
  try {
    const value = JSON.parse(storage?.getItem(key) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function readAudioSettings(storage, legacyVolume) {
  const raw = readJson(storage, GLOBAL_STORAGE_KEYS.audioSettings, {});
  const fallback = clamp01(legacyVolume ?? AUDIO_DEFAULTS.bgmVolume);
  return {
    bgmVolume: clamp01(raw.bgmVolume ?? fallback),
    sfxVolume: clamp01(raw.sfxVolume ?? fallback),
    mute: Boolean(raw.mute)
  };
}

function readUiPreferences(storage) {
  return readJson(storage, GLOBAL_STORAGE_KEYS.uiPreferences, {});
}

export function readSharedSettings({ storage = globalThis.localStorage, gameStorage = null } = {}) {
  const store = gameStorage || new GameStorage(storage);
  store.data = store.load();
  const legacy = store.data.settings || {};
  const preferences = readUiPreferences(storage);
  const audio = readAudioSettings(storage, legacy.volume);
  const deviceMode = getDeviceMode(storage) || (DEVICE_MODES.has(legacy.deviceMode) ? legacy.deviceMode : "auto");
  return {
    ...audio,
    difficulty: DIFFICULTIES.has(legacy.difficulty) ? legacy.difficulty : "normal",
    questionCount: clampQuestionCount(legacy.questionCount),
    animations: typeof preferences.animations === "boolean" ? preferences.animations : legacy.animations !== false,
    deviceMode
  };
}

export function saveSharedSettings(values, {
  storage = globalThis.localStorage,
  gameStorage = null,
  windowRef = globalThis.window,
  documentRef = globalThis.document
} = {}) {
  const store = gameStorage || new GameStorage(storage);
  const current = readSharedSettings({ storage, gameStorage: store });
  const next = {
    bgmVolume: clamp01(values?.bgmVolume ?? current.bgmVolume),
    sfxVolume: clamp01(values?.sfxVolume ?? current.sfxVolume),
    mute: Boolean(values?.mute),
    difficulty: DIFFICULTIES.has(values?.difficulty) ? values.difficulty : current.difficulty,
    questionCount: clampQuestionCount(values?.questionCount ?? current.questionCount),
    animations: values?.animations !== false,
    deviceMode: DEVICE_MODES.has(values?.deviceMode) ? values.deviceMode : current.deviceMode
  };

  const audio = { bgmVolume: next.bgmVolume, sfxVolume: next.sfxVolume, mute: next.mute };
  storage?.setItem(GLOBAL_STORAGE_KEYS.audioSettings, JSON.stringify(audio));
  storage?.setItem(
    GLOBAL_STORAGE_KEYS.uiPreferences,
    JSON.stringify({ ...readUiPreferences(storage), animations: next.animations })
  );

  store.data = store.load();
  store.updateSettings({
    volume: next.mute ? 0 : next.bgmVolume,
    difficulty: next.difficulty,
    questionCount: next.questionCount,
    animations: next.animations,
    deviceMode: next.deviceMode
  });

  if (storage === globalThis.localStorage && windowRef && documentRef) {
    setDeviceMode(next.deviceMode, storage);
    documentRef.documentElement.classList.toggle("reduce-motion", !next.animations);
    windowRef.dispatchEvent(new CustomEvent("kongjui:audio-settings", { detail: audio }));
    windowRef.dispatchEvent(new CustomEvent("kongjui:settings-changed", { detail: next }));
    try {
      windowRef.dispatchEvent(new StorageEvent("storage", { key: "kongjuiya-chem-save" }));
    } catch {
      // Some browsers restrict synthetic StorageEvent construction; persisted settings still remain authoritative.
    }
  } else {
    storage?.setItem(GLOBAL_STORAGE_KEYS.deviceMode, next.deviceMode);
  }
  return next;
}

function ensureStylesheet(documentRef) {
  if (documentRef.querySelector('link[data-shared-settings-style="true"]')) return;
  const link = documentRef.createElement("link");
  link.rel = "stylesheet";
  link.dataset.sharedSettingsStyle = "true";
  link.href = new URL("../css/shared-settings-dialog.css?v=20260815-settings-parity1", import.meta.url).href;
  documentRef.head.append(link);
}

function createDialog(documentRef) {
  const dialog = documentRef.createElement("dialog");
  dialog.id = "sharedSettingsDialog";
  dialog.className = "shared-settings-dialog";
  dialog.setAttribute("aria-labelledby", "sharedSettingsTitle");
  dialog.innerHTML = `
    <form method="dialog" class="shared-settings-form">
      <button class="shared-settings-close" value="cancel" aria-label="설정 닫기">×</button>
      <p class="shared-settings-eyebrow">GLOBAL SETTINGS</p>
      <h2 id="sharedSettingsTitle">콩쥐야 줘때써 설정</h2>
      <p class="shared-settings-intro">메인과 게임, 물리·화학·생명과학·지구과학에서 같은 설정을 사용합니다.</p>

      <fieldset class="shared-settings-group">
        <legend>소리</legend>
        <label class="shared-settings-range"><span>BGM 음량 <output id="sharedBgmValue">80%</output></span><input id="sharedBgmVolume" type="range" min="0" max="1" step="0.01"></label>
        <label class="shared-settings-range"><span>효과음 음량 <output id="sharedSfxValue">80%</output></span><input id="sharedSfxVolume" type="range" min="0" max="1" step="0.01"></label>
        <label class="shared-settings-toggle"><input id="sharedMuteAudio" type="checkbox"><span>전체 음소거</span></label>
      </fieldset>

      <fieldset class="shared-settings-group">
        <legend>게임</legend>
        <label class="shared-settings-row"><span>기본 난도</span><select id="sharedDifficulty"><option value="easy">쉬움</option><option value="normal">보통</option><option value="hard">어려움</option></select></label>
        <label class="shared-settings-row"><span>기본 문항 수</span><input id="sharedQuestionCount" type="number" inputmode="numeric" min="${MIN_QUESTION_COUNT}" max="${MAX_QUESTION_COUNT}" step="1"><small>${MIN_QUESTION_COUNT}~${MAX_QUESTION_COUNT}문항</small></label>
        <label class="shared-settings-toggle"><input id="sharedAnimations" type="checkbox"><span>애니메이션 사용</span></label>
      </fieldset>

      <fieldset class="shared-settings-group">
        <legend>화면</legend>
        <label class="shared-settings-row"><span>기기 화면</span><select id="sharedDeviceMode"><option value="auto">자동 감지</option><option value="desktop">PC 버전</option><option value="mobile">모바일 버전</option></select></label>
      </fieldset>

      <div class="shared-settings-actions"><button class="shared-settings-secondary" value="cancel">취소</button><button class="shared-settings-primary" value="save">저장</button></div>
    </form>`;
  documentRef.body.append(dialog);
  return dialog;
}

function removeLegacySettingsUi(documentRef) {
  for (const id of LEGACY_DIALOG_IDS) documentRef.getElementById(id)?.remove();
  documentRef.getElementById("audioSettingsButton")?.remove();
}

function ensureGameTrigger(documentRef) {
  if (documentRef.documentElement.dataset.page !== "game") return;
  if (documentRef.getElementById("sharedGameSettingsButton")) return;
  const status = documentRef.querySelector(".header-status");
  if (!status) return;
  const button = documentRef.createElement("button");
  button.id = "sharedGameSettingsButton";
  button.type = "button";
  button.className = "header-button header-settings";
  button.dataset.sharedSettingsOpen = "true";
  button.setAttribute("aria-label", "설정 열기");
  button.textContent = "⚙";
  status.insertBefore(button, documentRef.getElementById("ui-pauseButton") || null);
}

function triggerFromEvent(event) {
  const target = event.target instanceof Element ? event.target : null;
  return target?.closest(
    "#settingsButton,#bottomSettingsButton,[data-settings-open],[data-shared-settings-open],#audioSettingsButton"
  ) || null;
}

function bindDialog(dialog, { documentRef, windowRef, storage }) {
  const field = id => dialog.querySelector("#" + id);
  const bgm = field("sharedBgmVolume");
  const sfx = field("sharedSfxVolume");
  const bgmValue = field("sharedBgmValue");
  const sfxValue = field("sharedSfxValue");
  const mute = field("sharedMuteAudio");
  const difficulty = field("sharedDifficulty");
  const questionCount = field("sharedQuestionCount");
  const animations = field("sharedAnimations");
  const deviceMode = field("sharedDeviceMode");
  const updateOutputs = () => {
    bgmValue.value = Math.round(clamp01(bgm.value) * 100) + "%";
    sfxValue.value = Math.round(clamp01(sfx.value) * 100) + "%";
  };
  const refresh = () => {
    sharedStorage.data = sharedStorage.load();
    const settings = readSharedSettings({ storage, gameStorage: sharedStorage });
    bgm.value = String(settings.bgmVolume);
    sfx.value = String(settings.sfxVolume);
    mute.checked = settings.mute;
    difficulty.value = settings.difficulty;
    questionCount.value = String(settings.questionCount);
    animations.checked = settings.animations;
    deviceMode.value = settings.deviceMode;
    updateOutputs();
  };
  const open = () => {
    refresh();
    dialog.returnValue = "";
    if (!dialog.open) dialog.showModal();
  };

  bgm.addEventListener("input", updateOutputs);
  sfx.addEventListener("input", updateOutputs);
  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "save") return;
    const next = saveSharedSettings({
      bgmVolume: bgm.value,
      sfxVolume: sfx.value,
      mute: mute.checked,
      difficulty: difficulty.value,
      questionCount: questionCount.value,
      animations: animations.checked,
      deviceMode: deviceMode.value
    }, { storage, gameStorage: sharedStorage, windowRef, documentRef });
    questionCount.value = String(next.questionCount);
  });

  documentRef.addEventListener("click", event => {
    if (!triggerFromEvent(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open();
  }, true);

  return { open, refresh };
}

export function mountSharedSettingsDialog({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  storage = globalThis.localStorage
} = {}) {
  if (!documentRef || !windowRef) return null;
  if (!SUPPORTED_PAGES.has(documentRef.documentElement.dataset.page)) return null;
  if (mounted) return documentRef.getElementById("sharedSettingsDialog");
  mounted = true;
  sharedStorage = new GameStorage(storage);
  ensureStylesheet(documentRef);
  removeLegacySettingsUi(documentRef);
  ensureGameTrigger(documentRef);
  const dialog = documentRef.getElementById("sharedSettingsDialog") || createDialog(documentRef);
  bindDialog(dialog, { documentRef, windowRef, storage });

  const initial = readSharedSettings({ storage, gameStorage: sharedStorage });
  documentRef.documentElement.classList.toggle("reduce-motion", !initial.animations);

  legacyObserver = new MutationObserver(() => {
    removeLegacySettingsUi(documentRef);
    ensureGameTrigger(documentRef);
  });
  legacyObserver.observe(documentRef.body, { childList: true, subtree: true });
  documentRef.documentElement.dataset.sharedSettingsReady = "true";
  return dialog;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const start = () => mountSharedSettingsDialog();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
