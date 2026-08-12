import { SubjectStorage } from "./subject-storage.js";

export class SubjectGameStorage {
  constructor(subjectId, globalStorage, trainingProvider, storage = globalThis.localStorage) {
    this.subjectId = subjectId;
    this.globalStorage = globalStorage;
    this.trainingProvider = trainingProvider;
    this.subjectStorage = new SubjectStorage(subjectId, storage);
    this.currentRun = this.subjectStorage.read("current-run", null);
  }

  get data() { return { ...this.globalStorage.data, currentRun: this.currentRun }; }
  persist() { return this.globalStorage.persist(); }
  updateSettings(value) { return this.globalStorage.updateSettings(value); }
  earnBeans(...args) { return this.globalStorage.earnBeans(...args); }
  recordAction(...args) { return this.globalStorage.recordAction(...args); }
  recordWaterPour(...args) { return this.globalStorage.recordWaterPour(...args); }
  recordFeverTier(...args) { return this.globalStorage.recordFeverTier(...args); }

  startRun(trainingId, difficulty = "normal") {
    this.currentRun = { trainingId, difficulty, correct: 0, wrong: 0, timeout: 0, startedAt: new Date().toISOString() };
    this.subjectStorage.write("current-run", this.currentRun);
    return this.getTrainingStats(trainingId);
  }

  recordAnswer(question, correct, timeout = false) {
    if (!this.currentRun) this.startRun(question.trainingId);
    if (timeout) this.currentRun.timeout += 1;
    if (correct) this.currentRun.correct += 1;
    else this.currentRun.wrong += 1;
    this.subjectStorage.write("current-run", this.currentRun);
    return this.getTrainingStats(question.trainingId);
  }

  saveCurrentRun(state) {
    this.currentRun = state ? { ...this.currentRun, ...state, savedAt: new Date().toISOString() } : null;
    this.subjectStorage.write("current-run", this.currentRun);
    return this.currentRun;
  }

  finishRun(state) {
    const records = this.subjectStorage.read("records", []);
    const mode = this.trainingProvider(state.trainingId);
    const record = Object.freeze({
      quizId: state.trainingId,
      title: mode?.title || state.trainingId,
      difficulty: state.difficulty || "normal",
      score: Math.round(Number(state.score) || 0),
      correct: Number(this.currentRun?.correct) || Number(state.correctInStage) || 0,
      wrong: Number(this.currentRun?.wrong) || 0,
      timeout: Number(this.currentRun?.timeout) || 0,
      bestCombo: Number(state.bestCombo || state.combo) || 0,
      questionCount: Number(state.correctAnswersPerStage) || 0,
      status: state.status,
      completedAt: new Date().toISOString()
    });
    this.subjectStorage.write("records", [record, ...records].slice(0, 100));
    this.currentRun = null;
    this.subjectStorage.write("current-run", null);
    return this.getTrainingStats(state.trainingId);
  }

  getTrainingStats(trainingId) {
    return this.subjectStorage.read("records", [])
      .filter(record => record.quizId === trainingId)
      .reduce((stats, record) => ({
        plays: stats.plays + 1,
        correct: stats.correct + (Number(record.correct) || 0),
        wrong: stats.wrong + (Number(record.wrong) || 0),
        timeout: stats.timeout + (Number(record.timeout) || 0),
        bestScore: Math.max(stats.bestScore, Number(record.score) || 0),
        bestCombo: Math.max(stats.bestCombo, Number(record.bestCombo) || 0)
      }), { plays: 0, correct: 0, wrong: 0, timeout: 0, bestScore: 0, bestCombo: 0 });
  }
}
