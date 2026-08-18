import { subjectById } from "../../../data/subjects.js";
import { siteUrl } from "../site-routing.js";
import { bindSharedBeanUpdates, renderSharedBeans } from "./beans.js";
import { mountSubjectNavigationIcons } from "./icons.js";
import { createSubjectToolbarMarkup, replaceSubjectToolbars } from "./markup.js";

export function mountSubjectToolbar({ doc = document, target = window } = {}) {
  const html = doc.documentElement;
  if (html.dataset.subjectToolbarReady === "true") return true;
  const subject = subjectById(html.dataset.subject);
  if (!subject) return false;
  if (subject.id !== "chemistry" && html.dataset.subjectShellReady !== "true") return false;

  const shopHref = siteUrl("shop.html?subject=" + encodeURIComponent(subject.id));
  const portalHref = siteUrl("");
  const activeView = new URL(target.location.href).searchParams.get("view") || "home";
  const markup = createSubjectToolbarMarkup({ subject, shopHref, portalHref, activeView });

  if (subject.id === "chemistry") replaceSubjectToolbars(doc, markup);
  if (!doc.querySelector("[data-subject-toolbar=top]") || !doc.querySelector("[data-subject-toolbar=bottom]")) return false;
  mountSubjectNavigationIcons(doc);
  renderSharedBeans(doc, target.localStorage);
  bindSharedBeanUpdates(target, doc, target.localStorage);

  html.dataset.toolbarMaster = "chemistry";
  html.dataset.subjectToolbarReady = "true";
  return true;
}

export function startSubjectToolbar({ doc = document, target = window } = {}) {
  const attempt = () => {
    if (!mountSubjectToolbar({ doc, target })) target.requestAnimationFrame(attempt);
  };
  attempt();
}
