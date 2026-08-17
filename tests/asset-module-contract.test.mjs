import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
const exists = async path => {
  const info = await stat(resolve(root, path));
  assert.ok(info.isFile() || info.isDirectory(), `${path} must exist`);
};

const [sources, v2] = await Promise.all([
  readJson("assets/art/source-locked/manifest.json"),
  readJson("assets/art/game-scene-v2/manifest-v2.json")
]);

assert.equal(sources.policy.immutableOriginals, true);
assert.equal(sources.policy.allowRegeneratedKongjwiOriginals, false);
assert.equal(sources.policy.kongjwiAnimationSource, "current-production-cutout-png-only");

assert.equal(v2.activeRuntime, false, "V2 must stay parallel until module validation is complete");
assert.equal(v2.contracts.sourceLocked, true);
assert.equal(v2.contracts.newKongjwiOriginalGenerationAllowed, false);
assert.equal(v2.contracts.kongjwiDerivativeRule, "derive-from-source-locked-current-production-art-only");

const kongjwiKeys = ["underlayer", "classic-red", "blue-scholar", "field-work", "ragged", "night-court"];
for (const key of kongjwiKeys) {
  const source = sources.kongjwi[key];
  const module = v2.modules.kongjwi[key];
  assert.ok(source, `missing locked Kongjwi source: ${key}`);
  assert.ok(module, `missing V2 Kongjwi module: ${key}`);
  assert.match(source.path, /^assets\/그림\/공용\/원본\/콩쥐\/.+\/기본-오려내기\.png$/);
  assert.doesNotMatch(source.path, /\.webp$/i);
  assert.equal(module.sourceOriginal, source.path);
  assert.equal(module.identityPolicy, "source-locked-current-art");
  assert.equal(module.actionMode, key === "night-court" ? "servant-pour" : "self-pour");

  await Promise.all([exists(source.path), exists(source.legacyPath), exists(module.derivedRoot)]);

  const [lockedBytes, productionBytes] = await Promise.all([
    readFile(resolve(root, source.path)),
    readFile(resolve(root, source.legacyPath))
  ]);
  assert.deepEqual(
    lockedBytes,
    productionBytes,
    `${key} source-locked PNG must remain byte-identical to the current production original`
  );
}

for (const entry of Object.values(sources.tools)) {
  await Promise.all([exists(entry.path), exists(entry.legacyPath)]);
}
for (const jar of Object.values(sources.jars)) {
  await Promise.all([
    exists(jar.closed.path), exists(jar.closed.legacyPath),
    exists(jar.open.path), exists(jar.open.legacyPath)
  ]);
}
for (const entry of Object.values(sources.toad)) {
  await Promise.all([exists(entry.path), exists(entry.legacyPath)]);
}

assert.equal(v2.modules.servants.status, "contract-only");
assert.deepEqual(v2.modules.servants.requiredBy, ["night-court"]);

console.log("asset-module-contract: source-locked originals and parallel V2 modules are intact");
