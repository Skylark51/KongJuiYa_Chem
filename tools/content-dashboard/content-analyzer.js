// Shared by the Node analyzer and the browser dashboard.
export const DASHBOARD_THRESHOLDS = Object.freeze({
  lowCategoryQuestionCount: 3,
  shortPromptLength: 4,
  longChoiceLength: 80,
  longChoiceRatio: 2.5,
  repeatedAssetQuestionCount: 20
});

export const SUBJECT_LABELS = Object.freeze({
  chemistry: "화학",
  physics: "물리",
  biology: "생명과학",
  "earth-science": "지구과학"
});

export const DIFFICULTY_LABELS = Object.freeze({
  easy: "초급",
  normal: "중급",
  hard: "고급",
  unspecified: "미지정"
});

export const TYPE_LABELS = Object.freeze({
  numeric: "숫자 입력",
  short_answer: "단답형",
  multiple_choice: "일반 객관식",
  binary_choice: "이진 선택",
  ordered_coefficients: "계수 배열",
  formula_input: "화학식 입력",
  unknown: "기타"
});

const CHOICE_TYPES = new Set(["multiple_choice", "binary_choice"]);

function asText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizePath(value) {
  const text = asText(value);
  if (!text) return "";
  const clean = text.split(/[?#]/, 1)[0].replaceAll("\\", "/");
  try {
    return decodeURIComponent(clean).replace(/^\.\//, "");
  } catch {
    return clean.replace(/^\.\//, "");
  }
}

function normalizeDifficulty(value) {
  const aliases = new Map([
    [1, "easy"], [2, "normal"], [3, "hard"],
    ["1", "easy"], ["2", "normal"], ["3", "hard"],
    ["easy", "easy"], ["beginner", "easy"], ["초급", "easy"],
    ["normal", "normal"], ["medium", "normal"], ["중급", "normal"],
    ["hard", "hard"], ["advanced", "hard"], ["고급", "hard"]
  ]);
  const key = aliases.get(value) || aliases.get(asText(value).toLowerCase()) || "unspecified";
  return { key, label: DIFFICULTY_LABELS[key] };
}

function normalizeChoice(choice, index) {
  if (choice && typeof choice === "object" && !Array.isArray(choice)) {
    return {
      key: asText(choice.key ?? index + 1),
      label: asText(choice.label ?? choice.value ?? choice.text ?? choice.key)
    };
  }
  return { key: String(index + 1), label: asText(choice) };
}

function collectAssetPaths(question) {
  const candidates = [
    question.image,
    question.imagePath,
    question.asset,
    question.assetPath,
    question.presentation?.image,
    question.presentation?.asset,
    question.animation,
    question.animationPath
  ];
  return [...new Set(candidates.map(normalizePath).filter(Boolean))];
}

function isAnimationQuestion(question, assetPaths) {
  if (question.animation || question.animationPath || question.animationId) return true;
  const kind = asText(question.presentation?.kind).toLowerCase();
  if (kind.includes("animation") || kind.includes("sprite")) return true;
  return assetPaths.some(path => /(?:animation|sprite|frames?|sheet)(?:[\/_-]|\.)/i.test(path));
}

function isIntentionalShortPrompt(question, prompt) {
  if (!["numeric", "short_answer"].includes(question.type)) return false;
  return /^[A-Za-z0-9+\-().·]+$/.test(prompt);
}

function hasAnswer(question) {
  if (Array.isArray(question.answers) && question.answers.some(value => asText(value))) return true;
  if (asText(question.answer)) return true;
  return question.correctChoice !== null && question.correctChoice !== undefined && asText(question.correctChoice) !== "";
}

function correctChoiceIsValid(question, choices) {
  if (!CHOICE_TYPES.has(question.type)) return true;
  if (!choices.length) return false;
  const correct = question.correctChoice;
  if (question.type === "multiple_choice") {
    return Number.isInteger(correct) && correct >= 0 && correct < choices.length;
  }
  const text = asText(correct);
  return choices.some(choice => choice.key === text)
    || (Number.isInteger(correct) && correct >= 0 && correct < choices.length);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function countBy(items, keyOf) {
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function distribution(items, keyOf, labelOf = key => key) {
  return [...countBy(items, keyOf).entries()]
    .map(([key, count]) => ({ key, label: labelOf(key), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}

function baseQuestion(subjectId, question, modeMap, index) {
  const safe = question && typeof question === "object" && !Array.isArray(question) ? question : {};
  const mode = modeMap.get(asText(safe.trainingId));
  const difficulty = normalizeDifficulty(safe.difficulty);
  const type = asText(safe.type) || "unknown";
  const choices = Array.isArray(safe.choices) ? safe.choices.map(normalizeChoice) : [];
  const assetPaths = collectAssetPaths(safe);
  const answers = Array.isArray(safe.answers)
    ? safe.answers.map(asText).filter(Boolean)
    : (asText(safe.answer) ? [asText(safe.answer)] : []);
  return {
    uid: `${subjectId}:${asText(safe.id) || `__missing_${index}`}:${index}`,
    id: asText(safe.id),
    subjectId,
    subjectLabel: SUBJECT_LABELS[subjectId] || subjectId,
    trainingId: asText(safe.trainingId),
    category: asText(safe.category ?? mode?.category),
    subcategory: asText(safe.subcategory) || null,
    difficulty: difficulty.key,
    difficultyLabel: difficulty.label,
    rawDifficulty: safe.difficulty ?? null,
    type,
    typeLabel: TYPE_LABELS[type] || TYPE_LABELS.unknown,
    prompt: asText(safe.prompt ?? safe.question ?? safe.text),
    promptHtml: asText(safe.promptHtml) || null,
    choices,
    answers,
    answer: answers.join(" / ") || asText(safe.correctChoice),
    correctChoice: safe.correctChoice ?? null,
    explanation: asText(safe.explanation),
    tags: Array.isArray(safe.tags) ? safe.tags.map(asText).filter(Boolean) : [],
    assetPaths,
    imagePath: assetPaths.find(path => /\.(?:png|jpe?g|webp|gif|svg)$/i.test(path)) || "",
    hasImage: assetPaths.some(path => /\.(?:png|jpe?g|webp|gif|svg)$/i.test(path)),
    hasAnimation: isAnimationQuestion(safe, assetPaths),
    presentationKind: asText(safe.presentation?.kind || safe.choicePresentation),
    schemaValid: Boolean(question && typeof question === "object" && !Array.isArray(question)),
    issueIds: [],
    errorCount: 0,
    warningCount: 0,
    status: "정상"
  };
}

export function analyzeContent({
  subjectContents,
  assetFiles = [],
  generatedAt = new Date().toISOString(),
  sourceRevision = "unknown",
  thresholds = DASHBOARD_THRESHOLDS,
  parseIssues = []
}) {
  const assetSet = new Set(assetFiles.map(normalizePath));
  const questions = [];
  const issues = [];
  let issueSequence = 0;
  const addIssue = ({ severity, code, message, question = null, subjectId = null, category = null, assetPath = null }) => {
    const issue = {
      id: `${severity === "error" ? "E" : "W"}-${String(++issueSequence).padStart(4, "0")}`,
      severity,
      code,
      message,
      questionId: question?.id || null,
      questionUid: question?.uid || null,
      subjectId: subjectId || question?.subjectId || null,
      category: category || question?.category || null,
      assetPath: assetPath || null
    };
    issues.push(issue);
    return issue;
  };

  for (const parseIssue of parseIssues) {
    addIssue({ severity: "error", code: "schema_parse_failed", message: asText(parseIssue) });
  }

  for (const [subjectId, content] of Object.entries(subjectContents || {})) {
    const modes = Array.isArray(content?.trainingModes) ? content.trainingModes : [];
    const modeMap = new Map(modes.map(mode => [asText(mode.id), mode]));
    const bank = Array.isArray(content?.questions) ? content.questions : [];
    if (!bank.length) {
      addIssue({
        severity: "warning",
        code: "subject_empty",
        message: `${SUBJECT_LABELS[subjectId] || subjectId} 과목에 등록된 문제가 없습니다.`,
        subjectId
      });
    }
    bank.forEach((raw, index) => {
      const question = baseQuestion(subjectId, raw, modeMap, index);
      questions.push(question);
      if (!question.schemaValid) {
        addIssue({ severity: "error", code: "invalid_data_type", message: "문제 데이터가 객체가 아닙니다.", question });
      }
      if (!question.id) addIssue({ severity: "error", code: "missing_id", message: "문제 ID가 없습니다.", question });
      if (!question.prompt) addIssue({ severity: "error", code: "missing_prompt", message: "문제 본문이 없습니다.", question });
      if (!question.trainingId || !question.category) {
        addIssue({ severity: "error", code: "missing_category", message: "필수 category를 확인할 수 없습니다.", question });
      }
      if (question.type === "unknown") {
        addIssue({ severity: "error", code: "invalid_type", message: "문제 type이 없거나 잘못되었습니다.", question });
      }
      if (CHOICE_TYPES.has(question.type) && !question.choices.length) {
        addIssue({ severity: "error", code: "missing_choices", message: "선택형 문제에 선택지가 없습니다.", question });
      }
      if (!hasAnswer(raw || {})) {
        addIssue({ severity: "error", code: "missing_answer", message: "정답 데이터가 없습니다.", question });
      }
      if (!correctChoiceIsValid(raw || {}, question.choices)) {
        addIssue({ severity: "error", code: "invalid_correct_choice", message: "정답 index/key가 선택지 범위를 벗어났습니다.", question });
      }
      for (const assetPath of question.assetPaths) {
        if (!assetSet.has(assetPath)) {
          addIssue({
            severity: "error",
            code: "missing_asset",
            message: `존재하지 않는 asset을 참조합니다: ${assetPath}`,
            question,
            assetPath
          });
        }
      }
      if (!question.explanation) {
        addIssue({ severity: "warning", code: "missing_explanation", message: "해설이 없습니다.", question });
      }
      const choiceLabels = question.choices
        .map(choice => choice.label.toLocaleLowerCase("ko"))
        .filter(Boolean);
      if (new Set(choiceLabels).size !== choiceLabels.length) {
        addIssue({ severity: "warning", code: "duplicate_choices", message: "동일한 선택지가 두 개 이상 있습니다.", question });
      }
      if (
        question.prompt
        && question.prompt.length < thresholds.shortPromptLength
        && !isIntentionalShortPrompt(raw || {}, question.prompt)
      ) {
        addIssue({
          severity: "warning",
          code: "short_prompt",
          message: `문제 본문이 ${thresholds.shortPromptLength}자보다 짧습니다.`,
          question
        });
      }
      const lengths = question.choices.map(choice => choice.label.length).filter(Boolean);
      const longest = Math.max(0, ...lengths);
      const typical = median(lengths);
      if (longest > thresholds.longChoiceLength && typical > 0 && longest / typical >= thresholds.longChoiceRatio) {
        addIssue({
          severity: "warning",
          code: "choice_length_outlier",
          message: "선택지 하나가 다른 선택지보다 지나치게 깁니다.",
          question
        });
      }
      if ((question.presentationKind === "source-image" || question.type.includes("image")) && !question.hasImage) {
        addIssue({
          severity: "warning",
          code: "image_type_without_asset",
          message: "이미지형 문제에 image asset이 없습니다.",
          question
        });
      }
    });
  }

  const duplicateIds = [...countBy(questions.filter(question => question.id), question => question.id).entries()]
    .filter(([, count]) => count > 1);
  for (const [id] of duplicateIds) {
    for (const question of questions.filter(item => item.id === id)) {
      addIssue({ severity: "error", code: "duplicate_id", message: `중복 문제 ID입니다: ${id}`, question });
    }
  }

  const categoryGroups = new Map();
  for (const question of questions.filter(item => item.category)) {
    const key = `${question.subjectId}::${question.category}`;
    if (!categoryGroups.has(key)) categoryGroups.set(key, []);
    categoryGroups.get(key).push(question);
  }
  for (const group of categoryGroups.values()) {
    if (group.length <= thresholds.lowCategoryQuestionCount) {
      addIssue({
        severity: "warning",
        code: "low_category_count",
        message: `category 문제가 ${group.length}개뿐입니다.`,
        subjectId: group[0].subjectId,
        category: group[0].category
      });
    }
  }

  const assetUsage = countBy(
    questions.flatMap(question => question.assetPaths.map(path => ({ path, question }))),
    item => item.path
  );
  for (const [assetPath, count] of assetUsage) {
    if (count >= thresholds.repeatedAssetQuestionCount) {
      addIssue({
        severity: "warning",
        code: "excessive_asset_reuse",
        message: `동일 asset이 ${count}개 문제에서 반복 사용됩니다.`,
        assetPath
      });
    }
  }

  const issuesByQuestion = new Map();
  for (const issue of issues) {
    if (!issue.questionUid) continue;
    if (!issuesByQuestion.has(issue.questionUid)) issuesByQuestion.set(issue.questionUid, []);
    issuesByQuestion.get(issue.questionUid).push(issue);
  }
  for (const question of questions) {
    const related = issuesByQuestion.get(question.uid) || [];
    question.issueIds = related.map(issue => issue.id);
    question.errorCount = related.filter(issue => issue.severity === "error").length;
    question.warningCount = related.filter(issue => issue.severity === "warning").length;
    question.status = question.errorCount ? "오류" : question.warningCount ? "경고" : "정상";
  }

  const subjectOrder = Object.keys(SUBJECT_LABELS);
  const subjects = subjectOrder.map(subjectId => {
    const subjectQuestions = questions.filter(question => question.subjectId === subjectId);
    const categoryNames = new Set(subjectQuestions.map(question => question.category).filter(Boolean));
    const subjectIssues = issues.filter(issue => issue.subjectId === subjectId);
    return {
      id: subjectId,
      label: SUBJECT_LABELS[subjectId],
      questionCount: subjectQuestions.length,
      categoryCount: categoryNames.size,
      averagePerCategory: categoryNames.size
        ? Number((subjectQuestions.length / categoryNames.size).toFixed(1))
        : 0,
      imageQuestionCount: subjectQuestions.filter(question => question.hasImage).length,
      animationQuestionCount: subjectQuestions.filter(question => question.hasAnimation).length,
      explanationCount: subjectQuestions.filter(question => question.explanation).length,
      missingExplanationCount: subjectQuestions.filter(question => !question.explanation).length,
      errorCount: subjectIssues.filter(issue => issue.severity === "error").length,
      warningCount: subjectIssues.filter(issue => issue.severity === "warning").length
    };
  });

  const categories = [...categoryGroups.values()].map(group => {
    const first = group[0];
    const related = issues.filter(
      issue => issue.subjectId === first.subjectId && issue.category === first.category
    );
    return {
      subjectId: first.subjectId,
      subjectLabel: first.subjectLabel,
      name: first.category,
      questionCount: group.length,
      difficulty: distribution(group, question => question.difficulty, key => DIFFICULTY_LABELS[key]),
      assetQuestionCount: group.filter(question => question.assetPaths.length).length,
      missingExplanationCount: group.filter(question => !question.explanation).length,
      errorCount: related.filter(issue => issue.severity === "error").length,
      warningCount: related.filter(issue => issue.severity === "warning").length,
      isLowCount: group.length <= thresholds.lowCategoryQuestionCount
    };
  }).sort((a, b) => b.questionCount - a.questionCount || a.name.localeCompare(b.name, "ko"));

  const difficultyOverall = distribution(
    questions,
    question => question.difficulty,
    key => DIFFICULTY_LABELS[key]
  );
  const difficultyBySubject = Object.fromEntries(subjectOrder.map(subjectId => [
    subjectId,
    distribution(
      questions.filter(question => question.subjectId === subjectId),
      question => question.difficulty,
      key => DIFFICULTY_LABELS[key]
    )
  ]));
  const typesOverall = distribution(
    questions,
    question => question.type,
    key => TYPE_LABELS[key] || TYPE_LABELS.unknown
  );
  const typesBySubject = Object.fromEntries(subjectOrder.map(subjectId => [
    subjectId,
    distribution(
      questions.filter(question => question.subjectId === subjectId),
      question => question.type,
      key => TYPE_LABELS[key] || TYPE_LABELS.unknown
    )
  ]));

  const referencedAssets = [...new Set(questions.flatMap(question => question.assetPaths))]
    .sort((a, b) => a.localeCompare(b, "ko"));
  const missingReferences = referencedAssets.filter(path => !assetSet.has(path));
  const unusedCandidates = [...assetSet]
    .filter(path => !referencedAssets.includes(path))
    .sort((a, b) => a.localeCompare(b, "ko"));
  const animationAssets = [...assetSet].filter(
    path => /(?:animation|sprite|frames?|sheet|pour|water|effect)(?:[\/_-]|\.)/i.test(path)
  );

  return {
    meta: { generatedAt, sourceRevision, thresholds },
    summary: {
      totalQuestions: questions.length,
      subjectCount: subjects.length,
      categoryCount: categories.length,
      errorCount: issues.filter(issue => issue.severity === "error").length,
      warningCount: issues.filter(issue => issue.severity === "warning").length,
      imageQuestionCount: questions.filter(question => question.hasImage).length,
      animationQuestionCount: questions.filter(question => question.hasAnimation).length,
      explanationCount: questions.filter(question => question.explanation).length,
      missingExplanationCount: questions.filter(question => !question.explanation).length
    },
    subjects,
    categories,
    difficulties: { overall: difficultyOverall, bySubject: difficultyBySubject },
    types: { overall: typesOverall, bySubject: typesBySubject },
    assets: {
      totalFiles: assetSet.size,
      animationCandidateFiles: animationAssets.length,
      referencedCount: referencedAssets.length,
      usedImageCount: referencedAssets.filter(path => /\.(?:png|jpe?g|webp|gif|svg)$/i.test(path)).length,
      usedAnimationCount: referencedAssets.filter(path => animationAssets.includes(path)).length,
      missingReferenceCount: missingReferences.length,
      unusedCandidateCount: unusedCandidates.length,
      referenced: referencedAssets,
      missingReferences,
      unusedCandidates
    },
    issues,
    questions
  };
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join(" | ") : asText(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function questionsToCsv(questions) {
  const columns = [
    "id", "subject", "category", "difficulty", "type",
    "prompt", "asset", "explanation", "errors", "warnings"
  ];
  const rows = (questions || []).map(question => [
    question.id,
    question.subjectLabel,
    question.category,
    question.difficultyLabel,
    question.type,
    question.prompt,
    question.assetPaths,
    question.explanation,
    question.errorCount,
    question.warningCount
  ]);
  return [
    columns.map(csvCell).join(","),
    ...rows.map(row => row.map(csvCell).join(","))
  ].join("\n");
}
