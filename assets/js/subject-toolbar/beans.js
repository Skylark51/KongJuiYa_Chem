export const SHARED_CHEMISTRY_SAVE_KEY = "kongjuiya-chem-save";
import { safeLocalStorage } from "../safe-storage.js";

export function formatSharedBeans(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("ko-KR");
}

export function readSharedBeans(storage = safeLocalStorage) {
  try {
    const save = JSON.parse(storage.getItem(SHARED_CHEMISTRY_SAVE_KEY) || "null");
    return save?.economy?.beans ?? 0;
  } catch {
    return 0;
  }
}

export function renderSharedBeans(doc = document, storage = safeLocalStorage) {
  const value = formatSharedBeans(readSharedBeans(storage));
  doc.querySelectorAll("[data-shared-beans]").forEach(node => {
    node.textContent = value;
  });
}

export function bindSharedBeanUpdates(target = window, doc = document, storage = safeLocalStorage) {
  const onStorage = event => {
    if (event.key === SHARED_CHEMISTRY_SAVE_KEY) renderSharedBeans(doc, storage);
  };
  target.addEventListener("storage", onStorage);
  return () => target.removeEventListener("storage", onStorage);
}
