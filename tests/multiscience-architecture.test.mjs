import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SUBJECTS, subjectById } from "../data/subjects.js";
import {
  CHEMISTRY_STORAGE_POLICY,
  SubjectStorage,
  subjectStorageKey
} from "../assets/js/subject-storage.js";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");

test("subject registry is the single four-subject route source", () => {
  assert.deepEqual(SUBJECTS.map(subject => subject.id), [
    "chemistry", "physics", "biology", "earth-science"
  ]);
  assert.equal(new Set(SUBJECTS.map(subject => subject.route)).size, 4);
  assert.equal(new Set(SUBJECTS.map(subject => subject.theme)).size, 4);
  for (const subject of SUBJECTS) {
    assert.equal(subjectById(subject.id), subject);
    assert.match(subject.route, /^subjects\/[a-z-]+\/$/);
  }
});

test("root portal and subject routes use shared modules", async () => {
  const portal = await read("index.html");
  assert.match(portal, /id="subjectGrid"/);
  assert.match(portal, /assets\/js\/subject-portal\.js/);
  assert.match(portal, /legacyViews = new Set\(\["home", "jars", "records"\]\)/);
  assert.doesNotMatch(portal, /assets\/js\/lobby-actions\.js/);

  const shellFiles = ["physics", "biology", "earth-science"];
  for (const subject of shellFiles) {
    const html = await read(`subjects/${subject}/index.html`);
    assert.match(html, new RegExp(`data-subject="${subject}"`));
    assert.match(html, /assets\/js\/subject-shell\.js/);
    assert.doesNotMatch(html, /question|training-modes\.js/i);
  }
});

test("chemistry remains on legacy storage while new subjects are namespaced", () => {
  assert.equal(CHEMISTRY_STORAGE_POLICY.migrate, false);
  assert.equal(subjectStorageKey("physics", "records"), "kongjuiya:physics:records");
  assert.equal(subjectStorageKey("biology", "progress"), "kongjuiya:biology:progress");
  assert.throws(() => subjectStorageKey("chemistry", "records"), /existing storage schema/i);

  const memory = new Map();
  const storage = {
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value)
  };
  const physics = new SubjectStorage("physics", storage);
  const biology = new SubjectStorage("biology", storage);
  physics.write("records", [{ score: 10 }]);
  biology.write("records", [{ score: 20 }]);
  assert.deepEqual(physics.read("records"), [{ score: 10 }]);
  assert.deepEqual(biology.read("records"), [{ score: 20 }]);
  assert.equal(memory.has("kongjuiya-chem-save"), false);
});

test("chemistry lobby keeps deep-path assets and direct root routes", async () => {
  const html = await read("subjects/chemistry/index.html");
  assert.match(html, /data-site-root="\.\.\/\.\.\//);
  for (const asset of [
    "../../assets/css/lobby-scene.css",
    "../../assets/js/lobby-actions.js",
    "../../assets/js/lobby-navigation.js",
    "../../shop.html"
  ]) assert.ok(html.includes(asset), `missing chemistry route: ${asset}`);

  const actions = await read("assets/js/lobby-actions.js");
  const navigation = await read("assets/js/lobby-navigation.js");
  assert.match(actions, /siteUrl\("콩쥐야_줘때써\.html\?training="/);
  assert.match(navigation, /link\.href = siteUrl\(href\)/);
});

test("all authored local href and src targets exist", async () => {
  const htmlFiles = [
    "index.html", "shop.html", "record-detail.html", "콩쥐야_줘때써.html",
    "subjects/index.html", ...SUBJECTS.map(subject => `${subject.route}index.html`)
  ];
  for (const htmlFile of htmlFiles) {
    const html = await read(htmlFile);
    for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const reference = match[1];
      if (/^(?:[a-z]+:|#|\?)/i.test(reference)) continue;
      const clean = reference.split(/[?#]/)[0];
      if (!clean) continue;
      const candidate = resolve(root, dirname(htmlFile), clean);
      const target = clean.endsWith("/") ? resolve(candidate, "index.html") : candidate;
      await assert.doesNotReject(stat(target), `${htmlFile} -> ${reference}`);
    }
  }
});
