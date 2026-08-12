import { SUBJECTS } from "../../data/subjects.js";
import { siteUrl } from "./site-routing.js";

const grid = document.getElementById("subjectGrid");

function subjectCard(subject, index) {
  const card = document.createElement("a");
  card.className = "subject-card";
  card.dataset.subject = subject.id;
  card.dataset.theme = subject.theme;
  card.href = siteUrl(subject.route);
  card.setAttribute("aria-label", subject.name + " 학습관으로 이동");
  card.innerHTML = `
    <span class="subject-order">SCIENCE ${String(index + 1).padStart(2, "0")}</span>
    <span class="subject-icon" aria-hidden="true">${subject.icon}</span>
    <span class="subject-copy">
      <strong>${subject.name}</strong>
      <small>${subject.englishName} · ${subject.shortTitle}</small>
    </span>
    <span class="subject-status" data-status="${subject.status}">${subject.statusLabel}</span>
    <span class="subject-arrow" aria-hidden="true">→</span>
  `;
  return card;
}

grid?.replaceChildren(...SUBJECTS.map(subjectCard));
