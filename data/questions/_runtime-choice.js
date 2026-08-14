export function multipleChoiceRuntimeQuestion(question, trainingId, choices, presentation = null) {
  const answerIndex = choices.indexOf(question.answer);
  if (answerIndex < 0) throw new Error(`${question.id}: answer is not in choices`);

  const runtimeQuestion = {
    ...question,
    trainingId,
    difficulty: 1,
    type: "multiple_choice",
    inputMode: "multiple_choice",
    choices: Object.freeze([...choices]),
    correctChoice: answerIndex
  };
  if (presentation) runtimeQuestion.presentation = Object.freeze(presentation);
  return Object.freeze(runtimeQuestion);
}

export function binaryRuntimeQuestion(question, trainingId, choices = ["O", "X"]) {
  const answerIndex = choices.indexOf(question.answer);
  if (answerIndex < 0) throw new Error(`${question.id}: answer is not in choices`);

  return Object.freeze({
    ...question,
    trainingId,
    difficulty: 1,
    type: "binary_choice",
    inputMode: "binary_choice",
    choices: Object.freeze([...choices]),
    correctChoice: String(answerIndex + 1)
  });
}
