import {
  SHOP_ITEMS,
  SHOP_ITEM_MAP,
  STARTER_COSMETICS,
  DEFAULT_EQUIPPED_COSMETICS,
  categoryFor
} from "../../data/shop-catalog.js";
import { safeLocalStorage } from "./safe-storage.js";

export const COSMETIC_STORAGE_KEY = "kongjuiya-cosmetics-v1";

const cloneDefaults = () => ({
  version: 1,
  owned: [...STARTER_COSMETICS],
  equipped: { ...DEFAULT_EQUIPPED_COSMETICS }
});

const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const emit = (type, detail) => {
  if (typeof globalThis.CustomEvent === "function") {
    globalThis.dispatchEvent?.(new CustomEvent(type, { detail }));
  }
};

function normalize(value) {
  const source = object(value);
  const owned = new Set([...STARTER_COSMETICS, ...(Array.isArray(source.owned) ? source.owned : [])]);
  for (const id of [...owned]) if (!SHOP_ITEM_MAP[id]) owned.delete(id);
  const equipped = { ...DEFAULT_EQUIPPED_COSMETICS };
  const sourceEquipped = object(source.equipped);
  for (const category of Object.keys(equipped)) {
    const id = sourceEquipped[category];
    if (SHOP_ITEM_MAP[id]?.category === category && owned.has(id)) equipped[category] = id;
  }
  return { version: 1, owned: [...owned], equipped };
}

export class CosmeticSystem {
  constructor(gameStorage, storage = safeLocalStorage) {
    if (!gameStorage) throw new Error("CosmeticSystem requires GameStorage.");
    this.gameStorage = gameStorage;
    this.storage = storage;
    this.data = this.load();
    this.busy = false;
  }

  load() {
    try {
      const value = normalize(JSON.parse(this.storage?.getItem(COSMETIC_STORAGE_KEY) || "null"));
      this.save(value);
      return value;
    } catch {
      const value = cloneDefaults();
      this.save(value);
      return value;
    }
  }

  save(value = this.data) {
    this.data = normalize(value);
    try {
      this.storage?.setItem(COSMETIC_STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }

  beans() {
    return Math.max(0, Math.floor(Number(this.gameStorage.data.economy?.beans) || 0));
  }

  owns(id) {
    return this.data.owned.includes(id);
  }

  equipped(category) {
    return this.data.equipped[category] || DEFAULT_EQUIPPED_COSMETICS[category];
  }

  isEquipped(id) {
    const item = SHOP_ITEM_MAP[id];
    return Boolean(item && this.equipped(item.category) === id);
  }

  card(id) {
    const item = SHOP_ITEM_MAP[id];
    if (!item) return null;
    return {
      ...item,
      owned: this.owns(id),
      equipped: this.isEquipped(id),
      affordable: this.beans() >= item.price
    };
  }

  cards(category = null) {
    return SHOP_ITEMS.filter(item => !category || item.category === category).map(item => this.card(item.id));
  }

  purchase(id) {
    if (this.busy) return { ok: false, reason: "busy" };
    const item = SHOP_ITEM_MAP[id];
    if (!item) return { ok: false, reason: "unknown_item" };
    if (this.owns(id)) return { ok: false, reason: "already_owned", card: this.card(id) };
    const beans = this.beans();
    if (beans < item.price) return { ok: false, reason: "insufficient_beans", beans, cost: item.price, card: this.card(id) };

    this.busy = true;
    const beforeCosmetics = JSON.stringify(this.data);
    const beforeGame = JSON.stringify(this.gameStorage.data);
    try {
      this.gameStorage.data.economy.beans -= item.price;
      this.gameStorage.data.economy.spentBeans = (this.gameStorage.data.economy.spentBeans || 0) + item.price;
      this.gameStorage.data.overall.totalBeansSpent = (this.gameStorage.data.overall.totalBeansSpent || 0) + item.price;
      this.data.owned.push(id);
      this.data.equipped[item.category] = id;
      if (!this.save() || !this.gameStorage.persist()) {
        this.data = JSON.parse(beforeCosmetics);
        this.gameStorage.data = JSON.parse(beforeGame);
        this.save();
        this.gameStorage.persist();
        return { ok: false, reason: "save_failed" };
      }
      const detail = { id, item, beans: this.beans(), equipped: { ...this.data.equipped } };
      emit("cosmetic:purchased", detail);
      emit("cosmetic:equipped", detail);
      return { ok: true, ...detail };
    } finally {
      this.busy = false;
    }
  }

  equip(id) {
    const item = SHOP_ITEM_MAP[id];
    if (!item) return { ok: false, reason: "unknown_item" };
    if (!this.owns(id)) return { ok: false, reason: "not_owned", card: this.card(id) };
    this.data.equipped[item.category] = id;
    if (!this.save()) return { ok: false, reason: "save_failed" };
    const detail = { id, item, beans: this.beans(), equipped: { ...this.data.equipped } };
    emit("cosmetic:equipped", detail);
    return { ok: true, ...detail };
  }

  visualState(overrides = {}) {
    const equipped = { ...this.data.equipped, ...overrides };
    return Object.fromEntries(Object.entries(equipped).map(([category, id]) => {
      const item = SHOP_ITEM_MAP[id] || SHOP_ITEM_MAP[DEFAULT_EQUIPPED_COSMETICS[category]];
      return [category, item?.visualKey || "default"];
    }));
  }

  apply(target, overrides = {}) {
    if (!target) return null;
    const visual = this.visualState(overrides);
    target.dataset.toolSkin = visual.tool;
    target.dataset.kongjwiOutfit = visual.outfit;
    target.dataset.toadSkin = visual.toad;
    target.dataset.jarSkin = visual.jar;
    return visual;
  }

  category(id) {
    return categoryFor(id);
  }
}
