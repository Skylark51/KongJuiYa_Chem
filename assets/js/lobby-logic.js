import { TRAINING_MODES, getTrainingMode } from "../../data/training-modes.js";

export const BEGINNER_TRAINING_IDS = Object.freeze([
  "atomic_number",
  "atomic_mass",
  "period_group",
  "valence_electron"
]);

export const DIFFICULTY_LABELS = Object.freeze({
  easy: "쉬움",
  normal: "보통",
  hard: "어려움"
});

const nonNegative = value => Math.max(0, Number(value) || 0);

export function modeMetrics(stats = {}) {
  const correct = nonNegative(stats.correct);
  const wrong = nonNegative(stats.wrong);
  const timeout = nonNegative(stats.timeout);
  const attempts = correct + wrong + timeout;
  const plays = nonNegative(stats.plays);
  const misses = wrong + timeout;
  return {
    plays,
    correct,
    wrong,
    timeout,
    attempts,
    misses,
    accuracy: attempts ? Math.round(correct / attempts * 100) : null,
    errorRate: attempts ? misses / attempts : 0,
    bestScore: nonNegative(stats.bestScore),
    bestCombo: nonNegative(stats.bestCombo),
    averageResponseMs: nonNegative(stats.averageResponseMs),
    responseCount: nonNegative(stats.responseCount),
    lastPlayedAt: typeof stats.lastPlayedAt === "string" ? stats.lastPlayedAt : null
  };
}

export function playedModes(data, modes = TRAINING_MODES) {
  return modes
    .map(mode => ({ mode, stats: data.statistics?.[mode.id] || {}, metrics: modeMetrics(data.statistics?.[mode.id]) }))
    .filter(entry => entry.metrics.plays > 0 || entry.metrics.attempts > 0);
}

export function hasPlayHistory(data, modes = TRAINING_MODES) {
  return Number(data.overall?.totalPlays || 0) > 0 || playedModes(data, modes).length > 0 || (data.recentRuns?.length || 0) > 0;
}

export function recommendQuickStart(data, modes = TRAINING_MODES) {
  const weak = playedModes(data, modes)
    .filter(entry => entry.metrics.misses > 0 && entry.metrics.attempts > 0)
    .sort((left, right) => right.metrics.errorRate - left.metrics.errorRate || right.metrics.misses - left.metrics.misses || left.metrics.bestScore - right.metrics.bestScore)[0];

  if (weak) {
    return {
      mode: weak.mode,
      resume: false,
      reason: "약점 복습",
      detail: "오답률이 높은 장독대"
    };
  }

  const resumed = getTrainingMode(data.currentRun?.trainingId);
  if (resumed) {
    return {
      mode: resumed,
      resume: true,
      reason: "이어 채우기",
      detail: "저장된 진행 중 게임"
    };
  }

  const candidates = BEGINNER_TRAINING_IDS
    .map(id => getTrainingMode(id))
    .filter(Boolean)
    .map((mode, index) => ({ mode, index, plays: modeMetrics(data.statistics?.[mode.id]).plays }))
    .sort((left, right) => left.plays - right.plays || left.index - right.index);
  const selected = candidates[0]?.mode || modes[0];

  return {
    mode: selected,
    resume: false,
    reason: "첫 장독대",
    detail: "입문 장독대 추천"
  };
}
