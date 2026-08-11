const REDOX_CHOICES = Object.freeze([
  Object.freeze({ key: "1", label: "산화", value: "oxidation" }),
  Object.freeze({ key: "2", label: "환원", value: "reduction" }),
  Object.freeze({ key: "3", label: "둘 다 아님", value: "neither" })
]);

const ANSWER_INDEX = Object.freeze({ oxidation: 0, reduction: 1, neither: 2 });

const redox = (id, difficulty, prompt, promptHtml, answer, tags = []) => Object.freeze({
  id,
  trainingId: "redox",
  difficulty,
  type: "multiple_choice",
  prompt,
  promptHtml,
  answers: Object.freeze([String(ANSWER_INDEX[answer] + 1)]),
  choices: REDOX_CHOICES,
  correctChoice: ANSWER_INDEX[answer],
  autoSubmit: true,
  inputMode: "choice",
  allowedKeys: Object.freeze(["1", "2", "3"]),
  keyboardShortcuts: Object.freeze(["1", "2", "3"]),
  explanation: REDOX_CHOICES[ANSWER_INDEX[answer]].label,
  tags: Object.freeze(["산화-환원 판단", answer, ...tags, "문제지 추출"]),
  sourceLevel: "high_school_chemistry"
});

export const redoxWorksheetQuestions = Object.freeze([
  redox("redox_031", 1, "C + O₂ → CO₂", "<u>C</u> + O₂ → CO₂", "oxidation", ["C", "연소"]),
  redox("redox_032", 1, "2H₂ + O₂ → 2H₂O", "2<u>H₂</u> + O₂ → 2H₂O", "oxidation", ["H", "연소"]),
  redox("redox_033", 2, "ZnO + C → Zn + CO", "ZnO + <u>C</u> → Zn + CO", "oxidation", ["Zn", "C", "금속 산화물 환원"]),
  redox("redox_034", 1, "4Fe + 3O₂ → 2Fe₂O₃", "4<u>Fe</u> + 3O₂ → 2Fe₂O₃", "oxidation", ["Fe", "연소"]),
  redox("redox_035", 2, "N₂ + O₂ → 2NO", "<u>N₂</u> + O₂ → 2NO", "oxidation", ["N", "질소 산화물"]),
  redox("redox_036", 2, "2NO + O₂ → 2NO₂", "2<u>NO</u> + O₂ → 2NO₂", "oxidation", ["N", "질소 산화물"]),
  redox("redox_037", 1, "4Na + O₂ → 2Na₂O", "4<u>Na</u> + O₂ → 2Na₂O", "oxidation", ["Na", "연소"]),
  redox("redox_038", 1, "2Cu + O₂ → 2CuO", "2<u>Cu</u> + O₂ → 2CuO", "oxidation", ["Cu", "연소"]),
  redox("redox_039", 1, "4Al + 3O₂ → 2Al₂O₃", "4<u>Al</u> + 3O₂ → 2Al₂O₃", "oxidation", ["Al", "연소"]),
  redox("redox_040", 2, "2Ag⁺ + Fe → 2Ag + Fe²⁺", "2Ag⁺ + <u>Fe</u> → 2Ag + Fe²⁺", "oxidation", ["Ag", "Fe", "금속 치환"]),
  redox("redox_041", 3, "2Al + 3Ag₂S → Al₂S₃ + 6Ag", "2<u>Al</u> + 3Ag₂S → Al₂S₃ + 6Ag", "oxidation", ["Al", "Ag", "금속 치환"]),

  redox("redox_042", 1, "C + O₂ → CO₂", "C + <u>O₂</u> → CO₂", "reduction", ["C", "O", "연소"]),
  redox("redox_043", 1, "2H₂ + O₂ → 2H₂O", "2H₂ + <u>O₂</u> → 2H₂O", "reduction", ["H", "O", "연소"]),
  redox("redox_044", 2, "ZnO + C → Zn + CO", "<u>ZnO</u> + C → Zn + CO", "reduction", ["Zn", "C", "금속 산화물 환원"]),
  redox("redox_045", 1, "4Fe + 3O₂ → 2Fe₂O₃", "4Fe + 3<u>O₂</u> → 2Fe₂O₃", "reduction", ["Fe", "O", "연소"]),
  redox("redox_046", 2, "N₂ + O₂ → 2NO", "N₂ + <u>O₂</u> → 2NO", "reduction", ["N", "O", "질소 산화물"]),
  redox("redox_047", 2, "2NO + O₂ → 2NO₂", "2NO + <u>O₂</u> → 2NO₂", "reduction", ["N", "O", "질소 산화물"]),
  redox("redox_048", 1, "4Na + O₂ → 2Na₂O", "4Na + <u>O₂</u> → 2Na₂O", "reduction", ["Na", "O", "연소"]),
  redox("redox_049", 1, "2Cu + O₂ → 2CuO", "2Cu + <u>O₂</u> → 2CuO", "reduction", ["Cu", "O", "연소"]),
  redox("redox_050", 1, "4Al + 3O₂ → 2Al₂O₃", "4Al + 3<u>O₂</u> → 2Al₂O₃", "reduction", ["Al", "O", "연소"]),
  redox("redox_051", 2, "2Ag⁺ + Fe → 2Ag + Fe²⁺", "2<u>Ag⁺</u> + Fe → 2Ag + Fe²⁺", "reduction", ["Ag", "Fe", "금속 치환"]),
  redox("redox_052", 3, "2Al + 3Ag₂S → Al₂S₃ + 6Ag", "2Al + 3<u>Ag₂S</u> → Al₂S₃ + 6Ag", "reduction", ["Al", "Ag", "금속 치환"])
]);
