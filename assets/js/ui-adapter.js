import { getInputDescriptor } from "./question-engine.js";
import { QuestionPresentation } from "./question-presentation.js";

const CHOICE_INPUT_MODES = new Set(["choice", "binary_choice", "multiple_choice"]);

export class UIAdapter {
  constructor(documentRef = document, { questionPresentation = new QuestionPresentation(documentRef) } = {}) {
    this.document = documentRef;
    this.$ = id => this.document.getElementById(id);
    this.handlers = {};
    this.questionPresentation = questionPresentation;
    this.choiceBox = null;
    this.currentInput = { inputMode: "text", choices: [], autoSubmit: false, keyboardShortcuts: [] };
  }

  bind(engine, handlers = {}) {
    this.engine = engine;
    this.handlers = handlers;
    this.$("ui-answerForm")?.addEventListener("submit", event => {
      event.preventDefault();
      handlers.submit?.();
    });
    this.$("startButton")?.addEventListener("click", () => handlers.start?.());
    engine.on("game:start", detail => {
      this.hideOverlay();
      this.render(detail.state);
    });
    engine.on("question:changed", () => this.render());
    engine.on("answer:correct", detail => this.feedback(`✓ 정답! 물 +${Math.round(detail.waterGain)}% · 점수 +${detail.scoreGain}`, "correct"));
    engine.on("answer:wrong", detail => this.feedback(`✕ 오답 · 물 -${Math.round(detail.waterPenalty)}%`, "wrong"));
    engine.on("answer:timeout", detail => this.feedback(`⌛ 시간 초과 · 물 -${Math.round(detail.waterPenalty)}%`, "wrong"));
    engine.on("training:clear", detail => this.feedback(`${this.trainingLabel(detail.training.title)} 장독대 채우기 완료!`, "correct"));
    engine.on("game:over", detail => this.showResult("게임 오버", detail.state));
    engine.on("game:clear", detail => this.showResult("장독대 채우기 완료", detail.state));
    engine.on("fever:start", detail => this.feedback(`🔥 피버 시작! 점수 ${detail.scoreMultiplier}배`, "correct"));
    engine.on("toad:speak", detail => this.text("ui-toadSpeech", detail.text));
  }

  trainingLabel(value) {
    return String(value || "화학").replace(/\s*(?:훈련|장독대 채우기)\s*$/, " ").trim();
  }

  installTrainingSelector(modes, selectedId, onChange) {
    const story = this.$("startOverlay")?.querySelector(".start-story");
    const button = this.$("startButton");
    if (!button || this.$("ui-trainingSelect")) return;
    const select = this.document.createElement("select");
    select.id = "ui-trainingSelect";
    select.hidden = true;
    select.innerHTML = '<option value="">채울 장독대를 선택하세요</option>';
    for (const mode of modes) {
      const option = this.document.createElement("option");
      option.value = mode.id;
      option.textContent = `${mode.category} · ${mode.title}`;
      select.append(option);
    }
    select.value = selectedId || "";
    select.addEventListener("change", () => onChange?.(select.value));
    (story || button.parentElement)?.insertBefore(select, button);
  }

  installDifficulty(value = "normal", onChange) {
    const button = this.$("startButton");
    if (!button || this.$("ui-difficultySelect")) return;
    const select = this.document.createElement("select");
    select.id = "ui-difficultySelect";
    select.hidden = true;
    select.innerHTML = '<option value="easy">쉬움</option><option value="normal">보통</option><option value="hard">어려움</option>';
    select.value = value;
    select.addEventListener("change", () => onChange?.(select.value));
    button.parentElement?.insertBefore(select, button);
  }

  answer() {
    return this.$("answerInput")?.value || "";
  }

  clearAnswer() {
    const input = this.$("answerInput");
    if (!input) return;
    input.value = "";
    if (!input.hidden) input.focus();
  }

  chooseShortcut(key) {
    const choice = this.currentInput.choices.find(item => item.key === String(key));
    if (!choice || this.engine.state.status !== "running" || this.engine.state.feedbackPending) return false;
    this.handlers.submit?.(choice.key);
    return true;
  }

  render(state = this.engine.snapshot()) {
    const training = this.engine.training;
    const question = this.engine.question;
    this.text("stageNumber", `${this.trainingLabel(training?.title)} 장독대 채우기`);
    this.text("waterValue", Math.round(state.water));
    this.text("comboValue", state.combo);
    this.text("scoreValue", Math.round(state.score));
    this.text("correctInStage", state.correctInStage);
    this.text("categoryLabel", `${training?.category || "화학"} · ${this.trainingLabel(training?.title)} 장독대 채우기`);
    this.text("stageDescription", training?.description || "");
    this.question("questionText", question);
    this.text("ui-questionType", ["binary_choice", "multiple_choice"].includes(question?.type) ? "선택형" : "직접 입력");
    this.text("leakRateText", `초당 ${this.engine.leakPerSecond().toFixed(1)}%`);
    this.text("timeText", `${state.questionTimeRemaining.toFixed(1)}초`);
    this.text("timerBadge", `${Math.ceil(state.questionTimeRemaining)}초`);
    this.width("timeBar", this.engine.timeLimit() ? state.questionTimeRemaining / this.engine.timeLimit() * 100 : 0);
    this.width("stageProgress", state.correctInStage / state.correctAnswersPerStage * 100);
    const visual = this.$("visualStage");
    visual?.classList.toggle("warning", state.water <= 50);
    visual?.classList.toggle("critical", state.water <= 25);
    this.renderInput(question);
    const disabled = state.status !== "running" || state.feedbackPending;
    if (this.$("answerInput")) this.$("answerInput").disabled = disabled;
    if (this.$("submitButton")) this.$("submitButton").disabled = disabled;
    this.choiceBox?.querySelectorAll("button").forEach(button => { button.disabled = disabled; });
  }

  renderInput(question) {
    this.currentInput = getInputDescriptor(question);
    if (!this.choiceBox) {
      this.choiceBox = this.document.createElement("div");
      this.choiceBox.id = "ui-choiceOptions";
      this.choiceBox.setAttribute("role", "group");
      this.choiceBox.setAttribute("aria-label", "답안 선택");
      this.$("answerInput")?.insertAdjacentElement("beforebegin", this.choiceBox);
    }
    this.choiceBox.replaceChildren();
    const choiceMode = CHOICE_INPUT_MODES.has(this.currentInput.inputMode);
    const input = this.$("answerInput");
    const submit = this.$("submitButton");
    this.choiceBox.closest(".question-answer-card")?.classList.toggle("has-choice-options", choiceMode);
    this.choiceBox.hidden = !choiceMode;
    if (input) {
      input.hidden = choiceMode;
      input.inputMode = this.currentInput.inputMode === "decimal" ? "decimal" : question?.type === "numeric" ? "numeric" : "text";
    }
    if (submit) submit.hidden = choiceMode;
    if (!choiceMode) return;

    const choiceCount = this.currentInput.choices.length;
    this.choiceBox.dataset.choiceCount = String(choiceCount);
    this.choiceBox.style.gridTemplateColumns = choiceCount === 3
      ? "repeat(3, minmax(0, 1fr))"
      : "";

    for (const choice of this.currentInput.choices) {
      const button = this.document.createElement("button");
      button.type = "button";
      button.dataset.choiceKey = choice.key;
      button.setAttribute("aria-label", `${choice.key}번 ${choice.label}`);
      button.textContent = `${choice.key}. ${choice.label}`;
      button.addEventListener("click", () => this.handlers.submit?.(choice.key));
      this.choiceBox.append(button);
    }
  }

  feedback(message, mode = "") {
    const element = this.$("feedback");
    if (!element) return;
    if (element.textContent !== message) element.textContent = message;
    element.className = `feedback ${mode}`;
  }

  showResult(title, state) {
    const panel = this.$("resultPanel");
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.replaceChildren();
    const heading = this.document.createElement("h2");
    const text = this.document.createElement("p");
    const button = this.document.createElement("button");
    heading.textContent = title;
    text.textContent = `점수 ${Math.round(state.score)} · 최고 콤보 ${state.bestCombo || state.combo} · 획득 콩 ${state.beansEarned || 0}`;
    button.type = "button";
    button.id = "ui-restartGameButton";
    button.textContent = "같은 장독대 다시 채우기";
    button.addEventListener("click", () => this.handlers.restart?.());
    panel.append(heading, text, button);
  }

  hideOverlay() {
    this.$("startOverlay")?.classList.add("hidden");
    this.$("resultPanel")?.classList.add("hidden");
  }

  question(id, question) {
    const element = this.$(id);
    if (!element) return;
    element.dataset.presentation = question?.presentation?.kind || "text";
    if (this.questionPresentation?.render(element, question)) return;
    if (question?.promptHtml) {
      if (element.innerHTML !== question.promptHtml) element.innerHTML = question.promptHtml;
      return;
    }
    const next = String(question?.prompt || "출제 가능한 문항이 없습니다.");
    if (element.textContent !== next) element.textContent = next;
  }

  text(id, value) {
    const element = this.$(id);
    const next = String(value);
    if (element && element.textContent !== next) element.textContent = next;
  }

  width(id, value) {
    const element = this.$(id);
    if (!element) return;
    const next = `${Math.max(0, Math.min(100, value))}%`;
    if (element.style.width !== next) element.style.width = next;
  }
}
