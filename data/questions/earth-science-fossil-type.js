export const EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS = Object.freeze([
  {
    id: "fossil-type-coral",
    name: "산호 화석",
    image: "assets/이미지/지구과학/화석/산호-화석.png",
    answer: "시상 화석",
    explanation: "산호는 따뜻하고 얕은 바다 환경을 알려 주므로 시상 화석으로 활용합니다."
  },
  {
    id: "fossil-type-fern",
    name: "고사리 화석",
    image: "assets/이미지/지구과학/화석/고사리-화석.png",
    answer: "시상 화석",
    explanation: "고사리는 따뜻하고 습한 육상 환경을 알려 주므로 시상 화석으로 활용합니다."
  },
  {
    id: "fossil-type-ammonite",
    name: "암모나이트 화석",
    image: "assets/이미지/지구과학/화석/암모나이트-화석.png",
    answer: "표준 화석",
    era: "중생대",
    explanation: "암모나이트는 중생대의 대표적인 표준 화석입니다."
  },
  {
    id: "fossil-type-mammoth",
    name: "매머드 화석",
    image: "assets/이미지/지구과학/화석/매머드-화석.png",
    answer: "표준 화석",
    era: "신생대",
    explanation: "매머드는 신생대, 특히 제4기를 구분하는 데 활용되는 표준 화석입니다."
  },
  {
    id: "fossil-type-nummulite",
    name: "화폐석 화석",
    image: "assets/이미지/지구과학/화석/누물라이트-화석.png",
    answer: "표준 화석",
    era: "신생대",
    explanation: "화폐석은 신생대의 대표적인 표준 화석입니다."
  },
  {
    id: "fossil-type-dinosaur",
    name: "공룡 화석",
    image: "assets/이미지/지구과학/화석/공룡-화석.png",
    answer: "표준 화석",
    era: "중생대",
    explanation: "공룡은 중생대를 구분하는 데 활용되는 대표적인 표준 화석입니다."
  },
  {
    id: "fossil-type-trilobite",
    name: "삼엽충 화석",
    image: "assets/이미지/지구과학/화석/삼엽충-화석.png",
    answer: "표준 화석",
    era: "고생대",
    explanation: "삼엽충은 고생대의 대표적인 표준 화석입니다."
  },
  {
    id: "fossil-type-ediacaran",
    name: "에디아카라 동물군 화석",
    image: "assets/이미지/지구과학/화석/에디아카라-동물군-화석.png",
    answer: "표준 화석",
    era: "선캄브리아시대",
    explanation: "에디아카라 동물군은 선캄브리아 시대 말기를 구분하는 데 활용되는 표준 화석입니다."
  }
].map(question => Object.freeze(question)));

export const FOSSIL_TYPE_CHOICES = Object.freeze(["시상 화석", "표준 화석"]);

export const EARTH_SCIENCE_FOSSIL_ERA_QUESTIONS = Object.freeze(
  EARTH_SCIENCE_FOSSIL_TYPE_QUESTIONS
    .filter(question => question.era)
    .map(question => Object.freeze({
      ...question,
      id: question.id.replace("fossil-type-", "fossil-era-"),
      answer: question.era
    }))
);

export const FOSSIL_ERA_CHOICES = Object.freeze([
  "선캄브리아시대",
  "고생대",
  "중생대",
  "신생대"
]);
