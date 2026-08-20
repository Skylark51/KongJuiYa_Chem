import {
  GAME_CONFIG,
  FEVER_CONFIG,
  getDifficultyConfig
} from "../../data/game-config.js";

import {
  getTrainingMode
} from "../../data/training-modes.js";

import {
  evaluateAnswer,
  getInputDescriptor
} from "./question-engine.js";

import {
  ToadDialogueSelector
} from "../../data/dialogues/toad-dialogues.js";

import {
  FeverSystem
} from "./fever-system.js";

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

export class GameCore {
  constructor({
    questionEngine,
    config = GAME_CONFIG,
    feverConfig = FEVER_CONFIG,
    eventTarget = globalThis.window,
    dialogueSelector = new ToadDialogueSelector(),
    upgradeSystem = null,
    actionSystem = null,
    trainingProvider = getTrainingMode,
    cadenceController = null
  } = {}) {
    if (!questionEngine) {
      throw new Error("QuestionEngine가 필요합니다.");
    }

    this.questionEngine = questionEngine;
    this.config = config;
    this.feverConfig = feverConfig;
    this.eventTarget = eventTarget;
    this.dialogueSelector = dialogueSelector;
    this.upgrades = upgradeSystem;
    this.actions = actionSystem;
    this.trainingProvider = trainingProvider;
    this.cadence = cadenceController;
    this.advanceAfterResume = false;

    if (this.actions) {
      this.actions.speak = (category) => this.speak(category);
    }

    this.feverSystem = new FeverSystem(
      feverConfig,
      upgradeSystem
    );

    this.listeners = new Map();
    this.submissionLocked = false;
    this.warningLevel = null;
    this.sessionQueue = [];
    this.sessionQueueCursor = 0;
    this.state = this.initialState();
  }

  initialState() {
    return {
      status: "idle",
      trainingId: null,
      difficulty: "normal",
      water: 70,
      score: 0,
      combo: 0,
      bestCombo: 0,
      correctInStage: 0,
      currentQuestionId: null,
      questionTimeRemaining: 0,
      reviewMode: false,
      lastWrongQuestionId: null,
      startedAt: null,
      elapsedSeconds: 0,
      lastCorrectAt: null,
      feverCharge: 0,
      feverActive: false,
      feverRemaining: 0,
      feverCount: 0,
      feverTier: 0,
      lastResponseMs: 0,
      stageIndex: 0,
      beansEarned: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      timeoutAnswers: 0,
      categoryResults: {},
      sessionQuestionIds: [],
      sessionQuestionCursor: 0,
      sessionRequestedQuota: null,
      sessionActualQuota: null,
      sessionFallbackUsed: false,
      feedbackPending: false
    };
  }

  on(type, listener) {
    const set = this.listeners.get(type) || new Set();

    set.add(listener);
    this.listeners.set(type, set);

    return () => set.delete(listener);
  }

  emit(type, detail = {}) {
    const payload = {
      ...detail,
      state: this.snapshot()
    };

    for (const listener of this.listeners.get(type) || []) {
      listener(payload);
    }

    if (
      this.eventTarget?.dispatchEvent &&
      typeof CustomEvent !== "undefined"
    ) {
      this.eventTarget.dispatchEvent(
        new CustomEvent(type, {
          detail: payload
        })
      );
    }
  }

  get training() {
    return this.trainingProvider(this.state.trainingId);
  }

  get stage() {
    const mode = this.training;

    return mode
      ? {
          id: mode.id,
          name: mode.title,
          description: mode.description,
          leakPerSecond: mode.rules.leakPerSecond,
          timeLimit: this.timeLimit()
        }
      : null;
  }

  get question() {
    return this.questionEngine.getQuestion(
      this.state.currentQuestionId
    );
  }

  difficultyConfig() {
    return getDifficultyConfig(
      this.state.difficulty
    );
  }

  maxWater() {
    return (
      this.config.maxWater +
      (
        this.upgrades?.effect(
          "jar_level",
          "maxWaterBonus"
        ) || 0
      )
    );
  }

  timeLimit() {
    const base =
      this.state.difficulty === "hard"
        ? 12
        : this.state.difficulty === "easy"
          ? 20
          : 15;

    return (
      base *
      this.difficultyConfig().timeFactor
    );
  }

  leakPerSecond() {
    const reduction = Math.min(
      0.35,
      this.upgrades?.effect(
        "jar_level",
        "leakReduction"
      ) || 0
    );

    const base =
      this.training?.rules.leakPerSecond || 0;

    return (
      base *
      this.difficultyConfig().leakFactor *
      (1 - reduction) *
      (
        this.state.feverActive
          ? this.feverConfig.leakMultiplier
          : 1
      )
    );
  }

  snapshot() {
    return {
      ...this.state,
      maxWater: this.maxWater(),
      correctAnswersPerStage:
        this.config.correctAnswersToClear,
      stageId: this.state.trainingId,
      questionInput: getInputDescriptor(
        this.question
      ),
      fever: {
        active: this.state.feverActive,
        charge: this.state.feverCharge,
        remaining: this.state.feverRemaining,
        count: this.state.feverCount,
        tier: this.state.feverTier
      }
    };
  }

  start({
    trainingId,
    difficulty = "normal",
    resumeState = null,
    reviewMode = false,
    questionId = null,
    questionQueue = [],
    sessionMetadata = null
  } = {}) {
    this.cadence?.cancel?.();
    this.advanceAfterResume = false;
    const mode = this.trainingProvider(trainingId);

    if (!mode) {
      throw new Error(
        `알 수 없는 훈련 ID: ${
          trainingId || "(없음)"
        }`
      );
    }

    this.state = this.initialState();
    this.state.trainingId = mode.id;

    this.state.difficulty =
      mode.difficultyLevels.includes(difficulty)
        ? difficulty
        : "normal";

    this.state.reviewMode = Boolean(reviewMode);

    const queueSource = resumeState?.trainingId === mode.id && Array.isArray(resumeState.sessionQuestionIds)
      ? resumeState.sessionQuestionIds
      : questionQueue;
    this.sessionQueue = (Array.isArray(queueSource) ? queueSource : [])
      .map(item => typeof item === "string" ? item : item?.id)
      .filter(id => this.questionEngine.getQuestion(id)?.trainingId === mode.id);
    const resumedAnswerCount = Number(
      resumeState?.totalQuestions ?? (
        Number(resumeState?.correctAnswers ?? resumeState?.correctInStage) || 0
      )
    );
    this.sessionQueueCursor = resumeState?.trainingId === mode.id
      ? Math.max(0, Math.min(this.sessionQueue.length, Math.floor(resumedAnswerCount) || 0))
      : 0;
    this.state.sessionQuestionIds = [...this.sessionQueue];
    this.state.sessionQuestionCursor = this.sessionQueueCursor;
    this.state.sessionRequestedQuota = sessionMetadata?.requestedQuota && typeof sessionMetadata.requestedQuota === "object"
      ? { ...sessionMetadata.requestedQuota }
      : null;
    this.state.sessionActualQuota = sessionMetadata?.actualQuota && typeof sessionMetadata.actualQuota === "object"
      ? { ...sessionMetadata.actualQuota }
      : null;
    this.state.sessionFallbackUsed = Boolean(sessionMetadata?.fallbackUsed);

    this.state.water = Math.min(
      this.maxWater(),
      mode.rules.initialWater +
        (
          this.upgrades?.effect(
            "jar_level",
            "startWaterBonus"
          ) || 0
        )
    );

    if (
      resumeState?.trainingId === mode.id
    ) {
      for (const key of [
        "water",
        "score",
        "combo",
        "bestCombo",
        "correctInStage",
        "feverCount",
        "beansEarned",
        "totalQuestions",
        "correctAnswers",
        "wrongAnswers",
        "timeoutAnswers"
      ]) {
        if (
          Number.isFinite(
            Number(resumeState[key])
          )
        ) {
          this.state[key] = Number(
            resumeState[key]
          );
        }
      }

      if (resumeState.categoryResults && typeof resumeState.categoryResults === "object") {
        this.state.categoryResults = { ...resumeState.categoryResults };
      }
      if (resumeState.sessionRequestedQuota && typeof resumeState.sessionRequestedQuota === "object") {
        this.state.sessionRequestedQuota = { ...resumeState.sessionRequestedQuota };
      }
      if (resumeState.sessionActualQuota && typeof resumeState.sessionActualQuota === "object") {
        this.state.sessionActualQuota = { ...resumeState.sessionActualQuota };
      }
      this.state.sessionFallbackUsed = Boolean(resumeState.sessionFallbackUsed);

      this.state.water = clamp(
        this.state.water,
        1,
        this.maxWater()
      );
    }

    this.state.status = "running";
    this.state.startedAt =
      new Date().toISOString();

    this.nextQuestion(questionId);

    this.emit("training:start", {
      training: mode,
      resumed: Boolean(resumeState)
    });

    this.emit("game:start", {
      difficulty: this.state.difficulty,
      resumed: Boolean(resumeState),
      stage: this.stage,
      training: mode,
      upgrades:
        this.upgrades?.levels?.() || {}
    });

    return this.snapshot();
  }

  nextQuestion(preferredId = null) {
    this.state.feedbackPending = false;
    let question = preferredId
      ? this.questionEngine.getQuestion(
          preferredId
        )
      : null;

    if (!question || question.trainingId !== this.state.trainingId) {
      const queuedId = this.sessionQueue[this.sessionQueueCursor];
      if (queuedId) {
        this.sessionQueueCursor += 1;
        this.state.sessionQuestionCursor = this.sessionQueueCursor;
        const queued = this.questionEngine.getQuestion(queuedId);
        if (queued?.trainingId === this.state.trainingId) question = queued;
      }
    }

    if (!question || question.trainingId !== this.state.trainingId) {
      question = this.questionEngine.next({
        trainingId: this.state.trainingId,
        difficultyRange: this.sessionQueue.length
          ? [1, 3]
          : this.difficultyConfig().difficultyRange,
        reviewMode: this.state.reviewMode
      });
    }

    this.state.currentQuestionId =
      question.id;

    this.state.questionTimeRemaining =
      this.timeLimit();

    this.emit("question:changed", {
      question,
      input: getInputDescriptor(question)
    });

    return question;
  }

  recordSessionAnswer(correct, timeout = false) {
    this.state.totalQuestions += 1;
    if (correct) this.state.correctAnswers += 1;
    else if (timeout) this.state.timeoutAnswers += 1;
    else this.state.wrongAnswers += 1;

    const category = this.training?.category;
    if (!category) return;
    const current = this.state.categoryResults[category] || { totalQuestions: 0, correctAnswers: 0 };
    current.totalQuestions += 1;
    if (correct) current.correctAnswers += 1;
    this.state.categoryResults = { ...this.state.categoryResults, [category]: current };
  }

  hasFixedSessionQueue() {
    return this.sessionQueue.length > 0;
  }

  completedFixedSession() {
    return this.hasFixedSessionQueue() && this.state.totalQuestions >= this.sessionQueue.length;
  }

  tick(deltaSeconds) {
    if (
      this.state.status !== "running"
    ) {
      return this.snapshot();
    }

    const delta = clamp(
      Number(deltaSeconds) || 0,
      0,
      this.config.maxDeltaSeconds
    );

    this.state.elapsedSeconds += delta;

    this.state.water = clamp(
      this.state.water -
        this.leakPerSecond() * delta,
      0,
      this.maxWater()
    );

    if (!this.state.feedbackPending) {
      this.state.questionTimeRemaining =
        Math.max(
          0,
          this.state.questionTimeRemaining -
            delta
        );
    }

    if (this.state.feverActive) {
      this.state.feverRemaining =
        Math.max(
          0,
          this.state.feverRemaining -
            delta
        );

      if (
        this.state.feverRemaining <= 0
      ) {
        this.endFever("expired");
      }
    }

    this.checkWaterWarnings();

    if (this.state.water <= 0) {
      return this.over("water_empty");
    }

    if (
      !this.state.feedbackPending &&
      this.state.questionTimeRemaining <=
      0
    ) {
      this.timeout();
    }

    return this.snapshot();
  }

  checkWaterWarnings() {
    const level =
      this.state.water <= 10
        ? "critical"
        : this.state.water <= 50
          ? "warning"
          : null;

    if (
      level &&
      level !== this.warningLevel
    ) {
      this.emit(`water:${level}`, {
        water: this.state.water
      });

      if (level === "critical") {
        this.speak("waterCritical");
      }
    }

    this.warningLevel = level;
  }

  chargeFever() {
    const values =
      this.feverSystem.values(
        this.state.combo
      );

    const now =
      this.state.elapsedSeconds;

    const within =
      this.state.lastCorrectAt != null &&
      now -
        this.state.lastCorrectAt <=
        this.feverConfig
          .answerWindowSeconds;

    this.state.feverCharge = within
      ? this.state.feverCharge + 1
      : 1;

    this.state.lastCorrectAt = now;

    this.emit("fever:charge", {
      charge: this.state.feverCharge,
      required: values.required
    });

    if (
      this.state.feverCharge >=
      values.required
    ) {
      this.startFever();
    }
  }

  startFever() {
    if (this.state.feverActive) {
      return;
    }

    const values =
      this.feverSystem.values(
        this.state.combo
      );

    this.state.feverActive = true;
    this.state.feverRemaining =
      values.duration;

    this.state.feverCount += 1;
    this.state.feverCharge = 0;
    this.state.feverTier =
      values.tier;

    const form =
      this.feverSystem.form(
        values.level,
        this.state.combo
      );

    this.emit("fever:start", {
      duration: values.duration,
      scoreMultiplier:
        values.scoreMultiplier,
      waterGainMultiplier:
        values.waterGainMultiplier,
      leakMultiplier:
        values.leakMultiplier,
      feverTier: values.tier,
      tier: values.tier,
      toadForm: form
    });

    this.actions?.feverStart({
      form,
      duration: values.duration,
      tier: values.tier,
      trainingId:
        this.state.trainingId
    });

    this.speak(
      form === "gold"
        ? "goldTransform"
        : form === "giant"
          ? "giantTransform"
          : "feverStart"
    );
  }

  extendFever() {
    const max =
      this.config.feverMaxSeconds *
      (
        this.upgrades?.effect(
          "fever_level",
          "durationMultiplier"
        ) || 1
      );

    this.state.feverRemaining =
      Math.min(
        max,
        this.state.feverRemaining +
          this.config.feverExtendSeconds
      );

    this.emit("fever:extend", {
      remaining:
        this.state.feverRemaining,
      added:
        this.config.feverExtendSeconds
    });
  }

  endFever(reason = "ended") {
    if (!this.state.feverActive) {
      return;
    }

    this.state.feverActive = false;
    this.state.feverRemaining = 0;
    this.state.feverCharge = 0;

    this.emit("fever:end", {
      reason,
      feverTier:
        this.state.feverTier,
      tier: this.state.feverTier
    });

    this.actions?.feverEnd(reason);
    this.state.feverTier = 0;
  }

  resetFever(reason) {
    this.state.lastCorrectAt = null;
    this.state.feverCharge = 0;

    if (this.state.feverActive) {
      this.endFever(reason);
    } else {
      this.emit("fever:charge", {
        charge: 0,
        required:
          this.feverSystem.values()
            .required
      });
    }
  }

  speak(category) {
    const line =
      this.dialogueSelector.pick(category);

    this.emit("toad:speak", line);

    return line;
  }

  submit(input) {
    if (
      this.submissionLocked ||
      this.state.feedbackPending ||
      this.state.status !== "running"
    ) {
      return {
        accepted: false,
        reason: this.state.status
      };
    }

    if (
      String(input ?? "").trim() === ""
    ) {
      return {
        accepted: false,
        reason: "empty"
      };
    }

    this.submissionLocked = true;

    try {
      const question = this.question;

      const result = evaluateAnswer(
        question,
        input
      );

      this.questionEngine.recordResult(
        question,
        result.correct
      );

      const responseMs = Math.max(
        0,
        Math.round(
          (
            this.timeLimit() -
            this.state
              .questionTimeRemaining
          ) * 1000
        )
      );

      this.state.lastResponseMs =
        responseMs;

      if (result.correct) {
        this.correct(
          question,
          responseMs
        );
      } else {
        this.wrong(
          question,
          "wrong",
          responseMs
        );
      }

      return {
        accepted: true,
        ...result,
        question,
        responseMs
      };
    } finally {
      this.submissionLocked = false;
    }
  }

  correct(question, responseMs) {
    this.state.combo += 1;

    this.state.bestCombo = Math.max(
      this.state.bestCombo,
      this.state.combo
    );

    this.state.correctInStage += 1;
    this.recordSessionAnswer(true);

    if (this.state.feverActive) {
      this.extendFever();
    } else {
      this.chargeFever();
    }

    const difficulty =
      this.difficultyConfig();

    const fever =
      this.feverSystem.values(
        this.state.combo
      );

    const scoreMultiplier =
      this.state.feverActive
        ? fever.scoreMultiplier
        : 1;

    const feverWater =
      this.state.feverActive
        ? fever.waterGainMultiplier
        : 1;

    const upgradeWater =
      1 +
      Math.min(
        0.5,
        (
          this.upgrades?.effect(
            "bucket_level",
            "correctWaterBonus"
          ) || 0
        ) +
          (
            this.upgrades?.effect(
              "water_power_level",
              "correctWaterBonus"
            ) || 0
          ) +
          (
            this.state.feverActive
              ? (
                  this.upgrades?.effect(
                    "water_power_level",
                    "feverWaterBonus"
                  ) || 0
                )
              : 0
          )
      );

    const baseWater =
      this.training.rules
        .correctWaterGain *
      difficulty.gainFactor *
      feverWater *
      upgradeWater;

    const action =
      this.actions?.correct({
        combo: this.state.combo,
        fever:
          this.state.feverActive,
        trainingId:
          this.state.trainingId,
        baseWaterGain: baseWater
      }) || {
        waterMultiplier: 1,
        scoreBonus: 0,
        beans: 0,
        critical: false
      };

    const waterGain =
      baseWater *
      action.waterMultiplier;

    const raw =
      this.config.baseCorrectScore +
      this.state.combo *
        this.config.comboScoreBonus *
        (
          1 +
          (
            this.upgrades?.effect(
              "spoon_level",
              "comboScoreBonus"
            ) || 0
          )
        ) +
      Math.round(
        this.state
          .questionTimeRemaining *
          this.config
            .timeScoreMultiplier
      );

    const scoreGain = Math.round(
      raw * scoreMultiplier +
        action.scoreBonus
    );

    this.state.water = clamp(
      this.state.water + waterGain,
      0,
      this.maxWater()
    );

    this.state.score += scoreGain;

    this.state.beansEarned +=
      action.beans || 0;

    const clearsTraining = this.state.correctInStage >= this.config.correctAnswersToClear;
    const completesFixedSession = this.completedFixedSession() && !clearsTraining;
    this.state.feedbackPending = !clearsTraining && !completesFixedSession;

    this.emit("answer:correct", {
      question,
      waterGain,
      combo: this.state.combo,
      scoreGain,
      responseMs,
      fever:
        this.state.feverActive,
      critical: action.critical,
      beansEarned:
        action.beans || 0
    });

    const category =
      action.critical
        ? "criticalWater"
        : this.state.feverActive
          ? "feverCorrect"
          : responseMs <=
              this.feverConfig
                .answerWindowSeconds *
                1000
            ? "fastCorrect"
            : this.state.combo >= 3
              ? "combo"
              : "normalCorrect";

    this.speak(category);

    if (clearsTraining) {
      this.clearTraining();
    } else if (completesFixedSession) {
      this.completeSession();
    } else {
      this.deferNextQuestion("correct");
    }
  }

  penalty(base) {
    const reduction = Math.min(
      0.4,
      this.upgrades?.effect(
        "toad_armor_level",
        "penaltyReduction"
      ) || 0
    );

    return (
      base *
      this.difficultyConfig()
        .penaltyFactor *
      (1 - reduction)
    );
  }

  wrong(
    question,
    reason,
    responseMs
  ) {
    const penalty = this.penalty(
      this.training.rules
        .wrongWaterPenalty
    );

    this.state.water = clamp(
      this.state.water - penalty,
      0,
      this.maxWater()
    );

    this.state.combo = 0;

    this.recordSessionAnswer(false);

    this.state.lastWrongQuestionId =
      question?.id || null;

    this.resetFever(reason);

    this.actions?.penalty({
      reason,
      trainingId:
        this.state.trainingId
    });

    this.state.feedbackPending = this.state.water > 0;

    this.emit("answer:wrong", {
      question,
      waterPenalty: penalty,
      reason,
      responseMs
    });

    if (this.state.water <= 0) {
      this.over("water_empty");
    } else if (this.completedFixedSession()) {
      this.completeSession();
    } else {
      this.speak("wrong");
      this.deferNextQuestion("wrong");
    }
  }

  timeout() {
    if (
      this.state.status !== "running"
    ) {
      return;
    }

    const question = this.question;

    const penalty = this.penalty(
      this.training.rules
        .timeoutWaterPenalty
    );

    this.questionEngine.recordResult(
      question,
      false
    );

    this.state.water = clamp(
      this.state.water - penalty,
      0,
      this.maxWater()
    );

    this.state.combo = 0;

    this.recordSessionAnswer(false, true);

    this.state.lastWrongQuestionId =
      question?.id || null;

    this.resetFever("timeout");

    this.actions?.penalty({
      reason: "timeout",
      trainingId:
        this.state.trainingId
    });

    this.state.feedbackPending = this.state.water > 0;

    this.emit("answer:timeout", {
      question,
      waterPenalty: penalty,
      responseMs:
        this.timeLimit() * 1000
    });

    if (this.state.water <= 0) {
      this.over("water_empty");
    } else if (this.completedFixedSession()) {
      this.completeSession();
    } else {
      this.speak("timeout");
      this.deferNextQuestion("timeout");
    }
  }

  deferNextQuestion(kind) {
    const advance = () => {
      if (["over", "cleared", "completed"].includes(this.state.status)) return;
      if (this.state.status === "paused") {
        this.advanceAfterResume = true;
        return;
      }
      if (this.state.status === "running" && this.state.feedbackPending) this.nextQuestion();
    };
    if (this.cadence?.schedule) this.cadence.schedule(kind, advance);
    else advance();
  }

  clearTraining() {
    this.cadence?.cancel?.();
    this.state.feedbackPending = false;
    this.state.status = "cleared";

    this.endFever("clear");

    const bonus =
      this.actions?.earn(
        25,
        "training_clear",
        this.state.trainingId
      ) || 0;

    this.state.beansEarned += bonus;

    this.emit("training:clear", {
      training: this.training,
      score: this.state.score,
      beansEarned: bonus
    });

    this.speak("gameClear");

    this.emit("game:clear", {
      score: this.state.score,
      training: this.training,
      beansEarned:
        this.state.beansEarned
    });
  }

  completeSession() {
    this.cadence?.cancel?.();
    this.state.feedbackPending = false;
    this.state.status = "completed";

    this.endFever("session_complete");

    this.emit("game:complete", {
      score: this.state.score,
      training: this.training,
      beansEarned: this.state.beansEarned
    });

    return this.snapshot();
  }

  pause() {
    if (
      this.state.status !== "running"
    ) {
      return false;
    }

    this.state.status = "paused";
    this.emit("game:pause");

    return true;
  }

  resume() {
    if (
      this.state.status !== "paused"
    ) {
      return false;
    }

    this.state.status = "running";
    this.emit("game:resume");
    if (this.advanceAfterResume) {
      this.advanceAfterResume = false;
      this.nextQuestion();
    }

    return true;
  }

  togglePause() {
    return this.state.status === "paused"
      ? this.resume()
      : this.pause();
  }

  over(reason = "ended") {
    if (
      ["over", "cleared", "completed"].includes(
        this.state.status
      )
    ) {
      return this.snapshot();
    }

    this.cadence?.cancel?.();
    this.state.feedbackPending = false;
    this.state.status = "over";

    this.endFever("game_over");
    this.speak("gameOver");

    this.emit("game:over", {
      reason,
      score: this.state.score,
      training: this.training,
      beansEarned:
        this.state.beansEarned
    });

    return this.snapshot();
  }
}
