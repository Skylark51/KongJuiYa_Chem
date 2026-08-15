import { safeSessionStorage } from "./safe-storage.js";

const sessionStorage = safeSessionStorage;
const BGM_POSITION_KEY = "kongjuiya-historical-bgm-position";
const BPM = 62;
const BEAT = 60 / BPM;
const STEP = BEAT / 2;
const LOOP_STEPS = 64;
const MAX_GAIN = 0.42;
const LOOK_AHEAD_SECONDS = 0.45;
const SCHEDULER_INTERVAL_MS = 80;

let sharedController = null;

const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : 0));

const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

function savedStep() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(BGM_POSITION_KEY) || "null");
    if (!saved || Date.now() - Number(saved.savedAt || 0) > 30 * 60 * 1000) return 0;
    return Math.floor(((Number(saved.step) || 0) % LOOP_STEPS + LOOP_STEPS) % LOOP_STEPS);
  } catch {
    return 0;
  }
}

function makeNoiseBuffer(context, seconds = 1.2) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 20260804;
  for (let index = 0; index < data.length; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[index] = seed / 2147483648 - 1;
  }
  return buffer;
}

function makeImpulse(context, seconds = 2.2) {
  const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * seconds), context.sampleRate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let seed = 81357 + channel * 71;
    for (let index = 0; index < data.length; index += 1) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const time = index / context.sampleRate;
      data[index] = (seed / 2147483648 - 1) * Math.exp(-time * 2.65);
    }
  }
  return buffer;
}

function connectWithPan(context, source, destination, pan = 0) {
  if (typeof context.createStereoPanner !== "function") {
    source.connect(destination);
    return;
  }
  const panner = context.createStereoPanner();
  panner.pan.value = clamp(pan, -1, 1);
  source.connect(panner);
  panner.connect(destination);
}

function schedulePad(context, destination, when, notes) {
  notes.forEach((midi, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency(midi);
    oscillator.detune.value = index === 0 ? -4 : index === 2 ? 4 : 0;
    filter.type = "lowpass";
    filter.frequency.value = 1150;
    filter.Q.value = 0.45;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.042 : 0.03, when + 0.9);
    gain.gain.setValueAtTime(index === 0 ? 0.042 : 0.03, when + BEAT * 3.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + BEAT * 4);
    oscillator.connect(filter);
    filter.connect(gain);
    connectWithPan(context, gain, destination, -0.38 + index * 0.38);
    oscillator.start(when);
    oscillator.stop(when + BEAT * 4 + 0.05);
  });
}

function scheduleGayageum(context, destination, noise, when, midi, accent = 1, pan = -0.25) {
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(6200, frequency(midi) * 15), when);
  filter.frequency.exponentialRampToValueAtTime(1100, when + 0.55);
  filter.Q.value = 1.35;
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(0.105 * accent, when + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.018 * accent, when + 0.32);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + 1.05);
  envelope.connect(filter);
  connectWithPan(context, filter, destination, pan);

  [["triangle", 1, 0.82], ["sine", 2, 0.34], ["sine", 3, 0.12]].forEach(([type, multiple, level]) => {
    const oscillator = context.createOscillator();
    const partial = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(midi) * multiple * 0.985, when);
    oscillator.frequency.exponentialRampToValueAtTime(frequency(midi) * multiple, when + 0.06);
    partial.gain.value = level;
    oscillator.connect(partial);
    partial.connect(envelope);
    oscillator.start(when);
    oscillator.stop(when + 1.08);
  });

  const pick = context.createBufferSource();
  const pickFilter = context.createBiquadFilter();
  const pickGain = context.createGain();
  pick.buffer = noise;
  pickFilter.type = "bandpass";
  pickFilter.frequency.value = Math.min(6500, frequency(midi) * 13);
  pickFilter.Q.value = 1.1;
  pickGain.gain.setValueAtTime(0.055 * accent, when);
  pickGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
  pick.connect(pickFilter);
  pickFilter.connect(pickGain);
  pickGain.connect(envelope);
  pick.start(when, 0, 0.08);
}

function scheduleDaegeum(context, destination, noise, when, midi, durationSteps, pan = 0.22) {
  const duration = Math.max(STEP * 0.8, durationSteps * STEP);
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3900;
  filter.Q.value = 0.65;
  envelope.gain.setValueAtTime(0.0001, when);
  envelope.gain.exponentialRampToValueAtTime(0.092, when + 0.15);
  envelope.gain.setValueAtTime(0.092, when + Math.max(0.2, duration - 0.28));
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.26);
  envelope.connect(filter);
  connectWithPan(context, filter, destination, pan);

  const vibrato = context.createOscillator();
  const vibratoGain = context.createGain();
  vibrato.frequency.value = 5.1;
  vibratoGain.gain.setValueAtTime(0, when);
  vibratoGain.gain.linearRampToValueAtTime(7, when + 0.42);
  vibrato.connect(vibratoGain);

  [["sine", 1, 0.9], ["sine", 2, 0.17], ["triangle", 3, 0.045]].forEach(([type, multiple, level], index) => {
    const oscillator = context.createOscillator();
    const partial = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(midi) * multiple * (index ? 1 : 0.985), when);
    oscillator.frequency.exponentialRampToValueAtTime(frequency(midi) * multiple, when + 0.12);
    partial.gain.value = level;
    vibratoGain.connect(oscillator.detune);
    oscillator.connect(partial);
    partial.connect(envelope);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.3);
  });
  vibrato.start(when);
  vibrato.stop(when + duration + 0.3);

  const breath = context.createBufferSource();
  const breathFilter = context.createBiquadFilter();
  const breathGain = context.createGain();
  breath.buffer = noise;
  breath.loop = true;
  breathFilter.type = "bandpass";
  breathFilter.frequency.value = 2100;
  breathFilter.Q.value = 0.65;
  breathGain.gain.setValueAtTime(0.0001, when);
  breathGain.gain.exponentialRampToValueAtTime(0.014, when + 0.16);
  breathGain.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.25);
  breath.connect(breathFilter);
  breathFilter.connect(breathGain);
  breathGain.connect(filter);
  breath.start(when);
  breath.stop(when + duration + 0.3);
}

function scheduleDrum(context, destination, noise, when, strong = false) {
  const envelope = context.createGain();
  const oscillator = context.createOscillator();
  const impact = context.createBufferSource();
  const impactFilter = context.createBiquadFilter();
  const impactGain = context.createGain();
  const peak = strong ? 0.16 : 0.105;

  envelope.gain.setValueAtTime(peak, when);
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.62);
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(strong ? 120 : 102, when);
  oscillator.frequency.exponentialRampToValueAtTime(52, when + 0.1);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(when);
  oscillator.stop(when + 0.65);

  impact.buffer = noise;
  impactFilter.type = "lowpass";
  impactFilter.frequency.value = 820;
  impactGain.gain.setValueAtTime(strong ? 0.058 : 0.037, when);
  impactGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);
  impact.connect(impactFilter);
  impactFilter.connect(impactGain);
  impactGain.connect(envelope);
  impact.start(when, 0, 0.1);
}

function createController(initialVolume = 0.8) {
  let context = null;
  let master = null;
  let musicBus = null;
  let noise = null;
  let timer = 0;
  let nextStepTime = 0;
  let stepIndex = savedStep();
  let volume = clamp(initialVolume);
  let starting = null;
  let destroyed = false;
  const removers = [];

  const gayageum = [
    57, 64, 69, 72, 69, 64, 60, 64,
    55, 62, 67, 69, 67, 62, 59, 62,
    53, 60, 65, 69, 65, 60, 57, 60,
    52, 59, 64, 67, 64, 59, 55, 59,
    57, 64, 69, 72, 69, 64, 60, 64,
    55, 62, 67, 69, 71, 67, 62, 59,
    53, 60, 65, 69, 72, 69, 65, 60,
    57, 64, 69, 72, 69, 64, 60, 57
  ];
  const chords = [
    [45, 52, 57], [43, 50, 55], [41, 48, 53], [40, 47, 52],
    [45, 52, 57], [43, 50, 55], [41, 48, 53], [45, 52, 57]
  ];
  const melody = new Map([
    [0, [69, 4]], [4, [64, 4]], [8, [62, 3]], [11, [64, 1]], [12, [67, 2]], [14, [69, 2]],
    [16, [72, 4]], [20, [69, 2]], [22, [67, 2]], [24, [64, 4]], [28, [62, 2]], [30, [60, 2]],
    [32, [69, 3]], [35, [67, 1]], [36, [64, 4]], [40, [62, 2]], [42, [64, 2]], [44, [67, 4]],
    [48, [69, 2]], [50, [72, 2]], [52, [69, 2]], [54, [67, 2]], [56, [64, 3]], [59, [62, 1]], [60, [60, 2]], [62, [57, 2]]
  ]);

  const desiredGain = () => Math.max(0.0001, MAX_GAIN * volume ** 1.35);

  const savePosition = () => {
    try {
      const fractional = context && nextStepTime
        ? stepIndex - Math.max(0, nextStepTime - context.currentTime) / STEP
        : stepIndex;
      sessionStorage.setItem(BGM_POSITION_KEY, JSON.stringify({
        step: ((fractional % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS,
        savedAt: Date.now()
      }));
    } catch {
      // Continuity is optional when session storage is unavailable.
    }
  };

  const scheduleStep = (absoluteStep, when) => {
    const loopStep = absoluteStep % LOOP_STEPS;
    const bar = Math.floor(loopStep / 8);
    const withinBar = loopStep % 8;

    scheduleGayageum(
      context,
      musicBus,
      noise,
      when,
      gayageum[loopStep],
      withinBar === 0 || withinBar === 4 ? 1 : 0.74,
      -0.3 + ((loopStep % 3) - 1) * 0.055
    );

    if (withinBar === 0) {
      schedulePad(context, musicBus, when, chords[bar]);
      scheduleDrum(context, musicBus, noise, when, bar === 0 || bar === 4);
    } else if (withinBar === 4 && bar % 2 === 1) {
      scheduleDrum(context, musicBus, noise, when, false);
    }

    const phrase = melody.get(loopStep);
    if (phrase) scheduleDaegeum(context, musicBus, noise, when, phrase[0], phrase[1], 0.2);
  };

  const scheduler = () => {
    if (!context || context.state === "closed") return;
    while (nextStepTime < context.currentTime + LOOK_AHEAD_SECONDS) {
      scheduleStep(stepIndex, nextStepTime);
      stepIndex = (stepIndex + 1) % LOOP_STEPS;
      nextStepTime += STEP;
    }
  };

  const removeUnlockListeners = () => {
    while (removers.length && removers[removers.length - 1].unlock) {
      removers.pop().remove();
    }
  };

  const ensureStarted = () => {
    if (destroyed || volume <= 0) return Promise.resolve(false);
    if (context && context.state !== "closed") {
      return context.resume().then(() => true).catch(() => false);
    }
    if (starting) return starting;

    starting = (async () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio API is unavailable.");

      try {
        context = new AudioContextClass({ latencyHint: "playback" });
      } catch {
        context = new AudioContextClass();
      }

      master = context.createGain();
      musicBus = context.createGain();
      noise = makeNoiseBuffer(context);
      const compressor = context.createDynamicsCompressor();
      const convolver = context.createConvolver();
      const wet = context.createGain();
      const dry = context.createGain();

      convolver.buffer = makeImpulse(context);
      wet.gain.value = 0.2;
      dry.gain.value = 0.94;
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 2.2;
      compressor.attack.value = 0.015;
      compressor.release.value = 0.28;

      musicBus.connect(dry);
      musicBus.connect(convolver);
      convolver.connect(wet);
      dry.connect(compressor);
      wet.connect(compressor);
      compressor.connect(master);
      master.connect(context.destination);
      master.gain.setValueAtTime(0.0001, context.currentTime);

      await context.resume();
      nextStepTime = context.currentTime + 0.035;
      scheduler();
      timer = window.setInterval(scheduler, SCHEDULER_INTERVAL_MS);
      master.gain.exponentialRampToValueAtTime(desiredGain(), context.currentTime + 0.65);
      document.documentElement.dataset.bgm = "playing";
      removeUnlockListeners();
      return true;
    })().catch(error => {
      console.warn("Historical BGM could not start.", error);
      document.documentElement.dataset.bgm = "blocked";
      if (timer) clearInterval(timer);
      timer = 0;
      context?.close().catch(() => {});
      context = null;
      starting = null;
      return false;
    });

    return starting;
  };

  const setVolume = value => {
    volume = clamp(value);
    if (master && context) {
      master.gain.setTargetAtTime(desiredGain(), context.currentTime, 0.1);
    }
    if (volume > 0 && !context) ensureStarted();
  };

  const unlockEvents = ["pointerdown", "touchstart", "click", "keydown"];
  unlockEvents.forEach(type => {
    const handler = () => { ensureStarted(); };
    document.addEventListener(type, handler, { capture: true, passive: true });
    removers.push({
      unlock: true,
      remove: () => document.removeEventListener(type, handler, { capture: true })
    });
  });

  const volumeInput = document.getElementById("volumeSetting");
  if (volumeInput) {
    const syncVolume = event => setVolume(event.currentTarget.value);
    volumeInput.addEventListener("input", syncVolume);
    volumeInput.addEventListener("change", syncVolume);
    removers.unshift({ unlock: false, remove: () => volumeInput.removeEventListener("input", syncVolume) });
    removers.unshift({ unlock: false, remove: () => volumeInput.removeEventListener("change", syncVolume) });
  }

  const handleVisibility = () => {
    if (!context) return;
    if (document.hidden) {
      savePosition();
      context.suspend().catch(() => {});
    } else if (volume > 0) {
      context.resume().then(() => {
        nextStepTime = Math.max(nextStepTime, context.currentTime + 0.035);
        scheduler();
      }).catch(() => {});
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);
  removers.unshift({ unlock: false, remove: () => document.removeEventListener("visibilitychange", handleVisibility) });

  const handlePageHide = () => savePosition();
  window.addEventListener("pagehide", handlePageHide);
  removers.unshift({ unlock: false, remove: () => window.removeEventListener("pagehide", handlePageHide) });

  document.documentElement.dataset.bgm = "ready";

  return {
    ensureStarted,
    setVolume,
    get volume() { return volume; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      savePosition();
      if (timer) clearInterval(timer);
      removers.splice(0).forEach(entry => entry.remove());
      context?.close().catch(() => {});
      context = null;
      document.documentElement.dataset.bgm = "stopped";
      if (sharedController === this) sharedController = null;
    }
  };
}

export function mountHistoricalBgm({ initialVolume = 0.8 } = {}) {
  if (sharedController) {
    sharedController.setVolume(initialVolume);
    return sharedController;
  }
  sharedController = createController(initialVolume);
  return sharedController;
}
