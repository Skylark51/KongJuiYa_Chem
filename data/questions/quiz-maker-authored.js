const DATA = {
  "chemistry": { "trainingModes": [], "questions": [], "overrides": {} },
  "physics": { "trainingModes": [], "questions": [], "overrides": {} },
  "biology": { "trainingModes": [], "questions": [], "overrides": {} },
  "earth-science": { "trainingModes": [], "questions": [], "overrides": {} }
};

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const QUIZ_MAKER_AUTHORED_CONTENT = deepFreeze(DATA);
