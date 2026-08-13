const CHEMISTRY_SAVE_KEY = "kongjuiya-chem-save";

function formatBeans(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("ko-KR");
}

function readSharedBeans() {
  try {
    const save = JSON.parse(localStorage.getItem(CHEMISTRY_SAVE_KEY) || "null");
    return save?.economy?.beans ?? 0;
  } catch {
    return 0;
  }
}

function renderBeans() {
  const value = formatBeans(readSharedBeans());
  document.querySelectorAll("[data-shared-beans]").forEach(node => {
    node.textContent = value;
  });
}

function mountToolbarParity() {
  if (document.documentElement.dataset.toolbarParityReady === "true") return;
  if (document.documentElement.dataset.subjectShellReady !== "true") {
    requestAnimationFrame(mountToolbarParity);
    return;
  }

  const topbar = document.querySelector(".subject-topbar");
  const brand = document.querySelector(".subject-brand");
  const desktopNav = document.querySelector(".subject-desktop-nav");
  const actions = document.querySelector(".subject-top-actions");
  const portal = actions?.querySelector(".portal-return");
  const settings = actions?.querySelector(".settings-button");
  const mobileNav = document.querySelector(".subject-mobile-nav");
  const shopLink = desktopNav?.querySelector("a");

  topbar?.classList.add("lobby-topbar");
  brand?.classList.add("app-brand");
  brand?.querySelector(":scope > span:first-child")?.classList.add("brand-seal");
  desktopNav?.classList.add("desktop-tabs");
  actions?.classList.add("topbar-actions");
  mobileNav?.classList.add("mobile-bottom-nav");

  const brandSubtitle = brand?.querySelector("small");
  if (brandSubtitle) brandSubtitle.textContent = "Group Resolution: 과학 훈련의 새로운 패러다임";

  if (portal) {
    portal.classList.add("science-portal-link");
    portal.textContent = "전체 과목";
    portal.setAttribute("aria-label", "과학 통합관으로 이동");
  }

  if (actions && !actions.querySelector(".bean-wallet")) {
    const wallet = document.createElement("a");
    wallet.className = "bean-wallet";
    wallet.href = shopLink?.href || "../../shop.html";
    wallet.setAttribute("aria-label", "콩 상점으로 이동");
    wallet.innerHTML = '<small>보유 콩</small><strong data-shared-beans>0</strong>';
    actions.insertBefore(wallet, settings || null);
  }

  if (settings) settings.classList.add("topbar-icon");

  const mobilePortal = mobileNav?.querySelector("a:last-child");
  mobilePortal?.classList.add("mobile-portal-link");
  if (mobilePortal) mobilePortal.setAttribute("aria-label", "과학 통합관으로 이동");

  renderBeans();
  addEventListener("storage", event => {
    if (event.key === CHEMISTRY_SAVE_KEY) renderBeans();
  });

  document.documentElement.dataset.toolbarMaster = "chemistry";
  document.documentElement.dataset.toolbarParityReady = "true";
}

mountToolbarParity();
