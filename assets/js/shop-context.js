import { subjectById } from "../../data/subjects.js";
import { siteUrl, subjectLobbyUrl } from "./site-routing.js";
import { mountSubjectNavigationIcons } from "./subject-toolbar/icons.js";

export const LAST_SUBJECT_KEY = "kongjuiya:last-subject";
export const DEFAULT_SHOP_SUBJECT = "chemistry";

function validSubject(id) {
  return subjectById(id)?.id || null;
}

export function resolveShopSubject(url, storage = globalThis.localStorage) {
  const params = new URL(url).searchParams;

  if (params.has("subject")) {
    return validSubject(params.get("subject")) || DEFAULT_SHOP_SUBJECT;
  }

  if (params.has("from")) {
    return validSubject(params.get("from")) || DEFAULT_SHOP_SUBJECT;
  }

  try {
    return validSubject(storage?.getItem(LAST_SUBJECT_KEY)) || DEFAULT_SHOP_SUBJECT;
  } catch {
    return DEFAULT_SHOP_SUBJECT;
  }
}

export function shopUrlForSubject(subjectId, documentRef = document) {
  const id = validSubject(subjectId) || DEFAULT_SHOP_SUBJECT;
  return siteUrl("shop.html?subject=" + encodeURIComponent(id), documentRef);
}

export function returnUrlForSubject(subjectId, view = "home", documentRef = document) {
  const id = validSubject(subjectId) || DEFAULT_SHOP_SUBJECT;
  return subjectLobbyUrl(id, view, documentRef);
}

function navigationTarget(link) {
  const authoredHref = link.getAttribute("href") || "";
  const label = (link.textContent || "").replace(/\s+/g, " ").trim();

  if (authoredHref.includes("shop.html") || /(?:콩\s*)?상점$/.test(label)) return "shop";
  if (authoredHref.includes("view=home") || /홈$/.test(label)) return "home";
  if (authoredHref.includes("view=jars") || /장독대$/.test(label)) return "jars";
  if (authoredHref.includes("view=records") || /기록$/.test(label)) return "records";
  return null;
}

export function mountShopContext({
  documentRef = document,
  locationRef = location,
  storage = globalThis.localStorage
} = {}) {
  const subjectId = resolveShopSubject(locationRef.href, storage);
  const subject = subjectById(subjectId);
  const root = documentRef.documentElement;
  const body = documentRef.body;
  const route = view => returnUrlForSubject(subject.id, view, documentRef);
  const shopRoute = shopUrlForSubject(subject.id, documentRef);

  root.dataset.subject = subject.id;
  root.dataset.shopSubject = subject.id;
  root.dataset.returnSubject = subject.id;
  if (body) body.dataset.subject = subject.id;

  try {
    storage?.setItem(LAST_SUBJECT_KEY, subject.id);
  } catch {
    // URL context still keeps the active theme when storage is unavailable.
  }

  documentRef.querySelectorAll(".desktop-tabs a, .mobile-bottom-nav a").forEach(link => {
    const target = navigationTarget(link);
    if (target === "shop") link.href = shopRoute;
    if (target === "home") link.href = route("home");
    if (target === "jars") link.href = route("jars");
    if (target === "records") link.href = route("records");
  });

  const bottomNav = documentRef.querySelector(".mobile-bottom-nav");
  if (bottomNav) {
    bottomNav.classList.add("subject-mobile-nav");
    bottomNav.dataset.subjectToolbar = "bottom";
    bottomNav.setAttribute("aria-label", subject.name + "편 주요 메뉴");
  }
  mountSubjectNavigationIcons(documentRef);

  const brand = documentRef.querySelector(".app-brand");
  if (brand) {
    brand.href = route("home");
    brand.setAttribute("aria-label", subject.name + "편 홈으로 이동");
    const title = brand.querySelector("strong");
    if (title) title.textContent = "콩쥐야 줘때써 - " + subject.name + "편";
  }

  const settingsTitle = documentRef.getElementById("settingsTitle");
  if (settingsTitle) settingsTitle.textContent = "콩쥐야 줘때써 - " + subject.name + "편 설정";

  documentRef.title = "콩 상점 | 콩쥐야 줘때써 - " + subject.name + "편";
  root.dataset.shopContextReady = "true";
  return Object.freeze({ subject, shopRoute, homeRoute: route("home") });
}

if (typeof document !== "undefined" && typeof location !== "undefined") {
  mountShopContext();
}
