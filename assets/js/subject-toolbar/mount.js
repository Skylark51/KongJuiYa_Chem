import { collectSubjectToolbarNodes } from "./nodes.js";
import {
  applyChemistryToolbarClassContract,
  ensureSharedBeanWallet,
  normalizeSubjectToolbarCopy
} from "./chemistry-contract.js";
import { bindSharedBeanUpdates, renderSharedBeans } from "./beans.js";
import { safeLocalStorage } from "../safe-storage.js";

export function mountSubjectToolbarParity({ doc = document, target = window } = {}) {
  const html = doc.documentElement;
  if (html.dataset.toolbarParityReady === "true") return true;
  if (html.dataset.subjectShellReady !== "true") return false;

  const nodes = collectSubjectToolbarNodes(doc);
  if (!nodes.topbar || !nodes.brand || !nodes.desktopNav || !nodes.actions || !nodes.mobileNav) return false;

  applyChemistryToolbarClassContract(nodes);
  normalizeSubjectToolbarCopy(nodes);
  ensureSharedBeanWallet(nodes, doc);
  renderSharedBeans(doc, safeLocalStorage);
  bindSharedBeanUpdates(target, doc, safeLocalStorage);

  html.dataset.toolbarMaster = "chemistry";
  html.dataset.toolbarParityReady = "true";
  return true;
}

export function startSubjectToolbarParity({ doc = document, target = window } = {}) {
  const attempt = () => {
    if (!mountSubjectToolbarParity({ doc, target })) target.requestAnimationFrame(attempt);
  };
  attempt();
}
