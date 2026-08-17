import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const skins = ["onggi", "celadon", "moon-white", "night-lacquer"];
const version = "20260807-source-locked-jars1";
const jarRoot = "assets/그림/게임-장면/장독대";
const jarDirs = {
  onggi: "전통-옹기",
  celadon: "청자",
  "moon-white": "달항아리",
  "night-lacquer": "흑칠-야광",
}
const jarLayer = "장독대-레이어.png";
const jarOpen = "열림-두꺼비-없음.png";
const jarHole = "구멍-전경.png";

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", `${file} must be PNG`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test("all four jar skins use source-locked two-frame PNG animation sheets", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/그림/게임-장면/manifest.json"), "utf8"));
  assert.equal(manifest.runtimePolicy.jarFramePolicy, "source-locked-paired-png");
  assert.equal(manifest.sprites.jar.frames, 2);
  assert.deepEqual(manifest.sprites.jar.states, { back: 0, front: 1 });

  for (const skin of skins) {
    const jar = manifest.assets.jars[skin];
    assert.equal(jar.sourceOpen, `assets/art/jars/${skin}/lid-open.png`);
    assert.equal(jar.sourceClosed, `assets/art/jars/${skin}/thumbnail-no-toad.png`);
    assert.equal(jar.layers, jarRoot + "/" + jarDirs[skin] + "/" + jarLayer + "?v=" + version);
    assert.equal(manifest.availability[jar.layers], true, `${skin} authored layer sheet must be enabled`);
  }
});

test("derived jar parts are RGBA PNGs at the authored runtime dimensions", () => {
  for (const skin of skins) {
    const dir = path.join(root, jarRoot, jarDirs[skin]);
    assert.deepEqual(pngSize(path.join(dir, jarOpen)), [1024, 1024]);
    assert.deepEqual(pngSize(path.join(dir, jarHole)), [1024, 1024]);
    assert.deepEqual(pngSize(path.join(dir, jarLayer)), [2048, 1024]);

    const parts = JSON.parse(fs.readFileSync(path.join(dir, "parts.json"), "utf8"));
    assert.equal(parts.frameLock, true);
    assert.equal(parts.runtimeFrames.back, 0);
    assert.equal(parts.runtimeFrames.front, 1);
    assert.match(parts.runtimePolicy, /source-locked open jar/);
  }
});

test("jar runtime does not introduce WebP or base64 fallbacks", () => {
  const manifestText = fs.readFileSync(path.join(root, "assets/그림/게임-장면/manifest.json"), "utf8");
  assert.doesNotMatch(manifestText, /\.webp/i);
  assert.doesNotMatch(manifestText, /data:image/i);
});
