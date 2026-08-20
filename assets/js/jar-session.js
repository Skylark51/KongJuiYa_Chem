export const TRAINING_SELECTION_KEY = "kongjuiya-training-selection";

const LEVELS = Object.freeze(["easy", "normal", "hard"]);
const LEVEL_NUMBER = Object.freeze({ easy: 1, normal: 2, hard: 3 });

export const SESSION_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({
    label: "쉬움",
    description: "쉬운 문제만",
    ratios: Object.freeze({ easy: 1, normal: 0, hard: 0 })
  }),
  normal: Object.freeze({
    label: "보통",
    description: "쉬움 50% + 보통 50%",
    ratios: Object.freeze({ easy: 0.5, normal: 0.5, hard: 0 })
  }),
  hard: Object.freeze({
    label: "어려움",
    description: "쉬움 20% + 보통 30% + 어려움 50%",
    ratios: Object.freeze({ easy: 0.2, normal: 0.3, hard: 0.5 })
  })
});

const fallbackOrder = Object.freeze({
  easy: Object.freeze(["easy", "normal", "hard"]),
  normal: Object.freeze(["normal", "easy", "hard"]),
  hard: Object.freeze(["hard", "normal", "easy"])
});

const safeCount = value => Math.max(0, Math.round(Number(value) || 0));
const safeRandom = random => typeof random === "function" ? random : Math.random;

export function isSessionDifficulty(value) {
  return Object.hasOwn(SESSION_DIFFICULTIES, value);
}

export function difficultyLabel(value) {
  return SESSION_DIFFICULTIES[value]?.label || SESSION_DIFFICULTIES.normal.label;
}

export function readTrainingSelection(storage = globalThis.sessionStorage) {
  try {
    const value = JSON.parse(storage?.getItem(TRAINING_SELECTION_KEY) || "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export function writeTrainingSelection(selection, storage = globalThis.sessionStorage) {
  const trainingId = String(selection?.trainingId || "").trim();
  const difficulty = selection?.difficulty;
  if (!trainingId || !isSessionDifficulty(difficulty)) return null;
  const value = {
    trainingId,
    difficulty,
    resume: Boolean(selection?.resume)
  };
  try {
    storage?.setItem(TRAINING_SELECTION_KEY, JSON.stringify(value));
  } catch {
    // The query string still carries the selected training when session storage is unavailable.
  }
  return value;
}

export function clearTrainingSelection(storage = globalThis.sessionStorage) {
  try {
    storage?.removeItem(TRAINING_SELECTION_KEY);
  } catch {
    // Session storage can be unavailable in private or restricted contexts.
  }
}

export function calculateDifficultyQuota(questionCount, difficulty) {
  const total = safeCount(questionCount);
  const selected = isSessionDifficulty(difficulty) ? difficulty : "normal";
  const ratios = SESSION_DIFFICULTIES[selected].ratios;
  const values = LEVELS.map(level => ({
    level,
    raw: total * ratios[level],
    count: Math.floor(total * ratios[level])
  }));
  let remaining = total - values.reduce((sum, value) => sum + value.count, 0);
  values
    .slice()
    .sort((left, right) => (right.raw - Math.floor(right.raw)) - (left.raw - Math.floor(left.raw)) || LEVELS.indexOf(left.level) - LEVELS.indexOf(right.level))
    .forEach(value => {
      if (remaining <= 0) return;
      value.count += 1;
      remaining -= 1;
    });
  return Object.freeze(Object.fromEntries(values.map(value => [value.level, value.count])));
}

export function shuffleSessionQuestions(items, random = Math.random) {
  const result = [...items];
  const nextRandom = safeRandom(random);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(nextRandom() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function questionLevel(question) {
  return LEVELS.find(level => LEVEL_NUMBER[level] === Number(question?.difficulty)) || null;
}

function takeUnique(pool, amount, used, random) {
  if (amount <= 0) return [];
  const selected = [];
  for (const question of shuffleSessionQuestions(pool.filter(item => !used.has(item.id)), random)) {
    if (selected.length >= amount) break;
    used.add(question.id);
    selected.push(question);
  }
  return selected;
}

export function buildDifficultyQuestionSession(questions, {
  trainingId,
  difficulty = "normal",
  questionCount,
  random = Math.random
} = {}) {
  const selectedDifficulty = isSessionDifficulty(difficulty) ? difficulty : "normal";
  const totalQuestions = safeCount(questionCount);
  const bank = Array.isArray(questions)
    ? questions.filter(question => question?.id && question.trainingId === trainingId && questionLevel(question))
    : [];
  if (!bank.length) throw new Error(`훈련에 출제 가능한 문항이 없습니다: ${trainingId || "(없음)"}`);

  const requested = calculateDifficultyQuota(totalQuestions, selectedDifficulty);
  const grouped = Object.fromEntries(LEVELS.map(level => [level, bank.filter(question => questionLevel(question) === level)]));
  const used = new Set();
  const selected = [];
  const actual = { easy: 0, normal: 0, hard: 0 };
  let repeatedQuestions = false;

  for (const level of LEVELS) {
    const picked = takeUnique(grouped[level], requested[level], used, random);
    selected.push(...picked);
    actual[level] += picked.length;
  }

  for (const requestedLevel of LEVELS) {
    let deficit = requested[requestedLevel] - selected.filter(question => questionLevel(question) === requestedLevel).length;
    if (deficit <= 0) continue;
    for (const fallbackLevel of fallbackOrder[requestedLevel]) {
      if (deficit <= 0) break;
      const picked = takeUnique(grouped[fallbackLevel], deficit, used, random);
      selected.push(...picked);
      actual[fallbackLevel] += picked.length;
      deficit -= picked.length;
    }
  }

  while (selected.length < totalQuestions) {
    const candidates = shuffleSessionQuestions(bank, random).filter(question => question.id !== selected.at(-1)?.id);
    const fallback = candidates[0] || bank[0];
    selected.push(fallback);
    actual[questionLevel(fallback)] += 1;
    repeatedQuestions = true;
  }

  const queue = shuffleSessionQuestions(selected, random);
  return Object.freeze({
    trainingId,
    selectedDifficulty,
    totalQuestions,
    requestedQuota: Object.freeze({ ...requested }),
    actualQuota: Object.freeze({ ...actual }),
    fallbackUsed: repeatedQuestions || LEVELS.some(level => requested[level] !== actual[level]),
    questionIds: Object.freeze(queue.map(question => question.id)),
    questions: Object.freeze(queue)
  });
}

function ensureDifficultySelector(documentRef) {
  let dialog = documentRef.getElementById("jarDifficultyDialog");
  if (dialog) return dialog;
  if (!documentRef.querySelector('link[data-jar-session-style="true"]')) {
    const stylesheet = documentRef.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.dataset.jarSessionStyle = "true";
    stylesheet.href = new URL("../css/jar-session.css", import.meta.url).href;
    documentRef.head.append(stylesheet);
  }
  dialog = documentRef.createElement("dialog");
  dialog.id = "jarDifficultyDialog";
  dialog.className = "jar-difficulty-dialog";
  dialog.setAttribute("aria-labelledby", "jarDifficultyTitle");
  dialog.innerHTML = `
    <form method="dialog" class="jar-difficulty-form">
      <button class="jar-difficulty-close" value="cancel" aria-label="난이도 선택 닫기">×</button>
      <p class="jar-difficulty-eyebrow">JAR SESSION</p>
      <h2 id="jarDifficultyTitle">장독대 난이도를 고르세요</h2>
      <p id="jarDifficultyDescription" class="jar-difficulty-description"></p>
      <div class="jar-difficulty-options" role="group" aria-label="문제 난이도 선택">
        ${LEVELS.map(level => `<button type="button" class="jar-difficulty-option" data-session-difficulty="${level}"><strong>${SESSION_DIFFICULTIES[level].label}</strong><span>${SESSION_DIFFICULTIES[level].description}</span></button>`).join("")}
      </div>
      <p class="jar-difficulty-hint">선택한 난이도로 이번 장독대 문제 구성을 만들어요.</p>
      <div class="jar-difficulty-actions"><button class="jar-difficulty-cancel" value="cancel">취소</button></div>
    </form>`;
  documentRef.body.append(dialog);
  return dialog;
}

export function openDifficultySelection({ mode, documentRef = globalThis.document } = {}) {
  if (!documentRef?.body) return Promise.resolve(null);
  const dialog = ensureDifficultySelector(documentRef);
  const title = dialog.querySelector("#jarDifficultyTitle");
  const description = dialog.querySelector("#jarDifficultyDescription");
  if (title) title.textContent = `${mode?.title || "장독대"} 난이도를 고르세요`;
  if (description) description.textContent = "매번 새로 고른 난이도로 문제 구성을 준비합니다.";
  return new Promise(resolve => {
    let selected = null;
    const finish = () => {
      dialog.removeEventListener("click", choose);
      resolve(selected);
    };
    const choose = event => {
      const button = event.target.closest("[data-session-difficulty]");
      const value = button?.dataset.sessionDifficulty;
      if (!isSessionDifficulty(value)) return;
      selected = value;
      dialog.close();
    };
    dialog.addEventListener("click", choose);
    dialog.addEventListener("close", finish, { once: true });
    if (!dialog.open) dialog.showModal();
  });
}
