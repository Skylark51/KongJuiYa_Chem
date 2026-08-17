import { createJarPreview } from "./theme-system.js";
import { siteUrl } from "./site-routing.js";

const STYLESHEET = "assets/css/jar-selection-preview.css?v=20260817-jar-preview1";
const STYLESHEET_MARKER = "jar-selection-preview";
const COSMETIC_STORAGE_KEY = "kongjuiya-cosmetics-v1";

function ensureStylesheet() {
  if (document.querySelector(`link[data-site-stylesheet="${STYLESHEET_MARKER}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.siteStylesheet = STYLESHEET_MARKER;
  link.href = siteUrl(STYLESHEET);
  document.head.append(link);
}

function makePreview() {
  const preview = createJarPreview({ id: "atomic_number" });
  preview.classList.add("jar-selection-square-preview");
  return preview;
}

function enhanceSubjectCard(card) {
  if (!card || card.dataset.jarPreview === "ready") return;
  card.dataset.jarPreview = "ready";
  card.classList.add("has-jar-preview");
  card.prepend(makePreview());
}

function enhanceSubjectGrid() {
  const grid = document.getElementById("subjectQuizGrid");
  if (!grid) return;
  grid.querySelectorAll(".subject-quiz-card").forEach(enhanceSubjectCard);
}

function refreshSubjectPreviews() {
  const grid = document.getElementById("subjectQuizGrid");
  if (!grid) return;
  grid.querySelectorAll(".subject-quiz-card").forEach(card => {
    const current = Array.from(card.children).find(child => child.matches?.(".jar-preview.jar-preview-photo"));
    const replacement = makePreview();
    if (current) current.replaceWith(replacement);
    else card.prepend(replacement);
    card.dataset.jarPreview = "ready";
    card.classList.add("has-jar-preview");
  });
}

function observeSubjectShell() {
  const shell = document.getElementById("subjectShell");
  if (!shell) return;
  const observer = new MutationObserver(() => enhanceSubjectGrid());
  observer.observe(shell, { childList: true, subtree: true });
}

export function mountJarSelectionPreview() {
  ensureStylesheet();
  enhanceSubjectGrid();
  observeSubjectShell();

  addEventListener("pageshow", refreshSubjectPreviews);
  addEventListener("cosmetic:equipped", event => {
    if (!event.detail?.category || event.detail.category === "jar") refreshSubjectPreviews();
  });
  addEventListener("storage", event => {
    if (event.key === COSMETIC_STORAGE_KEY || event.key == null) refreshSubjectPreviews();
  });
}

mountJarSelectionPreview();
