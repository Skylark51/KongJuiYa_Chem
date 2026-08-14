export function applyChemistryToolbarClassContract(nodes) {
  nodes.topbar?.classList.add("lobby-topbar");
  nodes.brand?.classList.add("app-brand");
  nodes.brand?.querySelector(":scope > span:first-child")?.classList.add("brand-seal");
  nodes.desktopNav?.classList.add("desktop-tabs");
  nodes.actions?.classList.add("topbar-actions");
  nodes.mobileNav?.classList.add("mobile-bottom-nav");
  nodes.settings?.classList.add("topbar-icon");
  nodes.mobilePortal?.classList.add("mobile-portal-link");
}

export function normalizeSubjectToolbarCopy(nodes) {
  const brandSubtitle = nodes.brand?.querySelector("small");
  if (brandSubtitle) brandSubtitle.textContent = "Group Resolution: 과학 훈련의 새로운 패러다임";

  if (nodes.portal) {
    nodes.portal.classList.add("science-portal-link");
    nodes.portal.textContent = "전체 과목";
    nodes.portal.setAttribute("aria-label", "과학 통합관으로 이동");
  }

  if (nodes.mobilePortal) {
    nodes.mobilePortal.setAttribute("aria-label", "과학 통합관으로 이동");
  }
}

export function ensureSharedBeanWallet(nodes, doc = document) {
  if (!nodes.actions || nodes.actions.querySelector(".bean-wallet")) return;
  const wallet = doc.createElement("a");
  wallet.className = "bean-wallet";
  wallet.href = nodes.shopLink?.href || "../../shop.html";
  wallet.setAttribute("aria-label", "콩 상점으로 이동");
  wallet.innerHTML = '<small>보유 콩</small><strong data-shared-beans>0</strong>';
  nodes.actions.insertBefore(wallet, nodes.settings || null);
}
