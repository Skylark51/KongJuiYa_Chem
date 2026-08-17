const EVOLUTION_IMAGE_ROOT = "assets/이미지/생명과학/진화/";

export const BIOLOGY_VARIATION_NATURAL_SELECTION_QUESTIONS = Object.freeze([
  {
    id: "biology-variation-common-feature",
    image: EVOLUTION_IMAGE_ROOT + "변이-관찰.png",
    imageAlt: "사람의 홍채, 사랑앵무의 깃털, 무당벌레 딱지날개의 색과 무늬가 개체마다 다르다는 표",
    sourceLabel: "자료 1 · 자연에서 관찰되는 현상",
    prompt: "(가)~(다)의 공통적인 특징으로 가장 적절한 것은?",
    choices: ["같은 종의 개체 사이에 형질 차이가 나타난다.", "모든 개체가 완전히 같은 형질을 가진다.", "환경이 달라도 한 가지 형질만 나타난다.", "서로 다른 종 사이에서만 차이가 나타난다."],
    answer: "같은 종의 개체 사이에 형질 차이가 나타난다.",
    explanation: "사람, 사랑앵무, 무당벌레 각각에서 같은 종의 개체 사이에 색이나 무늬 차이가 나타납니다."
  },
  {
    id: "biology-variation-term",
    image: EVOLUTION_IMAGE_ROOT + "변이-관찰.png",
    imageAlt: "사람의 홍채, 사랑앵무의 깃털, 무당벌레 딱지날개의 색과 무늬가 개체마다 다르다는 표",
    sourceLabel: "자료 1 · 자연에서 관찰되는 현상",
    prompt: "자료처럼 같은 종의 개체 사이에서 형질이 서로 다르게 나타나는 현상은?",
    choices: ["변이", "자연선택", "적응", "멸종"],
    answer: "변이",
    explanation: "같은 종에 속한 개체 사이에 나타나는 형질의 차이를 변이라고 합니다."
  },
  {
    id: "biology-variation-mutation",
    image: EVOLUTION_IMAGE_ROOT + "변이-원인.png",
    imageAlt: "새로운 유전자가 만들어지는 원인 가와 부모와 다른 형질의 자손이 나타나는 원인 나를 설명한 표",
    sourceLabel: "자료 2 · 변이의 원인",
    prompt: "새로운 유전자가 만들어지는 원인 (가)는?",
    choices: ["돌연변이", "유성생식", "자연선택", "환경 적응"],
    answer: "돌연변이",
    explanation: "돌연변이는 유전 물질의 변화로 새로운 유전자가 생기게 할 수 있습니다."
  },
  {
    id: "biology-variation-sexual-reproduction",
    image: EVOLUTION_IMAGE_ROOT + "변이-원인.png",
    imageAlt: "새로운 유전자가 만들어지는 원인 가와 부모와 다른 형질의 자손이 나타나는 원인 나를 설명한 표",
    sourceLabel: "자료 2 · 변이의 원인",
    prompt: "생식세포의 다양한 조합으로 부모와 다른 형질의 자손이 나타나는 원인 (나)는?",
    choices: ["유성생식", "돌연변이", "무성생식", "자연선택"],
    answer: "유성생식",
    explanation: "유성생식에서는 서로 다른 생식세포가 조합되어 자손의 유전자 조합이 다양해집니다."
  },
  {
    id: "biology-peacock-mutation",
    image: EVOLUTION_IMAGE_ROOT + "돌연변이와-번식.png",
    imageAlt: "푸른색 깃털 공작 무리에서 흰색 깃털 공작이 우연히 태어난 사례와 서로 다른 깃털색 비둘기의 자손 사례",
    sourceLabel: "자료 3 · 공작과 비둘기의 변이",
    prompt: "푸른색 깃털 공작 무리에서 흰색 깃털 공작이 우연히 태어난 주된 원인은?",
    choices: ["돌연변이", "유성생식에 의한 조합만", "자연선택의 결과", "환경에 따른 의도적 변화"],
    answer: "돌연변이",
    explanation: "기존 무리에 없던 흰색 깃털 형질이 우연히 나타난 사례는 돌연변이로 설명할 수 있습니다."
  },
  {
    id: "biology-pigeon-reproduction",
    image: EVOLUTION_IMAGE_ROOT + "돌연변이와-번식.png",
    imageAlt: "푸른색 깃털 공작 무리에서 흰색 깃털 공작이 우연히 태어난 사례와 서로 다른 깃털색 비둘기의 자손 사례",
    sourceLabel: "자료 3 · 공작과 비둘기의 변이",
    prompt: "밝은색과 어두운색 깃털 비둘기 사이에서 다양한 얼굴색의 자손이 나타난 까닭은?",
    choices: ["유성생식으로 유전자 조합이 다양해졌기 때문이다.", "모든 유전자가 같아졌기 때문이다.", "자손이 환경을 선택했기 때문이다.", "변이가 완전히 사라졌기 때문이다."],
    answer: "유성생식으로 유전자 조합이 다양해졌기 때문이다.",
    explanation: "유성생식 과정에서 부모의 유전자가 다양하게 조합되어 서로 다른 형질의 자손이 나타납니다."
  },
  {
    id: "biology-natural-selection-statements",
    image: EVOLUTION_IMAGE_ROOT + "자연선택-문장.png",
    imageAlt: "자연선택은 변이가 있는 생물 무리에서 일어나고, 환경 적응과 생존에 유리한 개체의 번식에 관한 세 문장",
    sourceLabel: "자료 4 · 자연선택의 특징",
    prompt: "자연선택에 관한 설명으로 옳은 것을 모두 고른 것은?",
    choices: ["ㄱ", "ㄱ, ㄴ", "ㄴ, ㄷ", "ㄱ, ㄴ, ㄷ"],
    answer: "ㄱ, ㄴ, ㄷ",
    explanation: "자연선택은 변이가 있는 집단에서 일어나며, 생존에 유리한 형질을 가진 개체가 더 많은 자손을 남겨 집단이 환경에 적응하게 됩니다."
  },
  {
    id: "biology-natural-selection-offspring",
    image: EVOLUTION_IMAGE_ROOT + "자연선택-문장.png",
    imageAlt: "자연선택은 변이가 있는 생물 무리에서 일어나고, 환경 적응과 생존에 유리한 개체의 번식에 관한 세 문장",
    sourceLabel: "자료 4 · 자연선택의 특징",
    prompt: "자연선택 과정에서 다음 세대로 더 많이 전달되는 형질은?",
    choices: ["주어진 환경에서 생존과 번식에 유리한 형질", "모든 개체에게 똑같이 나타나는 형질", "반드시 가장 눈에 잘 띄는 형질", "개체가 살아가며 새로 연습한 형질"],
    answer: "주어진 환경에서 생존과 번식에 유리한 형질",
    explanation: "환경에 유리한 형질을 가진 개체가 더 많은 자손을 남기므로 그 형질의 유전자가 다음 세대에 더 많이 전달됩니다."
  },
  {
    id: "biology-evolution-order",
    image: EVOLUTION_IMAGE_ROOT + "진화-순서.png",
    imageAlt: "개체의 유전적 변이, 유리한 유전자의 전달, 집단의 유전적 변화와 새로운 생물종 출현을 차례로 제시한 표",
    sourceLabel: "자료 5 · 변이에서 진화까지",
    prompt: "자료에서 나타난 진화 과정의 순서로 옳은 것은?",
    choices: ["(가) → (나) → (다)", "(가) → (다) → (나)", "(나) → (가) → (다)", "(다) → (나) → (가)"],
    answer: "(가) → (나) → (다)",
    explanation: "개체 사이의 유전적 변이가 먼저 존재하고, 유리한 유전자가 더 많이 전달되면서 집단의 유전적 특성이 달라집니다."
  },
  {
    id: "biology-evolution-selection-step",
    image: EVOLUTION_IMAGE_ROOT + "진화-순서.png",
    imageAlt: "개체의 유전적 변이, 유리한 유전자의 전달, 집단의 유전적 변화와 새로운 생물종 출현을 차례로 제시한 표",
    sourceLabel: "자료 5 · 변이에서 진화까지",
    prompt: "(나)에서 설명하는 핵심 과정은?",
    choices: ["자연선택", "돌연변이의 발생", "변이의 완전한 소멸", "모든 개체의 동일한 번식"],
    answer: "자연선택",
    explanation: "환경 적응에 유리한 형질의 유전자가 자손에게 더 많이 전달되는 과정이 자연선택입니다."
  }
].map(question => Object.freeze({ ...question, choices: Object.freeze(question.choices) })));
