export const QUIZ_FEEDBACK_CADENCE = Object.freeze({
  correct: 680,
  wrong: 680,
  timeout: 820
});

export function feedbackCadenceMs(kind) {
  return QUIZ_FEEDBACK_CADENCE[kind] ?? 0;
}

export class QuizCadenceController {
  constructor({
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = timer => globalThis.clearTimeout(timer)
  } = {}) {
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.timer = 0;
  }

  schedule(kind, callback) {
    this.cancel();
    const delay = feedbackCadenceMs(kind);
    this.timer = this.setTimer(() => {
      this.timer = 0;
      callback();
    }, delay);
    return delay;
  }

  cancel() {
    if (!this.timer) return;
    this.clearTimer(this.timer);
    this.timer = 0;
  }

  destroy() {
    this.cancel();
  }
}
