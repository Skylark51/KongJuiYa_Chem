import { mountHistoricalBgm } from "./historical-bgm.js";
import { safeLocalStorage } from "./safe-storage.js";

const localStorage = safeLocalStorage;

const AUDIO_SETTINGS_KEY = "kongjuiya-audio-settings";
const DEFAULT_SETTINGS = Object.freeze({
  bgmVolume: 0.62,
  sfxVolume: 0.78,
  mute: false
});
const BPM = 96;
const STEP = 60 / BPM / 2;
const LOOP_STEPS = 32;
const LOOK_AHEAD_SECONDS = 0.4;
const SCHEDULER_INTERVAL_MS = 80;

const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const normalize = raw => ({
  bgmVolume: clamp(raw?.bgmVolume ?? DEFAULT_SETTINGS.bgmVolume),
  sfxVolume: clamp(raw?.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
  mute: Boolean(raw?.mute)
});
const readSettings = () => {
  try {
    return normalize(JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) || "null"));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};
const saveSettings = next => {
  const merged = normalize({ ...readSettings(), ...next });
  localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent("kongjui:audio-settings", { detail: merged }));
  return merged;
};

let settings = readSettings();

// The quiz previously mounted the shared historical BGM from ui-effects.js.
// Stop that shared controller before the new training-only score starts so two
// soundtracks never play on top of each other.
const legacyBgm = mountHistoricalBgm({ initialVolume: 0 });
legacyBgm.destroy();
let context = null;
let master = null;
let musicBus = null;
let noiseBuffer = null;
let nextStepTime = 0;
let stepIndex = 0;
let schedulerId = 0;
let starting = null;
const removers = [];

function makeNoiseBuffer(audioContext, seconds = 1.1) {
  const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * seconds), audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 202608071;
  for (let index = 0; index < data.length; index += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[index] = seed / 2147483648 - 1;
  }
  return buffer;
}

function desiredGain() {
  if (settings.mute || settings.bgmVolume <= 0) return 0.0001;
  return Math.max(0.0001, 0.33 * settings.bgmVolume ** 1.24);
}

function panConnect(audioContext, source, destination, pan = 0) {
  if (typeof audioContext.createStereoPanner !== "function") {
    source.connect(destination);
    return;
  }
  const panner = audioContext.createStereoPanner();
  panner.pan.value = clamp(pan, -1, 1) * 0.8;
  source.connect(panner);
  panner.connect(destination);
}

function schedulePulse(when, strong = false) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  const click = context.createBufferSource();
  const clickFilter = context.createBiquadFilter();
  const clickGain = context.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(strong ? 112 : 96, when);
  osc.frequency.exponentialRampToValueAtTime(48, when + 0.14);
  gain.gain.setValueAtTime(strong ? 0.16 : 0.1, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  osc.connect(gain);
  gain.connect(musicBus);
  osc.start(when);
  osc.stop(when + 0.24);

  click.buffer = noiseBuffer;
  clickFilter.type = "bandpass";
  clickFilter.frequency.value = strong ? 980 : 860;
  clickFilter.Q.value = 0.7;
  clickGain.gain.setValueAtTime(strong ? 0.05 : 0.03, when);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
  click.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(gain);
  click.start(when, 0, 0.08);
}

function schedulePad(when, notes) {
  notes.forEach((midi, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    osc.type = index === 0 ? "triangle" : "sine";
    osc.frequency.value = frequency(midi);
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.045 : 0.03, when + 0.2);
    gain.gain.setValueAtTime(index === 0 ? 0.045 : 0.03, when + STEP * 3);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + STEP * 4);
    osc.connect(filter);
    filter.connect(gain);
    panConnect(context, gain, musicBus, -0.2 + index * 0.3);
    osc.start(when);
    osc.stop(when + STEP * 4 + 0.05);
  });
}

function scheduleLead(when, midi, length = 1, pan = 0.18) {
  const dur = Math.max(0.16, length * STEP);
  const osc = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const breath = context.createBufferSource();
  const breathFilter = context.createBiquadFilter();
  const breathGain = context.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(frequency(midi) * 0.99, when);
  osc.frequency.exponentialRampToValueAtTime(frequency(midi), when + 0.06);
  filter.type = "lowpass";
  filter.frequency.value = 2100;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.085, when + 0.03);
  gain.gain.setValueAtTime(0.07, when + Math.max(0.1, dur - 0.05));
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.12);
  osc.connect(filter);
  filter.connect(gain);
  panConnect(context, gain, musicBus, pan);
  osc.start(when);
  osc.stop(when + dur + 0.14);

  breath.buffer = noiseBuffer;
  breath.loop = true;
  breathFilter.type = "bandpass";
  breathFilter.frequency.value = 1800;
  breathGain.gain.setValueAtTime(0.0001, when);
  breathGain.gain.exponentialRampToValueAtTime(0.008, when + 0.04);
  breathGain.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.1);
  breath.connect(breathFilter);
  breathFilter.connect(breathGain);
  breathGain.connect(gain);
  breath.start(when);
  breath.stop(when + dur + 0.12);
}

function schedulePluck(when, midi, accent = 1, pan = -0.24) {
  const env = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1900;
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(0.085 * accent, when + 0.008);
  env.gain.exponentialRampToValueAtTime(0.016 * accent, when + 0.18);
  env.gain.exponentialRampToValueAtTime(0.0001, when + 0.52);
  env.connect(filter);
  panConnect(context, filter, musicBus, pan);

  [["triangle", 1, 0.9], ["sine", 2, 0.18], ["sine", 3, 0.08]].forEach(([type, multiple, level]) => {
    const osc = context.createOscillator();
    const partial = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency(midi) * multiple * 0.987, when);
    osc.frequency.exponentialRampToValueAtTime(frequency(midi) * multiple, when + 0.03);
    partial.gain.value = level;
    osc.connect(partial);
    partial.connect(env);
    osc.start(when);
    osc.stop(when + 0.54);
  });
}

const CHORDS = [
  [50, 57, 62], [48, 55, 60], [45, 52, 57], [47, 54, 59],
  [50, 57, 62], [48, 55, 60], [45, 52, 57], [53, 57, 60]
];
const PLUCK_LINE = [62, 65, 69, 72, 69, 65, 62, 65, 60, 64, 67, 71, 67, 64, 60, 64,
                    59, 62, 65, 69, 65, 62, 59, 62, 57, 60, 64, 67, 64, 60, 57, 60];
const LEAD = new Map([
  [0, [74, 2]], [3, [77, 1]], [4, [74, 2]], [7, [72, 1]],
  [8, [69, 2]], [11, [72, 1]], [12, [74, 2]], [15, [77, 1]],
  [16, [79, 2]], [19, [77, 1]], [20, [74, 2]], [23, [72, 1]],
  [24, [69, 2]], [27, [72, 1]], [28, [74, 2]], [31, [67, 1]]
]);

function scheduleStep(absoluteStep, when) {
  const loopStep = absoluteStep % LOOP_STEPS;
  const bar = Math.floor(loopStep / 4);
  const withinBar = loopStep % 4;

  schedulePluck(when, PLUCK_LINE[loopStep], withinBar === 0 ? 1 : 0.78, -0.26 + (loopStep % 3) * 0.12);
  if (withinBar === 0) {
    schedulePad(when, CHORDS[bar]);
    schedulePulse(when, bar % 2 === 0);
  } else if (withinBar === 2) {
    schedulePulse(when, false);
  }

  const phrase = LEAD.get(loopStep);
  if (phrase) scheduleLead(when, phrase[0], phrase[1], 0.16);
}

function scheduler() {
  if (!context || context.state === "closed") return;
  while (nextStepTime < context.currentTime + LOOK_AHEAD_SECONDS) {
    scheduleStep(stepIndex, nextStepTime);
    stepIndex = (stepIndex + 1) % LOOP_STEPS;
    nextStepTime += STEP;
  }
}

async function ensureStarted() {
  if (settings.mute || settings.bgmVolume <= 0) return false;
  if (context && context.state !== "closed") {
    await context.resume().catch(() => {});
    master?.gain.setTargetAtTime(desiredGain(), context.currentTime, 0.12);
    return true;
  }
  if (starting) return starting;

  starting = (async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    try {
      context = new AudioContextClass({ latencyHint: "playback" });
    } catch {
      context = new AudioContextClass();
    }
    master = context.createGain();
    musicBus = context.createGain();
    noiseBuffer = makeNoiseBuffer(context);

    const compressor = context.createDynamicsCompressor();
    const convolver = context.createConvolver();
    const wet = context.createGain();
    const dry = context.createGain();
    convolver.buffer = (() => {
      const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * 1.5), context.sampleRate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.55));
      }
      return impulse;
    })();
    wet.gain.value = 0.13;
    dry.gain.value = 0.94;
    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 2.4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.22;

    musicBus.connect(dry);
    musicBus.connect(convolver);
    convolver.connect(wet);
    dry.connect(compressor);
    wet.connect(compressor);
    compressor.connect(master);
    master.connect(context.destination);
    master.gain.setValueAtTime(0.0001, context.currentTime);

    await context.resume().catch(() => {});
    nextStepTime = context.currentTime + 0.04;
    scheduler();
    schedulerId = window.setInterval(scheduler, SCHEDULER_INTERVAL_MS);
    master.gain.exponentialRampToValueAtTime(desiredGain(), context.currentTime + 0.7);
    document.documentElement.dataset.bgm = "playing";
    return true;
  })().finally(() => {
    starting = null;
  });

  return starting;
}

function syncSettings(next) {
  settings = normalize(next || readSettings());
  if (master && context) {
    master.gain.setTargetAtTime(desiredGain(), context.currentTime, 0.12);
    if (settings.mute || settings.bgmVolume <= 0) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
  }
}

function ensureSettingsUi() {
  if (document.getElementById("audioSettingsButton")) return;
  const status = document.querySelector(".header-status");
  if (!status) return;

  const button = document.createElement("button");
  button.id = "audioSettingsButton";
  button.type = "button";
  button.className = "header-button header-audio-settings";
  button.setAttribute("aria-label", "오디오 설정");
  button.textContent = "⚙";

  const dialog = document.createElement("dialog");
  dialog.id = "audioSettingsDialog";
  dialog.className = "modal-card audio-settings-dialog";
  dialog.innerHTML = `
    <form method="dialog" class="audio-settings-form">
      <p class="eyebrow">AUDIO</p>
      <h2 id="audioSettingsTitle">오디오 설정</h2>
      <label class="audio-setting-row">
        <span>BGM 음량</span>
        <input id="bgmVolumeSetting" type="range" min="0" max="1" step="0.01" value="${settings.bgmVolume}">
      </label>
      <label class="audio-setting-row">
        <span>효과음 음량</span>
        <input id="sfxVolumeSetting" type="range" min="0" max="1" step="0.01" value="${settings.sfxVolume}">
      </label>
      <label class="audio-setting-toggle">
        <input id="muteAllAudioSetting" type="checkbox" ${settings.mute ? "checked" : ""}>
        <span>전체 음소거</span>
      </label>
      <div class="dialog-actions">
        <button class="primary-button" value="close">닫기</button>
      </div>
    </form>`;

  status.insertBefore(button, status.lastElementChild);
  document.body.append(dialog);

  const bgmInput = dialog.querySelector("#bgmVolumeSetting");
  const sfxInput = dialog.querySelector("#sfxVolumeSetting");
  const muteInput = dialog.querySelector("#muteAllAudioSetting");
  const apply = () => {
    const next = saveSettings({
      bgmVolume: bgmInput.value,
      sfxVolume: sfxInput.value,
      mute: muteInput.checked
    });
    syncSettings(next);
  };
  button.addEventListener("click", () => dialog.showModal());
  bgmInput.addEventListener("input", apply);
  sfxInput.addEventListener("input", apply);
  muteInput.addEventListener("change", apply);
}

ensureSettingsUi();
window.addEventListener("kongjui:audio-settings", event => syncSettings(event.detail));
window.addEventListener("storage", event => {
  if (event.key === AUDIO_SETTINGS_KEY) syncSettings(readSettings());
});
document.addEventListener("visibilitychange", () => {
  if (!context) return;
  if (document.hidden || settings.mute || settings.bgmVolume <= 0) context.suspend().catch(() => {});
  else context.resume().then(() => {
    nextStepTime = Math.max(nextStepTime, context.currentTime + 0.04);
    scheduler();
  }).catch(() => {});
});

["pointerdown", "touchstart", "keydown", "click"].forEach(type => {
  const handler = () => { void ensureStarted(); };
  document.addEventListener(type, handler, { capture: true, passive: true });
  removers.push(() => document.removeEventListener(type, handler, { capture: true }));
});

document.documentElement.dataset.bgm = "ready";
