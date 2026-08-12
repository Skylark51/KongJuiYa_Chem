import { subjectById } from "../../data/subjects.js";
import { siteUrl } from "./site-routing.js";

const subjectId = document.documentElement.dataset.subject;
const subject = subjectById(subjectId);
const root = document.getElementById("subjectShell");

if (!subject || !root || subject.id === "chemistry") {
  throw new Error(`Unknown subject shell: ${subjectId || "missing"}`);
}

document.documentElement.dataset.theme = subject.theme;
root.innerHTML = `
  <header class="subject-topbar">
    <a class="subject-brand" href="${siteUrl("")}" aria-label="과학 통합관으로 이동">
      <span aria-hidden="true">科</span>
      <strong>콩쥐야 줘때써</strong>
    </a>
    <a class="portal-return" href="${siteUrl("")}">전체 과목</a>
  </header>
  <section class="subject-hero">
    <p>SCIENCE SUBJECT HALL</p>
    <span class="subject-icon" aria-hidden="true">${subject.icon}</span>
    <h1>${subject.name}편</h1>
    <strong>${subject.englishName}</strong>
    <p>장독대를 채울 ${subject.name} 퀴즈를 준비하고 있습니다.</p>
  </section>
  <nav class="subject-tabs" aria-label="${subject.name} 주요 화면">
    <a href="./" aria-current="page">홈</a>
    <span aria-disabled="true">장독대</span>
    <span aria-disabled="true">기록</span>
    <span aria-disabled="true">상점</span>
    <span aria-disabled="true">설정</span>
  </nav>
  <section class="subject-empty">
    <p>COMING SOON</p>
    <h2>과목 셸 준비 완료</h2>
    <p>퀴즈 데이터는 생성하지 않았습니다. 과목별 데이터 모듈을 연결하면 같은 인터페이스에서 확장할 수 있습니다.</p>
    <a href="${siteUrl("")}">과학 통합관으로 돌아가기</a>
  </section>`;
