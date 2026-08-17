// Pure view-model helpers stay DOM-free so they can be tested in Node.
const DIFFICULTY_ORDER = Object.freeze({ easy: 1, normal: 2, hard: 3, unspecified: 4 });

function includes(text, query) {
  return String(text || "").toLocaleLowerCase("ko").includes(query);
}

export function filterQuestions(questions, filters = {}) {
  const query = String(filters.search || "").trim().toLocaleLowerCase("ko");
  return (questions || []).filter(question => {
    if (filters.subject && question.subjectId !== filters.subject) return false;
    if (filters.category && question.category !== filters.category) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    if (filters.type && question.type !== filters.type) return false;
    if (filters.asset === "yes" && !question.assetPaths.length) return false;
    if (filters.asset === "no" && question.assetPaths.length) return false;
    if (filters.animation === "yes" && !question.hasAnimation) return false;
    if (filters.animation === "no" && question.hasAnimation) return false;
    if (filters.explanation === "yes" && !question.explanation) return false;
    if (filters.explanation === "no" && question.explanation) return false;
    if (filters.status === "error" && !question.errorCount) return false;
    if (filters.status === "warning" && !question.warningCount) return false;
    if (filters.status === "ok" && (question.errorCount || question.warningCount)) return false;
    if (!query) return true;
    return [question.id, question.prompt, question.category, ...question.assetPaths]
      .some(value => includes(value, query));
  });
}

export function sortQuestions(questions, sort = { key: "id", direction: "asc" }) {
  const direction = sort.direction === "desc" ? -1 : 1;
  const key = sort.key || "id";
  return [...(questions || [])].sort((left, right) => {
    let a = left[key];
    let b = right[key];
    if (key === "subject") { a = left.subjectLabel; b = right.subjectLabel; }
    if (key === "difficulty") { a = DIFFICULTY_ORDER[left.difficulty] || 99; b = DIFFICULTY_ORDER[right.difficulty] || 99; }
    if (key === "status") { a = left.errorCount * 1000 + left.warningCount; b = right.errorCount * 1000 + right.warningCount; }
    if (typeof a === "number" && typeof b === "number") return (a - b) * direction;
    return String(a || "").localeCompare(String(b || ""), "ko", { numeric: true }) * direction;
  });
}

export function paginateQuestions(questions, page = 1, pageSize = 50) {
  const size = [25, 50, 100].includes(Number(pageSize)) ? Number(pageSize) : 50;
  const totalItems = questions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (currentPage - 1) * size;
  return { items: questions.slice(start, start + size), page: currentPage, pageSize: size, totalItems, totalPages };
}

export function questionDetailModel(report, uid) {
  const question = report?.questions?.find(item => item.uid === uid) || null;
  if (!question) return null;
  const issues = report.issues.filter(issue => issue.questionUid === uid);
  return { ...question, issues };
}

export function quizMakerQuery(questionId) {
  return questionId ? `?questionId=${encodeURIComponent(questionId)}` : "";
}
