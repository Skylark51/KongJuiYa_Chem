import { q } from "./_helpers.js";

const oxidation = (id, difficulty, formula, formulaHtml, answer, explanation, target, kind) => q(
  id,
  "oxidation_number",
  difficulty,
  formula,
  [String(answer)],
  explanation,
  ["산화수", target, kind, "문제지 추출"],
  {
    answerMode: "integer",
    inputMode: "signed_numeric_keypad",
    promptHtml: `<span class="oxidation-formula">${formulaHtml}</span>`
  }
);

export const oxidationNumberWorksheetQuestions = Object.freeze([
  oxidation("oxidation_number_064", 1, "C", "<u>C</u>", 0, "홑원소 C의 산화수는 0이다.", "C", "홑원소"),
  oxidation("oxidation_number_065", 2, "Na₂O", "<u>Na</u>₂O", 1, "Na₂O에서 O는 -2이므로 2Na + (-2) = 0에서 Na는 +1이다.", "Na", "이온 결합 화합물"),
  oxidation("oxidation_number_066", 3, "Al₂S₃", "Al₂<u>S</u>₃", -2, "Al₂S₃에서 Al은 +3이므로 2(+3) + 3S = 0에서 S는 -2이다.", "S", "이온 결합 화합물")
]);
