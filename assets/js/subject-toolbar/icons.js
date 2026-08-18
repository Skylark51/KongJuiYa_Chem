export const SUBJECT_NAV_ICONS = Object.freeze([
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-7h6v7"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5c0-1.7 2.2-3 5-3s5 1.3 5 3"/><path d="M6 6h12l-1 14H7L6 6Z"/><path d="M8 9h8"/><path d="M15 15c1.2.4 2 1.3 2 2.4"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/><path d="M2 19h20"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M9 13h6"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.09.37.3.72.6 1 .3.28.69.42 1.1.4h.1v4h-.1c-.41-.02-.8.12-1.1.4-.3.28-.51.63-.6 1Z"/></svg>'
]);

export function mountSubjectNavigationIcons(doc = document) {
  const icons = doc.querySelectorAll("[data-subject-toolbar=bottom] > * span");
  icons.forEach((icon, index) => {
    if (!SUBJECT_NAV_ICONS[index]) return;
    icon.classList.add("mobile-nav-icon");
    icon.innerHTML = SUBJECT_NAV_ICONS[index];
  });
}
