export const SUBJECTS = Object.freeze([
  { id: "physics", label: "물리학" },
  { id: "chemistry", label: "화학" },
  { id: "biology", label: "생명과학" },
  { id: "earth-science", label: "지구과학" }
]);

export const QUESTION_TYPES = Object.freeze([
  { id: "multiple_choice", label: "객관식" },
  { id: "binary_choice", label: "2지선다" },
  { id: "short_answer", label: "단답형" },
  { id: "numeric", label: "숫자 입력" },
  { id: "ordered_coefficients", label: "반응식 계수" },
  { id: "formula_input", label: "화학식 입력" }
]);

const SUBJECT_IDS = new Set(SUBJECTS.map(item => item.id));
const CHOICE_TYPES = new Set(["multiple_choice", "binary_choice"]);

export function slug(value) {
  return String(value || "quiz")
    .normalize("NFKD")
    .replace(/[^\w가-힣-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "quiz";
}

export function suggestQuestionId(trainingId, ids = []) {
  const prefix = slug(trainingId).replace(/-/g, "_");
  let largest = 0;
  for (const id of ids) {
    const match = String(id).match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:_|-)(\\d+)$`));
    if (match) largest = Math.max(largest, Number(match[1]));
  }
  return `${prefix}_${String(largest + 1).padStart(3, "0")}`;
}

export function normalizeChoices(question = {}) {
  return (question.choices || []).map((choice, index) => typeof choice === "object"
    ? { key: String(choice.key ?? index + 1), label: String(choice.label ?? choice.value ?? ""), value: String(choice.value ?? choice.label ?? "") }
    : { key: String(index + 1), label: String(choice), value: String(choice) });
}

export function editorFromQuestion(question, subjectId, category = "") {
  const choices = normalizeChoices(question);
  const correctIndex = question.type === "binary_choice"
    ? choices.findIndex(choice => choice.key === String(question.correctChoice))
    : Number(question.correctChoice ?? 0);
  return {
    subjectId,
    category,
    trainingId: question.trainingId || "",
    id: question.id || "",
    difficulty: Number(question.difficulty || 1),
    type: question.type || "multiple_choice",
    prompt: question.prompt || "",
    choices: choices.map(choice => choice.label),
    correctIndex: Math.max(0, correctIndex),
    answer: question.answers?.[0] ?? "",
    explanation: question.explanation || "",
    tags: Array.isArray(question.tags) ? [...question.tags] : [],
    asset: question.presentation?.image || question.image || "",
    imageAlt: question.presentation?.imageAlt || question.imageAlt || "",
    sourceLabel: question.presentation?.sourceLabel || question.sourceLabel || "",
    original: structuredCloneSafe(question)
  };
}

export function buildProductionQuestion(editor) {
  const type = editor.type;
  const choiceMode = CHOICE_TYPES.has(type);
  const choices = (editor.choices || []).map(value => String(value).trim());
  const correctIndex = Number(editor.correctIndex);
  const base = editor.original ? structuredCloneSafe(editor.original) : {};
  const answer = choiceMode ? choices[correctIndex] : String(editor.answer ?? "").trim();
  const result = {
    ...base,
    id: String(editor.id || "").trim(),
    trainingId: String(editor.trainingId || "").trim(),
    difficulty: Number(editor.difficulty),
    type,
    prompt: String(editor.prompt || "").trim(),
    answers: [answer],
    explanation: String(editor.explanation || "").trim(),
    tags: Array.isArray(editor.tags) ? editor.tags.map(String).map(tag => tag.trim()).filter(Boolean) : [],
    sourceLevel: base.sourceLevel || subjectSourceLevel(editor.subjectId),
    inputMode: choiceMode ? type : (base.type === type && base.inputMode ? base.inputMode : type === "numeric" ? "numeric_keypad" : type === "ordered_coefficients" ? "coefficient_keypad" : type === "formula_input" ? "formula_keyboard" : "text_keyboard"),
    autoSubmit: choiceMode,
    allowedKeys: choiceMode ? choices.map((_, index) => String(index + 1)) : (base.allowedKeys || []),
  };
  if (choiceMode) {
    result.choices = choices;
    result.correctChoice = type === "binary_choice" ? String(correctIndex + 1) : correctIndex;
    result.keyboardShortcuts = choices.map((_, index) => String(index + 1));
  } else {
    delete result.choices;
    delete result.correctChoice;
    delete result.keyboardShortcuts;
  }
  if (editor.asset) {
    result.presentation = {
      kind: "source-image",
      image: editor.asset,
      imageAlt: String(editor.imageAlt || ""),
      sourceLabel: String(editor.sourceLabel || "")
    };
  } else {
    delete result.presentation;
    delete result.image;
    delete result.imageAlt;
    delete result.sourceLabel;
  }
  return result;
}

export function validateEditor(editor, context = {}) {
  const errors = [];
  const ids = new Set(context.ids || []);
  const assets = new Set(context.assets || []);
  const choices = (editor.choices || []).map(value => String(value).trim());
  if (!SUBJECT_IDS.has(editor.subjectId)) errors.push("과목을 선택하세요.");
  if (!String(editor.category || "").trim()) errors.push("category를 선택하세요.");
  if (!String(editor.trainingId || "").trim()) errors.push("문제 분류 ID가 없습니다.");
  if (![1, 2, 3].includes(Number(editor.difficulty))) errors.push("난이도는 1~3이어야 합니다.");
  if (!String(editor.id || "").trim()) errors.push("문제 ID가 없습니다.");
  if (context.mode !== "update" && ids.has(String(editor.id).trim())) errors.push(`${editor.id} ID가 이미 존재합니다.`);
  if (!String(editor.prompt || "").trim()) errors.push("문제 본문이 비어 있습니다.");
  if (CHOICE_TYPES.has(editor.type)) {
    const minimum = editor.type === "binary_choice" ? 2 : 2;
    if (choices.length < minimum) errors.push(`선택지는 최소 ${minimum}개가 필요합니다.`);
    choices.forEach((choice, index) => { if (!choice) errors.push(`선택지 ${index + 1}의 내용이 비어 있습니다.`); });
    const nonempty = choices.filter(Boolean);
    if (new Set(nonempty).size !== nonempty.length) errors.push("동일한 선택지가 중복되어 있습니다.");
    if (!Number.isInteger(Number(editor.correctIndex)) || Number(editor.correctIndex) < 0 || Number(editor.correctIndex) >= choices.length) errors.push("정답을 지정하세요.");
  } else if (!String(editor.answer ?? "").trim()) {
    errors.push("정답을 입력하세요.");
  }
  if (!String(editor.explanation || "").trim()) errors.push("해설이 비어 있습니다.");
  if (editor.asset && !assets.has(editor.asset)) errors.push(`${editor.asset} 파일을 찾을 수 없습니다.`);
  try {
    const question = buildProductionQuestion(editor);
    if (CHOICE_TYPES.has(question.type) && !question.choices?.[Number(editor.correctIndex)]) errors.push("renderer가 처리할 수 없는 정답 index입니다.");
  } catch (error) {
    errors.push(`schema 변환 실패: ${error.message}`);
  }
  return [...new Set(errors)];
}

export function cloneEditor(editor, ids = []) {
  const copy = structuredCloneSafe(editor);
  copy.id = suggestQuestionId(copy.trainingId, ids);
  copy.original = null;
  return copy;
}

export function parseImportedQuestion(text, subjectId, category, knownTrainingIds = []) {
  let question;
  try { question = JSON.parse(text); } catch { throw new Error("올바른 JSON이 아닙니다."); }
  if (!question || Array.isArray(question) || typeof question !== "object") throw new Error("문제 객체 하나를 입력하세요.");
  if (!question.id || !question.trainingId || !question.type || !question.prompt) throw new Error("production schema의 필수 필드가 없습니다.");
  if (knownTrainingIds.length && !knownTrainingIds.includes(question.trainingId)) throw new Error(`알 수 없는 분류: ${question.trainingId}`);
  return editorFromQuestion(question, subjectId, category);
}

export function createTrainingMode({ id, title, category, description = "Quiz Maker에서 추가한 퀴즈", icon = "quiz" }) {
  return {
    id: String(id).trim(), title: `${String(title).trim()} 장독대 채우기`, shortTitle: String(title).trim(),
    shortDescription: String(description).trim(), description: String(description).trim(), category: String(category).trim(), icon,
    unlocked: true, recommendedDifficulty: "normal", difficultyLevels: ["easy", "normal", "hard"],
    questionSource: "quizMakerAuthoredQuestions",
    rules: { initialWater: 70, correctWaterGain: 18, wrongWaterPenalty: 8, timeoutWaterPenalty: 10, leakPerSecond: 1.5, feverWindowSeconds: 4, feverRequiredCombo: 3 }
  };
}

function subjectSourceLevel(subjectId) {
  return ({ physics: "physics", chemistry: "chemistry", biology: "biology", "earth-science": "earth_science" })[subjectId] || "science";
}

function structuredCloneSafe(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
