import { defaultUpgradeLevels } from "../../data/upgrades.js";
import { safeLocalStorage } from "./safe-storage.js";

export const STORAGE_KEY = "kongjuiya-chem-save";
export const STORAGE_VERSION = 5;
export const FAST_ANSWER_MS = 2000;
export const MAX_PLAY_DATES = 365;
export const DAILY_MISSION_DEFINITIONS = Object.freeze([
  Object.freeze({ type: "correct_answers", target: 10, rewardBeans: 30 }),
  Object.freeze({ type: "fever_starts", target: 2, rewardBeans: 35 }),
  Object.freeze({ type: "combo_5", target: 1, rewardBeans: 25 }),
  Object.freeze({ type: "training_complete", target: 1, rewardBeans: 40 }),
  Object.freeze({ type: "fast_answers", target: 5, rewardBeans: 30 }),
  Object.freeze({ type: "water_full", target: 1, rewardBeans: 35 })
]);

const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const nonNegative = value => Math.max(0, number(value));
const difficultyKeys = ["easy", "normal", "hard"];

const emptyMode = () => ({
  plays: 0, correct: 0, wrong: 0, timeout: 0, bestScore: 0, bestCombo: 0,
  bestFeverCount: 0, bestFeverTier: 0, beansEarned: 0, spoonHits: 0, criticalHits: 0,
  averageResponseMs: 0, bestResponseMs: 0, responseCount: 0, lastPlayedAt: null,
  playDates: [], byDifficulty: {}, weakQuestions: {}
});
const emptyActions = () => ({
  criticalHits: 0, spoonHits: 0, bucketSmashes: 0, lidDrops: 0, waterCannons: 0,
  comboFinishers: 0, toadHits: 0, waterPours: 0
});
const defaults = () => ({
  version: STORAGE_VERSION,
  settings: { volume: 0.8, animations: true, difficulty: "normal", deviceMode: "auto" },
  statistics: {},
  overall: { totalPlays: 0, bestCombo: 0, totalBeansEarned: 0, totalBeansSpent: 0, toadHits: 0, waterPours: 0 },
  economy: { beans: 0, lifetimeBeans: 0, spentBeans: 0 },
  upgrades: defaultUpgradeLevels(),
  actionStatistics: emptyActions(),
  feverTierRecord: 0,
  recentRuns: [],
  currentRun: null,
  dailyMission: null
});

const normalizeMode = value => {
  const base = emptyMode();
  const source = object(value);
  const byDifficulty = Object.fromEntries(Object.entries(object(source.byDifficulty)).map(([difficulty, stats]) => [difficulty, {
    plays: nonNegative(stats?.plays), bestScore: nonNegative(stats?.bestScore),
    correct: nonNegative(stats?.correct), wrong: nonNegative(stats?.wrong)
  }]));
  return {
    ...base, ...source,
    plays: nonNegative(source.plays), correct: nonNegative(source.correct), wrong: nonNegative(source.wrong),
    timeout: nonNegative(source.timeout), bestScore: nonNegative(source.bestScore),
    bestCombo: nonNegative(source.bestCombo), bestFeverCount: nonNegative(source.bestFeverCount),
    bestFeverTier: nonNegative(source.bestFeverTier), beansEarned: nonNegative(source.beansEarned),
    spoonHits: nonNegative(source.spoonHits), criticalHits: nonNegative(source.criticalHits),
    averageResponseMs: nonNegative(source.averageResponseMs), bestResponseMs: nonNegative(source.bestResponseMs),
    responseCount: nonNegative(source.responseCount),
    lastPlayedAt: typeof source.lastPlayedAt === "string" ? source.lastPlayedAt : null,
    playDates: Array.isArray(source.playDates)
      ? source.playDates.filter(value => typeof value === "string" && value).slice(0, MAX_PLAY_DATES)
      : [],
    byDifficulty, weakQuestions: object(source.weakQuestions)
  };
};

const dayKey = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
};
const definitionFor = type => DAILY_MISSION_DEFINITIONS.find(item => item.type === type) || null;
const missionIndexFor = date => {
  let hash = 0;
  for (const character of String(date)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % DAILY_MISSION_DEFINITIONS.length;
};
export const createDailyMission = (date = new Date()) => {
  const key = dayKey(date);
  const definition = DAILY_MISSION_DEFINITIONS[missionIndexFor(key)];
  return { date: key, type: definition.type, target: definition.target, progress: 0, rewardBeans: definition.rewardBeans, claimed: false };
};
const normalizeDailyMission = value => {
  const source = object(value);
  const definition = definitionFor(source.type);
  if (!definition || !/^\d{4}-\d{2}-\d{2}$/.test(String(source.date || ""))) return null;
  const target = Math.max(1, Math.floor(number(source.target || definition.target)));
  return {
    date: source.date, type: definition.type, target,
    progress: Math.min(target, Math.max(0, Math.floor(number(source.progress)))),
    rewardBeans: Math.max(0, Math.floor(number(source.rewardBeans || definition.rewardBeans))),
    claimed: Boolean(source.claimed)
  };
};
export function describeDailyMission(mission) {
  if (!mission) return "오늘의 미션을 준비하고 있습니다.";
  const descriptions = {
    correct_answers: "문제 " + mission.target + "개 정답",
    fever_starts: "피버 " + mission.target + "회 발동",
    combo_5: "콤보 5 달성",
    training_complete: "장독대 1회 완료",
    fast_answers: String(FAST_ANSWER_MS / 1000) + "초 이내 정답 " + mission.target + "개",
    water_full: "물 100% 도달"
  };
  return descriptions[mission.type] || "오늘의 미션";
}

export function migrateSave(value) {
  const base = defaults();
  const source = object(value);
  if (!Object.keys(source).length) return base;
  const statistics = {};
  if (source.version === 1) {
    const legacy = object(source.statistics);
    statistics.legacy = normalizeMode({
      plays: legacy.plays, correct: legacy.correct, wrong: legacy.wrong,
      timeout: legacy.timeout, bestScore: source.profile?.bestScore
    });
  } else {
    for (const [id, stats] of Object.entries(object(source.statistics))) statistics[id] = normalizeMode(stats);
  }
  const settings = object(source.settings);
  const economy = object(source.economy);
  const overall = object(source.overall);
  const deviceMode = ["auto", "desktop", "mobile"].includes(settings.deviceMode) ? settings.deviceMode : "auto";
  const difficulty = difficultyKeys.includes(settings.difficulty) ? settings.difficulty : base.settings.difficulty;
  return {
    ...base, ...source, version: STORAGE_VERSION,
    settings: { ...base.settings, ...settings, deviceMode, difficulty },
    statistics,
    economy: { beans: nonNegative(economy.beans), lifetimeBeans: nonNegative(economy.lifetimeBeans), spentBeans: nonNegative(economy.spentBeans) },
    upgrades: { ...base.upgrades, ...object(source.upgrades) },
    actionStatistics: { ...base.actionStatistics, ...object(source.actionStatistics) },
    overall: { ...base.overall, ...overall },
    feverTierRecord: nonNegative(source.feverTierRecord),
    recentRuns: Array.isArray(source.recentRuns) ? source.recentRuns.slice(0, 20) : [],
    currentRun: object(source.currentRun).trainingId ? { ...source.currentRun } : null,
    dailyMission: normalizeDailyMission(source.dailyMission)
  };
}

export class GameStorage {
  constructor(storage = safeLocalStorage, clock = () => new Date()) {
    this.storage = storage;
    this.clock = clock;
    this.lastPersistOk = true;
    this.data = this.load();
  }

  load() {
    try {
      const data = migrateSave(JSON.parse(this.storage?.getItem(STORAGE_KEY) || "null"));
      this.persist(data);
      return data;
    } catch {
      const data = defaults();
      this.persist(data);
      return data;
    }
  }

  persist(data = this.data) {
    this.data = migrateSave(data);
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.lastPersistOk = true;
    } catch {
      this.lastPersistOk = false;
    }
    return this.lastPersistOk;
  }

  ensureDailyMission(date = this.clock()) {
    const key = dayKey(date);
    if (this.data.dailyMission?.date !== key) this.data.dailyMission = createDailyMission(date);
    return this.data.dailyMission;
  }

  getDailyMission(date = this.clock()) {
    const before = JSON.stringify(this.data.dailyMission);
    const mission = this.ensureDailyMission(date);
    if (JSON.stringify(mission) !== before) this.persist();
    return { ...mission };
  }

  advanceDailyMission(type, amount = 1) {
    const mission = this.ensureDailyMission();
    if (mission.claimed || mission.type !== type) return { ...mission, changed: false };
    const next = Math.min(mission.target, mission.progress + Math.max(0, Math.floor(number(amount))));
    const changed = next !== mission.progress;
    mission.progress = next;
    return { ...mission, changed };
  }

  claimDailyMission() {
    const mission = this.ensureDailyMission();
    if (mission.claimed) return { ok: false, reason: "already_claimed", mission: { ...mission } };
    if (mission.progress < mission.target) return { ok: false, reason: "incomplete", mission: { ...mission } };
    mission.claimed = true;
    const reward = mission.rewardBeans;
    this.data.economy.beans += reward;
    this.data.economy.lifetimeBeans += reward;
    this.data.overall.totalBeansEarned += reward;
    if (!this.persist()) {
      mission.claimed = false;
      this.data.economy.beans -= reward;
      this.data.economy.lifetimeBeans -= reward;
      this.data.overall.totalBeansEarned -= reward;
      return { ok: false, reason: "save_failed", mission: { ...mission } };
    }
    return { ok: true, reward, beans: this.data.economy.beans, mission: { ...mission } };
  }

  mode(id) {
    if (!this.data.statistics[id]) this.data.statistics[id] = emptyMode();
    return this.data.statistics[id];
  }

  updateSettings(value) {
    this.data.settings = { ...this.data.settings, ...value };
    this.persist();
    return this.data.settings;
  }

  startRun(id, difficulty = "normal") {
    const stats = this.mode(id);
    stats.plays++;
    stats.byDifficulty[difficulty] = { plays: 0, bestScore: 0, correct: 0, wrong: 0, ...object(stats.byDifficulty[difficulty]) };
    stats.byDifficulty[difficulty].plays++;
    this.data.overall.totalPlays++;
    this.persist();
    return stats;
  }

  recordAnswer(question, correct, timeout = false, responseMs = null, difficulty = "normal") {
    const stats = this.mode(question.trainingId);
    if (timeout) stats.timeout++;
    else if (correct) stats.correct++;
    else stats.wrong++;
    const byDifficulty = stats.byDifficulty[difficulty] = {
      plays: 0, bestScore: 0, correct: 0, wrong: 0, ...object(stats.byDifficulty[difficulty])
    };
    if (correct) byDifficulty.correct++;
    else byDifficulty.wrong++;
    if (Number.isFinite(responseMs) && responseMs >= 0) {
      stats.averageResponseMs = (stats.averageResponseMs * stats.responseCount + responseMs) / (stats.responseCount + 1);
      stats.responseCount++;
      if (!timeout && (!stats.bestResponseMs || responseMs < stats.bestResponseMs)) {
        stats.bestResponseMs = Math.round(responseMs);
      }
    }
    if (!correct) stats.weakQuestions[question.id] = (stats.weakQuestions[question.id] || 0) + 1;
    if (correct) {
      this.advanceDailyMission("correct_answers");
      if (Number.isFinite(responseMs) && responseMs <= FAST_ANSWER_MS) this.advanceDailyMission("fast_answers");
    }
    this.persist();
    return stats;
  }

  earnBeans(amount, reason = "gameplay", trainingId = null) {
    const value = Math.max(0, Math.floor(amount || 0));
    this.data.economy.beans += value;
    this.data.economy.lifetimeBeans += value;
    this.data.overall.totalBeansEarned += value;
    if (trainingId) this.mode(trainingId).beansEarned += value;
    this.persist();
    return { amount: value, reason, beans: this.data.economy.beans };
  }

  recordAction(type, trainingId = null) {
    const map = {
      "action:critical-hit": "criticalHits", "action:spoon-hit": "spoonHits",
      "action:bucket-smash": "bucketSmashes", "action:lid-drop": "lidDrops",
      "action:water-cannon": "waterCannons", "action:combo-finisher": "comboFinishers"
    };
    const key = map[type];
    if (key) this.data.actionStatistics[key]++;
    if (type === "action:spoon-hit") {
      this.data.actionStatistics.toadHits++;
      this.data.overall.toadHits++;
      if (trainingId) this.mode(trainingId).spoonHits++;
    }
    if (type === "action:critical-hit" && trainingId) this.mode(trainingId).criticalHits++;
    this.persist();
  }

  recordWaterPour() {
    this.data.actionStatistics.waterPours++;
    this.data.overall.waterPours++;
    this.persist();
  }

  recordFeverTier(tier, trainingId) {
    const value = Math.max(0, Math.floor(tier || 0));
    this.data.feverTierRecord = Math.max(this.data.feverTierRecord, value);
    if (trainingId) this.mode(trainingId).bestFeverTier = Math.max(this.mode(trainingId).bestFeverTier, value);
    this.advanceDailyMission("fever_starts");
    this.persist();
  }

  saveCurrentRun(state) {
    this.data.currentRun = state ? { ...state, savedAt: new Date().toISOString() } : null;
    if (state?.bestCombo >= 5 || state?.combo >= 5) this.advanceDailyMission("combo_5");
    if (state?.water >= 100) this.advanceDailyMission("water_full");
    this.persist();
    return this.data.currentRun;
  }

  finishRun(state) {
    const stats = this.mode(state.trainingId);
    const difficulty = state.difficulty || "normal";
    stats.bestScore = Math.max(stats.bestScore, Math.round(state.score || 0));
    stats.upgradeBestScore = Math.max(stats.upgradeBestScore || 0, Math.round(state.score || 0));
    stats.bestCombo = Math.max(stats.bestCombo, state.bestCombo || state.combo || 0);
    stats.bestFeverCount = Math.max(stats.bestFeverCount, state.feverCount || 0);
    stats.lastPlayedAt = new Date().toISOString();
    stats.playDates = [stats.lastPlayedAt, ...stats.playDates.filter(Boolean)].slice(0, MAX_PLAY_DATES);
    this.data.overall.bestCombo = Math.max(this.data.overall.bestCombo, stats.bestCombo);
    const byDifficulty = stats.byDifficulty[difficulty] = {
      plays: 0, bestScore: 0, correct: 0, wrong: 0, ...object(stats.byDifficulty[difficulty])
    };
    byDifficulty.bestScore = Math.max(byDifficulty.bestScore, Math.round(state.score || 0));
    this.data.recentRuns.unshift({
      endedAt: stats.lastPlayedAt, trainingId: state.trainingId, difficulty,
      score: Math.round(state.score || 0), status: state.status, beansEarned: state.beansEarned || 0,
      questionCount: Number(state.correctAnswersPerStage || 0),
      correct: Number(state.correctInStage || 0),
      bestCombo: Number(state.bestCombo || state.combo || 0)
    });
    this.data.recentRuns = this.data.recentRuns.slice(0, 20);
    this.data.currentRun = null;
    if (state.status === "cleared") this.advanceDailyMission("training_complete");
    if (state.bestCombo >= 5 || state.combo >= 5) this.advanceDailyMission("combo_5");
    if (state.water >= 100) this.advanceDailyMission("water_full");
    this.persist();
    return stats;
  }

  getTrainingStats(id) {
    return { ...this.mode(id) };
  }

  clearCurrentRun() {
    this.data.currentRun = null;
    this.persist();
  }

  reset() {
    this.data = defaults();
    this.persist();
    return this.data;
  }
}
