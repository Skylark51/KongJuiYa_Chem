import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skins = {
  onggi: { source: "옹기", runtime: "전통-옹기" },
  celadon: { source: "청자", runtime: "청자" },
  "moon-white": { source: "달빛-백색", runtime: "달항아리" },
  "night-lacquer": { source: "밤-칠기", runtime: "흑칠-야광" }
};
const version = "20260807-source-locked-jars1";

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", `${file} must be PNG`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test("all four jar skins use canonical Korean source PNG pairs", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/그림/게임-장면/manifest.json"), "utf8"));
  assert.equal(manifest.runtimePolicy.jarFramePolicy, "source-locked-paired-png");
  assert.equal(manifest.sprites.jar.frames, 2);
  assert.deepEqual(manifest.sprites.jar.states, { back: 0, front: 1 });

  for (const [skin, dirs] of Object.entries(skins)) {
    const jar = manifest.assets.jars[skin];
    const sourceOpen = `assets/그림/공용/원본/장독대/${dirs.source}/열림.png`;
    const sourceClosed = `assets/그림/공용/원본/장독대/${dirs.source}/닫힘.png`;
    const layers = `assets/그림/게임-장면/장독대/${dirs.runtime}/장독대-레이어.png?v=${version}`;
    assert.equal(jar.sourceOpen, sourceOpen);
    assert.equal(jar.sourceClosed, sourceClosed);
    assert.equal(jar.fallback, sourceOpen);
    assert.equal(jar.layers, layers);
    assert.equal(manifest.availability[layers], true);
    assert.equal(fs.existsSync(path.join(root, sourceOpen)), true);
    assert.equal(fs.existsSync(path.join(root, sourceClosed)), true);
  }
});

test("derived jar layers keep their runtime dimensions and canonical metadata", () => {
  for (const dirs of Object.values(skins)) {
    const base = path.join(root, "assets/그림/게임-장면/장독대", dirs.runtime);
    assert.deepEqual(pngSize(path.join(base, "열림-두꺼비-없음.png")), [1024, 1024]);
    assert.deepEqual(pngSize(path.join(base, "구멍-전경.png")), [1024, 1024]);
    assert.deepEqual(pngSize(path.join(base, "장독대-레이어.png")), [2048, 1024]);

    const parts = JSON.parse(fs.readFileSync(path.join(base, "parts.json"), "utf8"));
    assert.equal(parts.frameLock, true);
    assert.match(parts.sourceOpen, /^assets\/그림\/공용\/원본\/장독대\//);
    assert.match(parts.sourceClosed, /^assets\/그림\/공용\/원본\/장독대\//);
    assert.equal(parts.runtimeFrames.back, 0);
    assert.equal(parts.runtimeFrames.front, 1);
  }
});

test("jar manifest no longer depends on retired English art folders", () => {
  const manifestText = fs.readFileSync(path.join(root, "assets/그림/게임-장면/manifest.json"), "utf8");
  assert.doesNotMatch(manifestText, /assets\/art\/jars/);
  assert.doesNotMatch(manifestText, /\.webp/i);
  assert.doesNotMatch(manifestText, /data:image/i);
});
