const MOBILE_QUERY = '(max-width: 900px), (pointer: coarse)';
const DIALOGUE_STYLE_ID = 'dialogue-above-kongjwi-style';
const DIALOGUE_STYLE_URL = new URL('../css/dialogue-above-kongjwi.css?v=20260818-dialogue-position1', import.meta.url).href;

function ensureDialoguePositionStylesheet() {
  if (document.getElementById(DIALOGUE_STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = DIALOGUE_STYLE_ID;
  link.rel = 'stylesheet';
  link.href = DIALOGUE_STYLE_URL;
  document.head.append(link);
}

export function mountStrictMobileQuizLayout() {
  const app = document.getElementById('ui-gameApp');
  const layout = app?.querySelector('.jar-game-layout');
  const scenePanel = app?.querySelector('.scene-panel');
  const sceneLayout = app?.querySelector('.scene-stage-layout');
  const questionZone = app?.querySelector('.scene-question-zone');
  const animationZone = app?.querySelector('.scene-animation-zone');
  if (!app || !layout || !scenePanel || !sceneLayout || !questionZone || !animationZone) return null;

  ensureDialoguePositionStylesheet();

  let slot = layout.querySelector('.strict-mobile-question-slot');
  if (!slot) {
    slot = document.createElement('section');
    slot.className = 'strict-mobile-question-slot';
    slot.setAttribute('aria-label', '현재 문제');
    slot.hidden = true;
    layout.insertBefore(slot, scenePanel);
  }

  const media = window.matchMedia(MOBILE_QUERY);

  const sync = () => {
    if (media.matches) {
      if (questionZone.parentElement !== slot) slot.append(questionZone);
      slot.hidden = false;
      app.dataset.strictQuizLayout = 'split';
      // The strict shared layout supersedes the former fossil-only mobile owner.
      delete app.dataset.fossilMobileLayout;
      return;
    }

    if (questionZone.parentElement === slot) {
      sceneLayout.insertBefore(questionZone, animationZone);
    }
    slot.hidden = true;
    delete app.dataset.strictQuizLayout;
  };

  sync();
  media.addEventListener?.('change', sync);
  media.addListener?.(sync);
  window.addEventListener('ui:device-mode', sync);

  return Object.freeze({
    destroy() {
      media.removeEventListener?.('change', sync);
      media.removeListener?.(sync);
      window.removeEventListener('ui:device-mode', sync);
      if (questionZone.parentElement === slot) {
        sceneLayout.insertBefore(questionZone, animationZone);
      }
      slot.remove();
      delete app.dataset.strictQuizLayout;
    }
  });
}

mountStrictMobileQuizLayout();
