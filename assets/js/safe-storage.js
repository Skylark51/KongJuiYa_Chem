function createMemoryStorage() {
  const values = new Map();
  return Object.freeze({
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); }
  });
}

/** Storage-compatible fallback for privacy-restricted browser contexts. */
export function createSafeStorage(kind, { globalRef = globalThis, fallback = createMemoryStorage() } = {}) {
  const nativeStorage = () => {
    try { return globalRef?.[kind] || null; }
    catch { return null; }
  };
  const call = (method, ...args) => {
    const storage = nativeStorage();
    if (method === "setItem" || method === "removeItem" || method === "clear") fallback[method](...args);
    try {
      if (storage && typeof storage[method] === "function") return storage[method](...args);
    } catch {
      // Keep the current page usable when persistent storage is blocked.
    }
    return fallback[method](...args);
  };
  return Object.freeze({
    getItem(key) { return call("getItem", key); },
    setItem(key, value) { return call("setItem", key, value); },
    removeItem(key) { return call("removeItem", key); },
    clear() { return call("clear"); }
  });
}

export const safeLocalStorage = createSafeStorage("localStorage");
export const safeSessionStorage = createSafeStorage("sessionStorage");
