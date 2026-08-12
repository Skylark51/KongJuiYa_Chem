export const SUBJECTS = Object.freeze([
  Object.freeze({
    id: "chemistry",
    slug: "chemistry",
    name: "화학",
    englishName: "Chemistry",
    shortTitle: "화학편",
    route: "subjects/chemistry/",
    icon: "化",
    theme: "chemistry",
    status: "live",
    statusLabel: "현재 운영 중"
  }),
  Object.freeze({
    id: "physics",
    slug: "physics",
    name: "물리학",
    englishName: "Physics",
    shortTitle: "물리학편",
    route: "subjects/physics/",
    icon: "力",
    theme: "physics",
    status: "ready",
    statusLabel: "학습관 준비 완료"
  }),
  Object.freeze({
    id: "biology",
    slug: "biology",
    name: "생명과학",
    englishName: "Biology",
    shortTitle: "생명과학편",
    route: "subjects/biology/",
    icon: "生",
    theme: "biology",
    status: "ready",
    statusLabel: "학습관 준비 완료"
  }),
  Object.freeze({
    id: "earth-science",
    slug: "earth-science",
    name: "지구과학",
    englishName: "Earth Science",
    shortTitle: "지구과학편",
    route: "subjects/earth-science/",
    icon: "地",
    theme: "earth-science",
    status: "ready",
    statusLabel: "학습관 준비 완료"
  })
]);

export const SUBJECT_BY_ID = Object.freeze(Object.fromEntries(SUBJECTS.map(subject => [subject.id, subject])));

export function subjectById(id) {
  return SUBJECT_BY_ID[id] || null;
}
