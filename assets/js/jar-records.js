const nonNegative = value => Math.max(0, Number(value) || 0);
const percent = (correct, total) => total > 0 ? Math.round(correct / total * 100) : null;
const optionalAccuracy = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? Math.round(parsed) : null;
};

function modeMapFor(modes) {
  return new Map((Array.isArray(modes) ? modes : []).filter(mode => mode?.id).map(mode => [mode.id, mode]));
}

function recordDate(record) {
  return record?.playDate || record?.endedAt || record?.completedAt || record?.startedAt || null;
}

function timestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function recordTotals(record) {
  const correct = nonNegative(record?.correctAnswers ?? record?.correct ?? record?.correctInStage);
  const wrong = nonNegative(record?.wrongAnswers ?? record?.wrong);
  const timeout = nonNegative(record?.timeoutAnswers ?? record?.timeout);
  const observed = correct + wrong + timeout;
  const stored = nonNegative(record?.totalQuestions ?? record?.questionCount);
  const total = Math.max(observed, stored);
  const hasExplicitAccuracy = record?.accuracy != null && Number.isFinite(Number(record.accuracy));
  const hasAnswerTotals = ["totalQuestions", "wrongAnswers", "wrong", "timeoutAnswers", "timeout"]
    .some(key => record?.[key] != null);
  return {
    correct,
    wrong,
    timeout,
    total,
    accuracy: hasExplicitAccuracy ? Math.round(Number(record.accuracy)) : hasAnswerTotals ? percent(correct, total) : null
  };
}

function normalizedCategoryResults(value, fallbackCategory, totals) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const results = Object.entries(source).flatMap(([category, stats]) => {
    if (!category) return [];
    const correct = nonNegative(stats?.correctAnswers ?? stats?.correct);
    const total = Math.max(correct, nonNegative(stats?.totalQuestions ?? stats?.total));
    return [[category, { correctAnswers: correct, totalQuestions: total, accuracy: percent(correct, total) }]];
  });
  if (results.length || !fallbackCategory) return Object.fromEntries(results);
  return {
    [fallbackCategory]: {
      correctAnswers: totals.correct,
      totalQuestions: totals.total,
      accuracy: totals.accuracy
    }
  };
}

export function normalizeJarSessionRecord(record, { modes = [], subject = null } = {}) {
  const mode = modeMapFor(modes).get(record?.trainingId || record?.quizId) || null;
  const totals = recordTotals(record);
  const categoryResults = normalizedCategoryResults(record?.categoryResults, record?.category || mode?.category, totals);
  return Object.freeze({
    playDate: recordDate(record),
    subject: record?.subject || subject || null,
    trainingId: record?.trainingId || record?.quizId || mode?.id || null,
    title: record?.title || mode?.title || record?.quizId || "장독대 기록",
    selectedDifficulty: record?.selectedDifficulty || record?.difficulty || "normal",
    totalQuestions: totals.total,
    correctAnswers: totals.correct,
    wrongAnswers: totals.wrong,
    timeoutAnswers: totals.timeout,
    accuracy: totals.accuracy,
    maxCombo: nonNegative(record?.maxCombo ?? record?.bestCombo ?? record?.combo),
    categoryResults,
    status: record?.status || null,
    score: nonNegative(record?.score),
    isPersonalBestAccuracy: Boolean(record?.isPersonalBestAccuracy)
  });
}

function aggregateStats(statistics, modes) {
  const byCategory = new Map();
  let totalQuestions = 0;
  let correctAnswers = 0;
  let maxCombo = 0;
  for (const mode of modes) {
    const stats = statistics?.[mode.id] || {};
    const correct = nonNegative(stats.correct);
    const wrong = nonNegative(stats.wrong);
    const timeout = nonNegative(stats.timeout);
    const total = correct + wrong + timeout;
    if (!total && !nonNegative(stats.bestCombo)) continue;
    totalQuestions += total;
    correctAnswers += correct;
    maxCombo = Math.max(maxCombo, nonNegative(stats.bestCombo));
    const current = byCategory.get(mode.category) || { category: mode.category, correctAnswers: 0, totalQuestions: 0, maxCombo: 0 };
    current.correctAnswers += correct;
    current.totalQuestions += total;
    current.maxCombo = Math.max(current.maxCombo, nonNegative(stats.bestCombo));
    byCategory.set(mode.category, current);
  }
  return { totalQuestions, correctAnswers, maxCombo, byCategory };
}

function aggregateSessions(sessions) {
  const byCategory = new Map();
  let totalQuestions = 0;
  let correctAnswers = 0;
  let maxCombo = 0;
  for (const session of sessions) {
    totalQuestions += session.totalQuestions;
    correctAnswers += session.correctAnswers;
    maxCombo = Math.max(maxCombo, session.maxCombo);
    for (const [category, result] of Object.entries(session.categoryResults)) {
      const current = byCategory.get(category) || { category, correctAnswers: 0, totalQuestions: 0, maxCombo: 0 };
      current.correctAnswers += nonNegative(result.correctAnswers);
      current.totalQuestions += nonNegative(result.totalQuestions);
      current.maxCombo = Math.max(current.maxCombo, session.maxCombo);
      byCategory.set(category, current);
    }
  }
  return { totalQuestions, correctAnswers, maxCombo, byCategory };
}

function statusForAccuracy(accuracy) {
  if (accuracy == null) return "기록 없음";
  if (accuracy >= 80) return "강점";
  if (accuracy >= 60) return "보통";
  return "보완 필요";
}

function recentCategoryAccuracy(sessions, category) {
  const session = sessions
    .slice()
    .reverse()
    .find(item => item.categoryResults[category]?.accuracy != null);
  return session?.categoryResults[category]?.accuracy ?? null;
}

function nextGoal({ sessions, categories, personalBest }) {
  if (!sessions.length) return "첫 장독대를 채우며 나만의 성장 기록을 만들어 보세요.";
  const weakest = categories
    .filter(category => category.recentAccuracy != null)
    .sort((left, right) => left.recentAccuracy - right.recentAccuracy)[0];
  if (weakest && weakest.recentAccuracy < 70) {
    return `${weakest.category}에서 최근 정답률이 가장 낮습니다. 다음 장독대에서 한 번 더 도전해 보세요.`;
  }
  const latest = sessions.at(-1);
  if (latest?.accuracy != null && latest.accuracy < 80) {
    return "다음 장독대에서 정답률 80%에 도전해 보세요.";
  }
  if (personalBest != null) return "최근 흐름이 좋아요. 다음 장독대에서도 개인 최고 정답률에 도전해 보세요.";
  return "다음 장독대를 채우며 나만의 목표를 만들어 보세요.";
}

export function buildJarRecordAnalytics({
  records = [],
  modes = [],
  subject = null,
  statistics = null,
  overall = null
} = {}) {
  const safeModes = Array.isArray(modes) ? modes : [];
  const sessions = (Array.isArray(records) ? records : [])
    .map(record => normalizeJarSessionRecord(record, { modes: safeModes, subject }))
    .sort((left, right) => timestamp(left.playDate) - timestamp(right.playDate));
  const useStatistics = statistics && typeof statistics === "object" && Object.keys(statistics).length > 0;
  const aggregate = useStatistics ? aggregateStats(statistics, safeModes) : aggregateSessions(sessions);
  const categoryNames = new Set([
    ...safeModes.map(mode => mode.category).filter(Boolean),
    ...aggregate.byCategory.keys(),
    ...sessions.flatMap(session => Object.keys(session.categoryResults))
  ]);
  const categories = [...categoryNames].map(category => {
    const result = aggregate.byCategory.get(category) || { correctAnswers: 0, totalQuestions: 0 };
    const accuracy = percent(result.correctAnswers, result.totalQuestions);
    const recentAccuracy = recentCategoryAccuracy(sessions, category);
    return Object.freeze({
      category,
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers,
      accuracy,
      recentAccuracy,
      status: statusForAccuracy(recentAccuracy ?? accuracy)
    });
  }).sort((left, right) => left.category.localeCompare(right.category, "ko"));
  const accuracySeries = sessions.filter(session => session.accuracy != null);
  const recentSessions = sessions.slice(-7);
  const latest = sessions.at(-1) || null;
  const previous = sessions.at(-2) || null;
  const observedBest = accuracySeries.length ? Math.max(...accuracySeries.map(session => session.accuracy)) : null;
  const durableBest = optionalAccuracy(overall?.bestAccuracy);
  const personalBest = durableBest == null
    ? observedBest
    : observedBest == null
      ? durableBest
      : Math.max(durableBest, observedBest);
  const previousAccuracies = sessions.slice(0, -1).filter(session => session.accuracy != null).map(session => session.accuracy);
  const previousBest = previousAccuracies.length ? Math.max(...previousAccuracies) : null;
  const completionFallback = sessions.filter(session => session.status === "cleared").length;
  const completedPlays = Number.isFinite(Number(overall?.totalCompletions))
    ? Math.max(completionFallback, Number(overall.totalCompletions))
    : completionFallback;
  const totals = Object.freeze({
    completedPlays,
    totalQuestions: aggregate.totalQuestions,
    correctAnswers: aggregate.correctAnswers,
    accuracy: percent(aggregate.correctAnswers, aggregate.totalQuestions),
    maxCombo: Math.max(aggregate.maxCombo, nonNegative(overall?.bestCombo))
  });
  const latestIsPersonalBest = Boolean(latest?.accuracy != null && (latest.isPersonalBestAccuracy || (previousBest != null && latest.accuracy > previousBest)));
  return Object.freeze({
    sessions: Object.freeze(sessions),
    recentSessions: Object.freeze(recentSessions),
    totals,
    categories: Object.freeze(categories),
    growth: Object.freeze({
      latestAccuracy: latest?.accuracy ?? null,
      accuracyChange: latest?.accuracy != null && previous?.accuracy != null ? latest.accuracy - previous.accuracy : null,
      personalBest,
      latestIsPersonalBest
    }),
    nextGoal: nextGoal({ sessions, categories, personalBest })
  });
}

export function createJarSessionRecord(state, { subject = null, mode = null, playDate = new Date().toISOString() } = {}) {
  const correctAnswers = nonNegative(state?.correctAnswers ?? state?.correctInStage);
  const wrongAnswers = nonNegative(state?.wrongAnswers);
  const timeoutAnswers = nonNegative(state?.timeoutAnswers);
  const totalQuestions = Math.max(correctAnswers + wrongAnswers + timeoutAnswers, nonNegative(state?.totalQuestions));
  const category = mode?.category || state?.category || null;
  const categoryResults = normalizedCategoryResults(state?.categoryResults, category, {
    correct: correctAnswers,
    total: totalQuestions,
    accuracy: percent(correctAnswers, totalQuestions)
  });
  return {
    playDate,
    subject,
    selectedDifficulty: state?.selectedDifficulty || state?.difficulty || "normal",
    totalQuestions,
    correctAnswers,
    accuracy: percent(correctAnswers, totalQuestions),
    maxCombo: nonNegative(state?.maxCombo ?? state?.bestCombo ?? state?.combo),
    categoryResults
  };
}
