import { activeSubjectLobbyUrl } from "./site-routing.js";

const COUNTDOWN_TOTAL_MS = 3000;
const COUNTDOWN_INTRO_MS = 600;
const COUNTDOWN_STEP_MS = 700;
const COUNTDOWN_START_MS = 180;
const COUNTDOWN_FADE_MS = 120;
const COUNTDOWN_STEPS = Object.freeze([3, 2, 1]);
const INTRO_TEXT = "\uC790... \uC228 \uACE0\uB974\uC2DC\uACE0.. \uC2DC\uC791\uD569\uB2C8\uB2E4";
const START_TEXT = "\uC2DC\uC791";

const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
const byId = id => document.getElementById(id);

let mountedController = null;

export function mountOpeningCountdown({ getApi = () => globalThis.KongJuiYaGame } = {}) {
  if (mountedController) return mountedController;

  const overlay = byId("startOverlay");
  const confirmHomeButton = byId("confirmHomeButton");
  const exitDialog = byId("exitDialog");
  const adDialog = byId("adDialog");
  let pendingExitRoute = null;
  let countdownToken = 0;

  function ensureCountdownCard() {
    if (!overlay) return null;
    let card = overlay.querySelector(".game-start-countdown-card");
    if (card) return card;

    card = document.createElement("div");
    card.className = "game-start-countdown-card";
    const message = document.createElement("p");
    message.className = "game-start-countdown-message";
    message.textContent = INTRO_TEXT;
    const number = document.createElement("strong");
    number.className = "game-start-countdown-number";
    number.setAttribute("aria-live", "assertive");
    number.setAttribute("aria-atomic", "true");
    card.append(message, number);
    overlay.append(card);
    return card;
  }

  function mountOverlayOnQuestionFrame() {
    if (!overlay) return null;
    const questionFrame = document.querySelector(".scene-question-bubble");
    if (questionFrame && overlay.parentElement !== questionFrame) questionFrame.append(overlay);
    return questionFrame;
  }

  async function runCountdown() {
    const token = ++countdownToken;
    const app = byId("ui-gameApp");
    const pauseButton = byId("ui-pauseButton");
    const card = ensureCountdownCard();
    const questionFrame = mountOverlayOnQuestionFrame();
    if (!overlay || !card || !questionFrame) {
      getApi()?.game?.resume?.();
      return;
    }

    const message = card.querySelector(".game-start-countdown-message");
    const number = card.querySelector(".game-start-countdown-number");
    message.textContent = INTRO_TEXT;
    number.textContent = "";
    app?.classList.add("is-opening-countdown");
    if (pauseButton) pauseButton.disabled = true;
    overlay.classList.remove("hidden", "is-opening");
    overlay.classList.add("game-start-countdown");
    overlay.dataset.phase = "intro";
    overlay.setAttribute("aria-hidden", "false");
    overlay.setAttribute("role", "status");

    await wait(COUNTDOWN_INTRO_MS);
    for (const step of COUNTDOWN_STEPS) {
      if (token !== countdownToken) return;
      overlay.dataset.phase = "countdown";
      number.textContent = String(step);
      await wait(COUNTDOWN_STEP_MS);
    }

    if (token !== countdownToken) return;
    overlay.dataset.phase = "open";
    number.textContent = START_TEXT;
    await wait(COUNTDOWN_START_MS);
    overlay.classList.add("is-opening");
    await wait(COUNTDOWN_FADE_MS);
    if (token !== countdownToken) return;

    overlay.classList.add("hidden");
    overlay.classList.remove("is-opening");
    overlay.setAttribute("aria-hidden", "true");
    overlay.removeAttribute("role");
    delete overlay.dataset.phase;
    app?.classList.remove("is-opening-countdown");
    if (pauseButton) pauseButton.disabled = false;
    getApi()?.game?.resume?.();
  }

  function handleGameStart() {
    const api = getApi();
    if (!overlay || !api?.game) return;
    if (api.game.state.status === "running") api.game.pause();
    void runCountdown();
  }

  function handleConfirmHome(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingExitRoute = activeSubjectLobbyUrl("jars");
    if (exitDialog?.open) exitDialog.close("home");
    if (adDialog && !adDialog.open) adDialog.showModal();
    else if (!adDialog) location.href = pendingExitRoute;
  }

  function handleAdClose() {
    if (!pendingExitRoute) return;
    const route = pendingExitRoute;
    pendingExitRoute = null;
    location.href = route;
  }

  window.addEventListener("game:start", handleGameStart);
  confirmHomeButton?.addEventListener("click", handleConfirmHome, true);
  adDialog?.addEventListener("close", handleAdClose);
  document.documentElement.dataset.openingCountdownMs = String(COUNTDOWN_TOTAL_MS);

  mountedController = Object.freeze({
    destroy() {
      countdownToken += 1;
      window.removeEventListener("game:start", handleGameStart);
      confirmHomeButton?.removeEventListener("click", handleConfirmHome, true);
      adDialog?.removeEventListener("close", handleAdClose);
      mountedController = null;
    }
  });
  return mountedController;
}
