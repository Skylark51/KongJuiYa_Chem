const DESKTOP_QUERY = '(min-width: 1180px)';
const FOSSIL_TYPE_TRAINING_ID = 'earth-fossil-type';

function isEarthSciencePage() {
  const subject = document.documentElement.dataset.subject
    || new URLSearchParams(location.search).get('subject')
    || '';
  return subject === 'earth-science';
}

function isFossilTypeTraining(app) {
  const trainingId = app?.dataset.trainingId
    || new URLSearchParams(location.search).get('training')
    || '';
  return trainingId === FOSSIL_TYPE_TRAINING_ID;
}

export function mountEarthScienceDesktopQuizLayout() {
  if (!isEarthSciencePage()) return null;

  const app = document.getElementById('ui-gameApp');
  const layout = app?.querySelector('.jar-game-layout');
  const questionPanel = app?.querySelector('.question-panel');
  const scenePanel = app?.querySelector('.scene-panel');
  const sceneLayout = app?.querySelector('.scene-stage-layout');
  const questionZone = app?.querySelector('.scene-question-zone');
  const animationZone = app?.querySelector('.scene-animation-zone');
  if (!app || !layout || !questionPanel || !scenePanel || !sceneLayout || !questionZone || !animationZone) return null;

  const desktopSlot = document.createElement('div');
  desktopSlot.className = 'desktop-quiz-question-slot';
  desktopSlot.setAttribute('aria-label', '현재 문제');
  desktopSlot.hidden = true;
  questionPanel.prepend(desktopSlot);

  const fossilMobileSlot = document.createElement('div');
  fossilMobileSlot.className = 'fossil-mobile-question-slot';
  fossilMobileSlot.setAttribute('aria-label', '현재 화석 문제');
  fossilMobileSlot.hidden = true;
  layout.insertBefore(fossilMobileSlot, scenePanel);

  const media = window.matchMedia(DESKTOP_QUERY);
  const sync = () => {
    const desktop = media.matches;
    const fossilMobile = !desktop && isFossilTypeTraining(app);

    if (desktop) {
      if (questionZone.parentElement !== desktopSlot) desktopSlot.append(questionZone);
      desktopSlot.hidden = false;
      fossilMobileSlot.hidden = true;
      app.dataset.desktopQuizLayout = 'split';
      delete app.dataset.fossilMobileLayout;
      return;
    }

    if (fossilMobile) {
      if (questionZone.parentElement !== fossilMobileSlot) fossilMobileSlot.append(questionZone);
      desktopSlot.hidden = true;
      fossilMobileSlot.hidden = false;
      delete app.dataset.desktopQuizLayout;
      app.dataset.fossilMobileLayout = 'split';
      return;
    }

    if (questionZone.parentElement !== sceneLayout) sceneLayout.insertBefore(questionZone, animationZone);
    desktopSlot.hidden = true;
    fossilMobileSlot.hidden = true;
    delete app.dataset.desktopQuizLayout;
    delete app.dataset.fossilMobileLayout;
  };

  sync();
  media.addEventListener?.('change', sync);
  media.addListener?.(sync);

  return Object.freeze({
    destroy() {
      media.removeEventListener?.('change', sync);
      media.removeListener?.(sync);
      if (questionZone.parentElement !== sceneLayout) sceneLayout.insertBefore(questionZone, animationZone);
      desktopSlot.remove();
      fossilMobileSlot.remove();
      delete app.dataset.desktopQuizLayout;
      delete app.dataset.fossilMobileLayout;
    }
  });
}

mountEarthScienceDesktopQuizLayout();
