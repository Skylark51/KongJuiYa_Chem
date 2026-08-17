const DESKTOP_QUERY = "(min-width: 1180px)";

function isChemistryPage() {
  const subject = document.documentElement.dataset.subject
    || new URLSearchParams(location.search).get("subject");
  return subject === "chemistry";
}

export function mountChemistryDesktopQuizLayout() {
  if (!isChemistryPage()) return null;

  const app = document.getElementById("ui-gameApp");
  const questionPanel = app?.querySelector(".question-panel");
  const sceneLayout = app?.querySelector(".scene-stage-layout");
  const questionZone = app?.querySelector(".scene-question-zone");
  const animationZone = app?.querySelector(".scene-animation-zone");
  if (!app || !questionPanel || !sceneLayout || !questionZone || !animationZone) return null;

  const slot = document.createElement("div");
  slot.className = "desktop-quiz-question-slot";
  slot.setAttribute("aria-label", "현재 문제");
  slot.hidden = true;
  questionPanel.prepend(slot);

  const media = window.matchMedia(DESKTOP_QUERY);
  const sync = () => {
    const split = media.matches;
    if (split) {
      if (questionZone.parentElement !== slot) slot.append(questionZone);
      slot.hidden = false;
      app.dataset.desktopQuizLayout = "split";
      return;
    }

    if (questionZone.parentElement !== sceneLayout) sceneLayout.insertBefore(questionZone, animationZone);
    slot.hidden = true;
    delete app.dataset.desktopQuizLayout;
  };

  sync();
  if (media.addEventListener) media.addEventListener("change", sync);
  else media.addListener?.(sync);

  return Object.freeze({
    destroy() {
      if (media.removeEventListener) media.removeEventListener("change", sync);
      else media.removeListener?.(sync);
      if (questionZone.parentElement !== sceneLayout) sceneLayout.insertBefore(questionZone, animationZone);
      slot.remove();
      delete app.dataset.desktopQuizLayout;
    }
  });
}

mountChemistryDesktopQuizLayout();
