import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GameStorage, STORAGE_KEY } from "../assets/js/storage.js";
import { CosmeticSystem, COSMETIC_STORAGE_KEY } from "../assets/js/cosmetic-system.js";
import {
  DEFAULT_SHOP_SUBJECT,
  LAST_SUBJECT_KEY,
  resolveShopSubject,
  returnUrlForSubject,
  shopUrlForSubject
} from "../assets/js/shop-context.js";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");
const SUBJECTS = ["chemistry", "physics", "biology", "earth-science"];

class MemoryStorage {
  constructor(entries = []) { this.map = new Map(entries); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const documentRef = {
  baseURI: "https://example.test/KongJuiYa_Chem/shop.html",
  documentElement: { dataset: { siteRoot: "./" } }
};

test("shop subject context follows URL, last subject, and safe fallback priority", () => {
  const memory = new MemoryStorage([[LAST_SUBJECT_KEY, "biology"]]);
  assert.equal(resolveShopSubject("https://example.test/shop.html?subject=physics", memory), "physics");
  assert.equal(resolveShopSubject("https://example.test/shop.html?from=earth-science", memory), "earth-science");
  assert.equal(resolveShopSubject("https://example.test/shop.html", memory), "biology");
  assert.equal(resolveShopSubject("https://example.test/shop.html?subject=asdf", memory), DEFAULT_SHOP_SUBJECT);
  assert.equal(resolveShopSubject("https://example.test/shop.html?from=asdf", memory), DEFAULT_SHOP_SUBJECT);
  assert.equal(resolveShopSubject("https://example.test/shop.html", new MemoryStorage()), DEFAULT_SHOP_SUBJECT);
});

test("shop and return routes preserve the selected subject", () => {
  for (const subject of SUBJECTS) {
    assert.equal(shopUrlForSubject(subject, documentRef), "https://example.test/KongJuiYa_Chem/shop.html?subject=" + subject);
    assert.equal(returnUrlForSubject(subject, "records", documentRef), "https://example.test/KongJuiYa_Chem/subjects/" + subject + "/?view=records");
  }
  assert.equal(returnUrlForSubject("asdf", "home", documentRef), "https://example.test/KongJuiYa_Chem/subjects/chemistry/");
});

test("all subjects share canonical beans, owned items, and equipped cosmetics", () => {
  const canonical = new MemoryStorage();
  const chemistryGame = new GameStorage(canonical);
  chemistryGame.data.economy.beans = 1000;
  chemistryGame.persist();
  const chemistryShop = new CosmeticSystem(chemistryGame, canonical);
  const purchase = chemistryShop.purchase("outfit_blue_scholar");
  assert.equal(purchase.ok, true);
  assert.equal(purchase.beans, 720);

  for (const subject of ["physics", "biology", "earth-science"]) {
    const subjectGame = new GameStorage(canonical);
    const subjectShop = new CosmeticSystem(subjectGame, canonical);
    assert.equal(subjectGame.data.economy.beans, 720, subject + " bean balance");
    assert.equal(subjectShop.owns("outfit_blue_scholar"), true, subject + " inventory");
    assert.equal(subjectShop.equipped("outfit"), "outfit_blue_scholar", subject + " equipment");
  }
  assert.deepEqual([...canonical.map.keys()].sort(), [COSMETIC_STORAGE_KEY, STORAGE_KEY].sort());
});

test("one shop document exposes four isolated variable themes without product duplication", async () => {
  const [html, themes, catalog] = await Promise.all([
    read("shop.html"),
    read("assets/css/shop-subject-themes.css"),
    read("data/shop-catalog.js")
  ]);
  assert.match(html, /shop-subject-themes\.css/);
  assert.match(html, /shop-context\.js[^]*shop-navigation\.js/);
  for (const subject of SUBJECTS) assert.ok(themes.includes('data-shop-subject="' + subject + '"'));
  assert.equal((html.match(/id="shopWorkspace"/g) || []).length, 1);
  assert.doesNotMatch(catalog, /physics|biology|earth-science|chemistryBeans|physicsBeans/);
});

test("every subject entry carries an explicit shop subject", async () => {
  const chemistry = await read("subjects/chemistry/index.html");
  assert.equal((chemistry.match(/shop\.html\?subject=chemistry/g) || []).length, 3);
  const shell = await read("assets/js/subject-shell.js");
  assert.match(shell, /shop\.html\?subject=/);
  assert.doesNotMatch(shell, /shop\.html\?from=/);
  const recordDetail = await read("record-detail.html");
  assert.match(recordDetail, /shop\.html\?subject=chemistry/);
});
