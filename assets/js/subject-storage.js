const SUBJECT_STORAGE_PREFIX = "kongjuiya";
const SEGMENT_PATTERN = /^[a-z][a-z0-9-]*$/;

export const CHEMISTRY_STORAGE_POLICY = Object.freeze({
  mode: "legacy-compatibility",
  migrate: false,
  description: "Existing chemistry keys remain unchanged."
});

export const GLOBAL_STORAGE_KEYS = Object.freeze({
  deviceMode: "kongjuiya-device-mode",
  audioSettings: "kongjuiya-audio-settings",
  vibration: "kongjuiya-vibration",
  cosmetics: "kongjuiya-cosmetics-v1"
});

export function subjectStorageKey(subjectId, segment) {
  if (!SEGMENT_PATTERN.test(subjectId) || !SEGMENT_PATTERN.test(segment)) {
    throw new TypeError("Subject storage identifiers must be lowercase slugs.");
  }
  if (subjectId === "chemistry") {
    throw new Error("Chemistry uses its existing storage schema through the compatibility policy.");
  }
  return `${SUBJECT_STORAGE_PREFIX}:${subjectId}:${segment}`;
}

export class SubjectStorage {
  constructor(subjectId, storage = globalThis.localStorage) {
    if (subjectId === "chemistry") {
      throw new Error("Use GameStorage for chemistry to preserve existing user data.");
    }
    this.subjectId = subjectId;
    this.storage = storage;
  }

  read(segment, fallback = null) {
    const raw = this.storage?.getItem(subjectStorageKey(this.subjectId, segment));
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  write(segment, value) {
    this.storage?.setItem(subjectStorageKey(this.subjectId, segment), JSON.stringify(value));
    return value;
  }
}
