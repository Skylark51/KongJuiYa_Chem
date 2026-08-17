import { GameStorage } from "./storage.js";
import "./records-enhancements.js";
import "./jar-selection-preview.js";
import { siteUrl } from "./site-routing.js";

const VALID_VIEWS = new Set(["home", "jars", "records"]);
const viewNodes = [...document.querySelectorAll("[data-app-view]")];
const controls = [...document.querySelectorAll("[data-view-target]")];
const storage = new GameStorage();
try {
  localStorage.setItem("kongjuiya:last-subject", "chemistry");
} catch {
  // Chemistry shop links also carry an explicit subject query.
}
let bgm = { setVolume() {} };

const MOBILE_UI_BREAKPOINT = 760;
const MOBILE_UI_STYLESHEET = "assets/css/mobile-unified-shell.css?v=20260806-lobby-router1";
const MOBILE_FIXED_SHELL_STYLESHEET = "assets/css/mobile-fixed-shell.css?v=20260806-lobby-router1";
const MOBILE_SETTINGS_STYLESHEET = "assets/css/mobile-settings-dialog.css?v=20260806-lobby-router1";
const MOBILE_NAV_ICONS = [
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-7h6v7"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5c0-1.7 2.2-3 5-3s5 1.3 5 3"/><path d="M6 6h12l-1 14H7L6 6Z"/><path d="M8 9h8"/><path d="M15 15c1.2.4 2 1.3 2 2.4"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/><path d="M2 19h20"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M9 13h6"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.09.37.3.72.6 1 .3.28.69.42 1.1.4h.1v4h-.1c-.41-.02-.8.12-1.1.4-.3.28-.51.63-.6 1Z"/></svg>'
];

function appendStylesheet(href) {
  const path = href.split("?")[0];
  if (document.querySelector(`link[data-site-stylesheet="${path}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.siteStylesheet = path;
  link.href = siteUrl(href);
  document.head.append(link);
}

function installMobileUi() {
  appendStylesheet(MOBILE_UI_STYLESHEET);
  appendStylesheet(MOBILE_FIXED_SHELL_STYLESHEET);
  appendStylesheet(MOBILE_SETTINGS_STYLESHEET);

  const media = matchMedia(`(max-width: ${MOBILE_UI_BREAKPOINT}px)`);
  const syncMobileFlag = () => {
    const forcedMobile = document.documentElement.dataset.deviceLayout === "mobile";
    if (media.matches || forcedMobile) document.documentElement.dataset.mobileUi = "shadcn";
    else delete document.documentElement.dataset.mobileUi;
  };

  syncMobileFlag();
  media.addEventListener?.("change", syncMobileFlag);

  document.querySelectorAll(".mobile-bottom-nav > *").forEach((item, index) => {
    const icon = item.querySelector("span");
    if (!icon || !MOBILE_NAV_ICONS[index]) return;
    icon.classList.add("mobile-nav-icon");
    icon.innerHTML = MOBILE_NAV_ICONS[index];
  });
}

function normalizedView(value) {
  return VALID_VIEWS.has(value) ? value : "home";
}

function currentViewFromUrl() {
  const url = new URL(location.href);
  if (url.searchParams.has("view")) return normalizedView(url.searchParams.get("view"));
  if (location.hash === "#trainingSection") return "jars";
  if (location.hash === "#recordsSection" || location.hash === "#dashboardSection") return "records";
  return "home";
}

function syncBeans() {
  const value = Math.max(0, Math.floor(Number(storage.data.economy?.beans) || 0));
  const node = document.getElementById("headerBeans");
  if (node) node.textContent = value.toLocaleString("ko-KR");
}

function updateUrl(view, historyMode) {
  if (historyMode === "none") return;
  const url = new URL(location.href);
  url.searchParams.set("view", view);
  url.hash = "";
  const state = { view };
  if (historyMode === "replace") history.replaceState(state, "", url);
  else history.pushState(state, "", url);
}

export function setLobbyScreen(nextView, { historyMode = "push", focus = true } = {}) {
  const view = normalizedView(nextView);

  for (const node of viewNodes) {
    const active = node.dataset.appView === view;
    node.hidden = !active;
    node.setAttribute("aria-hidden", String(!active));
  }

  for (const control of controls) {
    const active = control.dataset.viewTarget === view;
    if (active) control.setAttribute("aria-current", "page");
    else control.removeAttribute("aria-current");
  }

  document.documentElement.dataset.lobbyView = view;
  document.body.dataset.lobbyScreen = view;
  updateUrl(view, historyMode);

  if (focus) {
    const activeView = viewNodes.find(node => node.dataset.appView === view);
    const heading = activeView?.querySelector("h1,h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }

  dispatchEvent(new CustomEvent("lobby:view-change", { detail: { view } }));
  return view;
}

function bindViewControls() {
  for (const control of controls) {
    control.addEventListener("click", event => {
      const view = control.dataset.viewTarget;
      if (!VALID_VIEWS.has(view)) return;
      event.preventDefault();
      setLobbyScreen(view);
    });
  }
}

function installMainCtaFallback() {
  const button = document.getElementById("mainCta");
  if (!button) return;

  button.addEventListener("click", () => {
    const before = location.href;
    queueMicrotask(() => {
      if (location.href !== before) return;
      const difficulty = ["easy", "normal", "hard"].includes(storage.data.settings?.difficulty)
        ? storage.data.settings.difficulty
        : "normal";
      try {
        sessionStorage.setItem("kongjuiya-training-selection", JSON.stringify({
          trainingId: "atomic_number",
          difficulty,
          resume: false
        }));
      } catch {
        // Query string remains a complete fallback when session storage is blocked.
      }
      location.assign(siteUrl("콩쥐야_줘때써.html?training=atomic_number"));
    });
  });
}

async function installOptionalEnhancements() {
  try {
    const { mountHistoricalBgm } = await import("./historical-bgm.js");
    bgm = mountHistoricalBgm({ initialVolume: storage.data.settings?.volume ?? 0.5 });
  } catch (error) {
    console.warn("로비 배경음 초기화를 건너뜁니다.", error);
  }

  try {
    const { installLobbyHeroScene } = await import("./lobby-hero-scene.js");
    installLobbyHeroScene();
  } catch (error) {
    console.warn("로비 배경 장식을 건너뜁니다.", error);
  }
}

installMobileUi();
bindViewControls();
installMainCtaFallback();

addEventListener("popstate", event => {
  setLobbyScreen(event.state?.view || currentViewFromUrl(), { historyMode: "none", focus: false });
});

addEventListener("storage", event => {
  if (!event.key || event.key.includes("kongjuiya")) {
    storage.data = storage.load();
    bgm.setVolume(storage.data.settings?.volume ?? 0.5);
    syncBeans();
  }
});

document.getElementById("missionClaimButton")?.addEventListener("click", () => {
  setTimeout(() => {
    storage.data = storage.load();
    syncBeans();
  });
});

setLobbyScreen(currentViewFromUrl(), { historyMode: "replace", focus: false });
syncBeans();
document.documentElement.dataset.lobbyRouterReady = "true";
globalThis.KongJuiYaLobby = Object.freeze({ setLobbyScreen });
installOptionalEnhancements();
