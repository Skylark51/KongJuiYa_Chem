import { subjectById } from "../../data/subjects.js";
import { siteUrl, subjectLobbyUrl } from "./site-routing.js";

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

  root.dataset.shopSubject = subject.id;
  root.dataset.returnSubject = subject.id;
  if (body) body.dataset.subject = subject.id;

  try {
    storage?.setItem(LAST_SUBJECT_KEY, subject.id);
  } catch {
    // URL context still keeps the active theme when storage is unavailable.
  }

  documentRef.querySelectorAll(".desktop-tabs a, .mobile-bottom-nav a").forEach(link => {
    const text = link.textContent.trim();
    if (text === "홈") link.href = route("home");
    if (text === "장독대") link.href = route("jars");
    if (text === "기록") link.href = route("records");
    if (text === "콩 상점" || text === "상점") link.href = shopRoute;
  });

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
