import { SUBJECTS, QUESTION_TYPES, suggestQuestionId, editorFromQuestion, buildProductionQuestion, validateEditor, cloneEditor, parseImportedQuestion, createTrainingMode, slug } from "./core.js";

const $ = id => document.getElementById(id);
const state = { catalog: null, editor: null, selectedAsset: "", operation: "create", newMode: false, previewReady: false };
const subjectSelect = $("subject");
const categorySelect = $("category");
const questionSelect = $("existingQuestion");

function option(value, label = value) { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; }
function subjectData() { return state.catalog.subjects[subjectSelect.value]; }
function modes() { return subjectData()?.modes || []; }
function selectedMode() { return modes().find(mode => mode.id === categorySelect.value) || null; }
function questions() { return subjectData()?.questions || []; }

async function initialize() {
  const response = await fetch("/api/catalog");
  if (!response.ok) throw new Error((await response.json()).error);
  state.catalog = await response.json();
  $("targetFile").textContent = state.catalog.target;
  subjectSelect.replaceChildren(...SUBJECTS.map(item => option(item.id, item.label)));
  $("questionType").replaceChildren(...QUESTION_TYPES.map(item => option(item.id, item.label)));
  subjectSelect.value = "chemistry";
  refreshCategories();
  renderAssetFilters();
  newQuestion();
  bind();
  setStatus("준비 완료");
}

function refreshCategories() {
  const previous = categorySelect.value;
  categorySelect.replaceChildren(...modes().map(mode => option(mode.id, `${mode.category} · ${mode.shortTitle || mode.title}`)));
  if (modes().some(mode => mode.id === previous)) categorySelect.value = previous;
  refreshQuestions();
}

function refreshQuestions() {
  const trainingId = categorySelect.value;
  questionSelect.replaceChildren(option("", "새 문제"), ...questions().filter(question => question.trainingId === trainingId).map(question => option(question.id, `${question.id} · ${question.prompt.slice(0, 34)}`)));
}

function blankEditor() {
  const mode = selectedMode();
  const subjectId = subjectSelect.value;
  const ids = questions().map(item => item.id);
  return {
    subjectId, category: mode?.category || "", trainingId: mode?.id || "", id: mode ? suggestQuestionId(mode.id, ids) : "",
    difficulty: 1, type: "multiple_choice", prompt: "", choices: ["", "", "", ""], correctIndex: -1,
    answer: "", explanation: "", tags: [], asset: "", imageAlt: "", sourceLabel: "", original: null
  };
}

function newQuestion() {
  state.operation = "create"; state.newMode = false; state.editor = blankEditor(); state.selectedAsset = "";
  questionSelect.value = ""; $("newCategoryFields").hidden = true; syncFormFromEditor();
}

function loadQuestion(id) {
  const question = questions().find(item => item.id === id);
  if (!question) return newQuestion();
  const mode = modes().find(item => item.id === question.trainingId);
  state.operation = "update"; state.newMode = false;
  state.editor = editorFromQuestion(question, subjectSelect.value, mode?.category || "");
  state.selectedAsset = state.editor.asset; syncFormFromEditor();
}

function syncFormFromEditor() {
  const editor = state.editor;
  $("difficulty").value = editor.difficulty; $("questionId").value = editor.id; $("questionType").value = editor.type;
  $("prompt").value = editor.prompt; $("explanation").value = editor.explanation; $("directAnswer").value = editor.answer;
  $("tags").value = editor.tags.join(", "); $("imageAlt").value = editor.imageAlt; $("sourceLabel").value = editor.sourceLabel;
  $("editMode").textContent = state.operation === "update" ? "기존 문제 수정" : "신규 추가";
  renderChoices(); updateAssetSelection(); refreshPreview();
}

function readForm() {
  const editor = state.editor;
  editor.subjectId = subjectSelect.value; editor.trainingId = state.newMode ? $("newTrainingId").value.trim() : categorySelect.value;
  editor.category = state.newMode ? $("newCategoryName").value.trim() : selectedMode()?.category || "";
  editor.id = $("questionId").value.trim(); editor.difficulty = Number($("difficulty").value); editor.type = $("questionType").value;
  editor.prompt = $("prompt").value; editor.explanation = $("explanation").value; editor.answer = $("directAnswer").value;
  editor.tags = $("tags").value.split(",").map(value => value.trim()).filter(Boolean); editor.asset = state.selectedAsset;
  editor.imageAlt = $("imageAlt").value; editor.sourceLabel = $("sourceLabel").value;
  editor.choices = [...document.querySelectorAll("[data-choice-input]")].map(input => input.value);
  const checked = document.querySelector("[name=correctChoice]:checked"); editor.correctIndex = checked ? Number(checked.value) : -1;
  return editor;
}

function renderChoices() {
  const choiceMode = ["multiple_choice", "binary_choice"].includes(state.editor.type);
  $("choices").hidden = !choiceMode; $("addChoiceButton").hidden = !choiceMode; $("directAnswerLabel").hidden = choiceMode;
  if (!choiceMode) return $("choices").replaceChildren();
  const rows = state.editor.choices.map((choice, index) => {
    const row = document.createElement("div"); row.className = "choice-row";
    const radio = document.createElement("input"); radio.type = "radio"; radio.name = "correctChoice"; radio.value = index; radio.checked = index === state.editor.correctIndex; radio.setAttribute("aria-label", `${index + 1}번 정답`);
    const input = document.createElement("input"); input.value = choice; input.dataset.choiceInput = ""; input.placeholder = `선택지 ${index + 1}`;
    const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "−"; remove.disabled = state.editor.choices.length <= 2;
    remove.addEventListener("click", () => { state.editor.choices.splice(index, 1); if (state.editor.correctIndex === index) state.editor.correctIndex = -1; renderChoices(); refreshPreview(); });
    [radio, input].forEach(node => node.addEventListener("input", refreshPreview)); row.append(radio, input, remove); return row;
  });
  $("choices").replaceChildren(...rows);
}

function renderAssetFilters() {
  const folders = [...new Set(state.catalog.assets.map(asset => asset.folder))].sort((a, b) => a.localeCompare(b, "ko"));
  $("assetFolder").append(...folders.map(folder => option(folder)));
  renderAssets();
}

function renderAssets() {
  const search = $("assetSearch").value.trim().toLowerCase(); const folder = $("assetFolder").value; const subjectId = subjectSelect.value;
  const visible = state.catalog.assets.filter(asset => (asset.subject === "shared" || asset.subject === subjectId) && (!folder || asset.folder === folder) && (!search || asset.path.toLowerCase().includes(search))).slice(0, 80);
  $("assetGrid").replaceChildren(...visible.map(asset => {
    const button = document.createElement("button"); button.type = "button"; button.title = asset.path; button.className = asset.path === state.selectedAsset ? "selected" : "";
    const image = document.createElement("img"); image.src = `../../${asset.path}`; image.alt = asset.name; image.loading = "lazy";
    const label = document.createElement("span"); label.textContent = asset.name; button.append(image, label);
    button.addEventListener("click", () => { state.selectedAsset = asset.path; state.editor.asset = asset.path; updateAssetSelection(); renderAssets(); refreshPreview(); }); return button;
  }));
}

function updateAssetSelection() {
  $("assetPath").textContent = state.selectedAsset || "연결된 asset 없음";
  $("selectedAssetPreview").hidden = !state.selectedAsset;
  if (state.selectedAsset) $("selectedAssetPreview").src = `../../${state.selectedAsset}`;
}

function validationErrors() {
  const editor = readForm();
  return validateEditor(editor, { mode: state.operation, ids: questions().map(item => item.id), assets: state.catalog.assets.map(item => item.path) });
}

function refreshPreview() {
  if (!state.editor) return;
  const errors = validationErrors();
  $("validation").className = `validation ${errors.length ? "has-errors" : "valid"}`;
  $("validation").innerHTML = errors.length ? `<strong>저장 전 확인</strong><ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}</ul>` : "✓ 현재 renderer에서 처리 가능한 production schema입니다.";
  const question = buildProductionQuestion(state.editor); $("jsonPreview").textContent = JSON.stringify(question, null, 2);
  if (state.previewReady) $("previewFrame").contentWindow.postMessage({ type: "quiz-maker-preview", question, subjectId: state.editor.subjectId, training: selectedMode() }, "*");
}

async function save() {
  const errors = validationErrors(); if (errors.length) return setStatus(`저장 실패 · ${errors[0]}`, true);
  const question = buildProductionQuestion(state.editor);
  const trainingMode = state.newMode ? createTrainingMode({ id: state.editor.trainingId, title: $("newTrainingTitle").value, category: state.editor.category }) : null;
  setStatus("저장 중…");
  const response = await fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectId: state.editor.subjectId, question, operation: state.operation, trainingMode }) });
  const body = await response.json(); if (!response.ok) return setStatus(`저장 실패 · ${body.error}`, true);
  setStatus(`저장 완료 · ${body.result.id}`); await reloadCatalog(body.result.id);
}

async function reloadCatalog(selectedId) { const response = await fetch("/api/catalog"); state.catalog = await response.json(); refreshCategories(); questionSelect.value = selectedId; loadQuestion(selectedId); }
function setStatus(message, error = false) { $("saveState").textContent = message; $("saveState").classList.toggle("error", error); }

function bind() {
  subjectSelect.addEventListener("change", () => { refreshCategories(); renderAssets(); newQuestion(); });
  categorySelect.addEventListener("change", () => { refreshQuestions(); newQuestion(); }); questionSelect.addEventListener("change", () => loadQuestion(questionSelect.value));
  $("newButton").addEventListener("click", newQuestion); $("duplicateButton").addEventListener("click", () => { state.editor = cloneEditor(readForm(), questions().map(item => item.id)); state.operation = "create"; syncFormFromEditor(); });
  $("suggestIdButton").addEventListener("click", () => { $("questionId").value = suggestQuestionId(state.newMode ? $("newTrainingId").value : categorySelect.value, questions().map(item => item.id)); refreshPreview(); });
  $("questionType").addEventListener("change", () => { state.editor.type = $("questionType").value; if (state.editor.type === "binary_choice") state.editor.choices = ["O", "X"]; renderChoices(); refreshPreview(); });
  $("addChoiceButton").addEventListener("click", () => { readForm(); state.editor.choices.push(""); renderChoices(); });
  $("newCategoryButton").addEventListener("click", () => { state.newMode = !state.newMode; $("newCategoryFields").hidden = !state.newMode; if (state.newMode) { $("newTrainingId").value = `${subjectSelect.value.replace("-", "_")}_${slug("new-category")}`; $("newCategoryName").value = "새 category"; } refreshPreview(); });
  $("clearAssetButton").addEventListener("click", () => { state.selectedAsset = ""; updateAssetSelection(); renderAssets(); refreshPreview(); });
  $("assetSearch").addEventListener("input", renderAssets); $("assetFolder").addEventListener("change", renderAssets);
  $("saveButton").addEventListener("click", save); document.querySelectorAll("input,textarea,select").forEach(node => node.addEventListener("input", () => { if (state.editor) refreshPreview(); }));
  window.addEventListener("message", event => { if (event.data?.type === "quiz-maker-preview-ready") { state.previewReady = true; refreshPreview(); } });
  const previewFrame = $("previewFrame");
  previewFrame.addEventListener("load", () => { state.previewReady = true; refreshPreview(); });
  if (previewFrame.contentDocument?.readyState === "complete") { state.previewReady = true; refreshPreview(); }
  document.querySelectorAll("[data-preview]").forEach(button => button.addEventListener("click", () => { document.querySelectorAll("[data-preview]").forEach(item => item.classList.toggle("active", item === button)); $("previewShell").className = `preview-shell ${button.dataset.preview}`; }));
  $("copyJsonButton").addEventListener("click", () => navigator.clipboard.writeText($("jsonPreview").textContent).then(() => setStatus("JSON 복사 완료")));
  $("downloadJsonButton").addEventListener("click", () => { const blob = new Blob([$("jsonPreview").textContent], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${state.editor.id || "question"}.json`; link.click(); URL.revokeObjectURL(link.href); });
  $("importButton").addEventListener("click", () => { try { state.editor = parseImportedQuestion($("importText").value, subjectSelect.value, selectedMode()?.category || "", modes().map(item => item.id)); state.operation = questions().some(item => item.id === state.editor.id) ? "update" : "create"; state.selectedAsset = state.editor.asset; syncFormFromEditor(); setStatus("JSON 불러오기 완료"); } catch (error) { setStatus(error.message, true); } });
  document.addEventListener("keydown", event => { if (event.ctrlKey && event.key.toLowerCase() === "s") { event.preventDefault(); save(); } if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") { event.preventDefault(); $("duplicateButton").click(); } });
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
initialize().catch(error => setStatus(`초기화 실패 · ${error.message}`, true));
