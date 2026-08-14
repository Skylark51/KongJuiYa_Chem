export function collectSubjectToolbarNodes(doc = document) {
  const topbar = doc.querySelector(".subject-topbar");
  const brand = doc.querySelector(".subject-brand");
  const desktopNav = doc.querySelector(".subject-desktop-nav");
  const actions = doc.querySelector(".subject-top-actions");
  const mobileNav = doc.querySelector(".subject-mobile-nav");

  return {
    topbar,
    brand,
    desktopNav,
    actions,
    mobileNav,
    portal: actions?.querySelector(".portal-return") || null,
    settings: actions?.querySelector(".settings-button") || null,
    shopLink: desktopNav?.querySelector("a") || null,
    mobilePortal: mobileNav?.querySelector("a:last-child") || null
  };
}
