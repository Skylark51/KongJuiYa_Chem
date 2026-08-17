const DESKTOP_QUERY = '(min-width: 1180px)';

function isEarthSciencePage() {
  const subject = document.documentElement.dataset.subject
    || new URLSearchParams(location.search).get('subject')
    || '';
  return subject === 'earth-science';
}

export function mountEarthScienceDesktopQuizLayout() {
  if (!isEarthSciencePage()) return null;

  const app = document.getElementById('ui-gameApp');
  const questionPanel = app?.querySelector('.question-panel');
  const sceneLayout = app?.querySelector('.scene-stage-layout');
  const questionZone = app?.querySelector('.scene-question-zone');
  const animationZone = app?.querySelector('.scene-animation-zone');
  if (!app || !questionPanel || !sceneLayout || !questionZone || !animationZone) return null;

  const slot = document.createElement('div');
  slot.className = 'desktop-quiz-question-slot';
  slot.setAttribute('aria-label', '현재 문제');
  slot.hidden = true;
  questionPanel.prepend(slot);

  const media = window.matchMedia(DESKTOP_QUERY);
  const sync = () => {
    if (media.matches) {
      if (questionZone.parentElement !== slot) slot.append(questionZone);
      slot.hidden = false;
      app.dataset.desktopQuizLayout = 'split';
      return;
    }

    if (questionZone.parentElement !== sceneLayout) sceneLayout.insertBefore(questionZone, animationZone);
    slot.hidden = true;
    delete app.dataset.desktopQuizLayout;
  };

  sync();
  media.addEventListener?.('change', sync);
  media.addListener?.(sync);

  return Object.freeze({
    destroy() {
      media.removeEventListener?.('change', sync);
      media.removeListener?.(sync);
      if (questionZone.parentElement !== sceneLayout) sceneLayout.insertBefore(questionZone, animationZone);
      slot.remove();
      delete app.dataset.desktopQuizLayout;
    }
  });
}

mountEarthScienceDesktopQuizLayout();
