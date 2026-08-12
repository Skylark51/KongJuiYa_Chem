import { isCourtServantMode, playCourtServantPour, resetCourtServantPour } from "./court-servant-effect.js";

const EVENT_TARGET = globalThis;
const TRANSIENT_FEEDBACK_STATES = new Set(["correct", "wrong", "timeout"]);
export const SCENE_FEEDBACK_DURATION_MS = Object.freeze({
  correct: 1400,
  wrong: 680,
  timeout: 820
});
const POUR_CHARACTER_FRAMES = [2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6];
const POUR_STREAM_FRAMES = [1, 2, 3, 4, 5, 6, 7];
const POUR_SPLASH_FRAMES = [1, 2, 3, 4, 5];
const LEAK_FRAMES = [0, 1, 2, 3, 4, 5, 6, 7];

const EVENT_TO_STATE = Object.freeze({
  "game:start": "idle",
  "question:changed": "question",
  "answer:correct": "correct",
  "answer:wrong": "wrong",
  "answer:timeout": "timeout",
  "water:warning": "warning",
  "water:critical": "critical",
  "fever:start": "fever",
  "game:clear": "clear",
  "game:over": "over",
  "game:pause": "pause",
  "game:resume": "resume"
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function reducedMotionRequested() {
  return Boolean(
    document.documentElement.classList.contains("reduce-motion") ||
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}

export class LayeredSceneStateController {
  constructor(renderer, manifest) {
    this.renderer = renderer;
    this.manifest = manifest;
    this.state = "idle";
    this.wrongStreak = 0;
    this.disposed = false;
    this.animationToken = 0;
    this.timers = new Set();
    this.removers = [];
    this.bindEvents();
    this.apply("idle");
  }

  bindEvents() {
    for (const [eventName, state] of Object.entries(EVENT_TO_STATE)) {
      const handler = event => {
        const detail = event?.detail || {};
        if (eventName === "question:changed" && TRANSIENT_FEEDBACK_STATES.has(this.state)) {
          this.syncWater(detail);
          return;
        }
        this.apply(state, detail);
      };
      EVENT_TARGET.addEventListener(eventName, handler);
      this.removers.push(() => EVENT_TARGET.removeEventListener(eventName, handler));
    }

    for (const eventName of ["water:changed", "water:change", "game:tick"]) {
      const handler = event => this.syncWater(event?.detail || {});
      EVENT_TARGET.addEventListener(eventName, handler);
      this.removers.push(() => EVENT_TARGET.removeEventListener(eventName, handler));
    }
  }

  syncWater(detail = {}) {
    const value =
      detail.water ??
      detail.waterLevel ??
      detail.state?.water ??
      detail.gameState?.water;
    if (Number.isFinite(Number(value))) this.renderer.setWaterLevel(clamp(value, 0, 100));
  }

  clearTimers() {
    for (const timer of this.timers) globalThis.clearTimeout(timer);
    this.timers.clear();
    this.animationToken += 1;
  }

  schedule(callback, delay) {
    const timer = globalThis.setTimeout(() => {
      this.timers.delete(timer);
      if (!this.disposed) callback();
    }, Math.max(0, delay));
    this.timers.add(timer);
    return timer;
  }

  playSequence(layerName, frames, duration, { loop = false, hold = false, delay = 0 } = {}) {
    if (!Array.isArray(frames) || !frames.length) return;
    const reduced = reducedMotionRequested();
    if (reduced || frames.length === 1) {
      this.schedule(() => this.renderer.setFrame(layerName, frames.at(-1)), delay);
      return;
    }

    const token = this.animationToken;
    const interval = Math.max(32, duration / frames.length);
    frames.forEach((frame, index) => {
      this.schedule(() => {
        if (token !== this.animationToken) return;
        this.renderer.setFrame(layerName, frame);
      }, delay + index * interval);
    });

    if (loop) {
      this.schedule(() => {
        if (token !== this.animationToken) return;
        this.playSequence(layerName, frames, duration, { loop: true, hold, delay: 0 });
      }, delay + duration);
    } else if (!hold) {
      this.schedule(() => {
        if (token !== this.animationToken) return;
        this.renderer.setFrame(layerName, 0);
      }, delay + duration + 16);
    }
  }

  startLeakLoop({ energetic = false } = {}) {
    const sequence = this.manifest.frames?.sequences?.leak || LEAK_FRAMES;
    this.playSequence("waterLeak", sequence, energetic ? 760 : 1120, { loop: true, hold: true });
  }

  playCorrectFeedback(detail = {}, { hold = false } = {}) {
    const sequences = this.manifest.frames?.sequences || {};
    const plan = sequences.answerCorrect || {};
    const courtMode = isCourtServantMode();

    this.renderer.setFlowPhase("prepare");
    this.schedule(() => this.renderer.setFlowPhase("pour"), 400);
    this.schedule(() => this.renderer.setFlowPhase("settle"), 1040);
    if (!hold) this.schedule(() => this.renderer.setFlowPhase("idle"), 1320);

    if (courtMode) {
      playCourtServantPour();
      this.playSequence(
        "kongjwi",
        plan.nightCourtKongjwiTimeline || plan.kongjwiTimeline || POUR_CHARACTER_FRAMES,
        1320,
        { hold }
      );
      this.renderer.setFrame("tool", 0);
      this.playSequence("waterStream", plan.waterStream || POUR_STREAM_FRAMES, 650, { delay: 410, hold });
      this.playSequence("waterSplash", plan.waterSplash || POUR_SPLASH_FRAMES, 520, { delay: 540, hold });
      this.startLeakLoop({ energetic: true });
      return;
    }

    resetCourtServantPour();
    this.playSequence("kongjwi", plan.kongjwiTimeline || POUR_CHARACTER_FRAMES, 1320, { hold });
    this.playSequence("tool", plan.toolTimeline || POUR_CHARACTER_FRAMES, 1320, { hold });
    this.playSequence("waterStream", plan.waterStream || POUR_STREAM_FRAMES, 650, { delay: 410, hold });
    this.playSequence("waterSplash", plan.waterSplash || POUR_SPLASH_FRAMES, 520, { delay: 540, hold });
    this.startLeakLoop({ energetic: true });
  }

  apply(nextState, detail = {}) {
    if (this.disposed) return;
    this.clearTimers();
    this.state = nextState;
    this.renderer.setState(nextState);
    this.renderer.setFlowPhase("idle");
    this.syncWater(detail);

    const sequences = this.manifest.frames?.sequences || {};
    switch (nextState) {
      case "idle":
      case "resume":
        resetCourtServantPour();
        this.wrongStreak = 0;
        this.renderer.setExpression("default");
        this.playSequence("kongjwi", sequences.idle?.kongjwi || [0, 1, 0], 1800, { loop: true });
        this.playSequence("tool", [0, 1, 0], 1800, { loop: true });
        this.startLeakLoop();
        break;

      case "question":
        resetCourtServantPour();
        this.renderer.setExpression("idle-blink");
        this.playSequence("kongjwi", [0, 1, 0], 620);
        this.playSequence("tool", [0, 1, 0], 620);
        this.startLeakLoop();
        this.schedule(() => this.renderer.setExpression("default"), 680);
        break;

      case "correct": {
        this.wrongStreak = 0;
        const combo = Number(detail.combo || detail.streak || 0);
        this.renderer.setExpression(combo >= 3 ? "combo" : "correct");
        this.playCorrectFeedback(detail);
        this.schedule(() => this.apply("question"), SCENE_FEEDBACK_DURATION_MS.correct);
        break;
      }

      case "wrong":
        resetCourtServantPour();
        this.wrongStreak += 1;
        this.renderer.setExpression(
          this.wrongStreak >= 3 ? "rage" : this.wrongStreak === 2 ? "angry" : "wrong"
        );
        this.playSequence("kongjwi", sequences.answerWrong?.kongjwi || [7], 560, { hold: true });
        this.playSequence("tool", [7], 560, { hold: true });
        this.startLeakLoop({ energetic: true });
        this.schedule(() => this.apply("question"), SCENE_FEEDBACK_DURATION_MS.wrong);
        break;

      case "timeout":
        resetCourtServantPour();
        this.wrongStreak += 1;
        this.renderer.setExpression("timeout");
        this.playSequence("kongjwi", [7], 700, { hold: true });
        this.playSequence("tool", [7], 700, { hold: true });
        this.startLeakLoop({ energetic: true });
        this.schedule(() => this.apply("question"), SCENE_FEEDBACK_DURATION_MS.timeout);
        break;

      case "warning":
        this.renderer.setExpression("confused");
        this.startLeakLoop({ energetic: true });
        break;

      case "critical":
        this.renderer.setExpression(this.wrongStreak >= 2 ? "rage" : "angry");
        this.startLeakLoop({ energetic: true });
        break;

      case "fever":
        this.wrongStreak = 0;
        this.renderer.setExpression("combo");
        this.startLeakLoop({ energetic: true });
        break;

      case "clear": {
        this.wrongStreak = 0;
        this.renderer.setWaterLevel(100);
        this.renderer.setExpression(Number(detail.combo || 0) >= 3 ? "combo" : "correct");
        this.playCorrectFeedback(detail, { hold: true });
        break;
      }

      case "over":
        resetCourtServantPour();
        this.renderer.setExpression(detail.reason === "timeout" ? "timeout" : "wrong");
        this.playSequence("kongjwi", [7], 700, { hold: true });
        this.playSequence("tool", [7], 700, { hold: true });
        this.startLeakLoop({ energetic: true });
        break;

      case "pause":
        resetCourtServantPour();
        this.renderer.setFlowPhase("paused");
        this.renderer.setExpression("idle-blink");
        this.renderer.setFrame("kongjwi", 1);
        this.renderer.setFrame("tool", 1);
        break;

      default:
        resetCourtServantPour();
        this.renderer.setExpression("default");
        this.startLeakLoop();
        break;
    }
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    resetCourtServantPour();
    this.clearTimers();
    this.removers.splice(0).forEach(remove => remove());
  }
}

export function createSceneStateController(renderer, manifest) {
  return new LayeredSceneStateController(renderer, manifest);
}
