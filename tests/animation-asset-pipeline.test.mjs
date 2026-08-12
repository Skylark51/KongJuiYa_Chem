import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const relativeManifest =
  "assets/art/game-scene-precision-v1/animation-manifest.json";
const read = relative => fs.readFileSync(path.join(root, relative));
const json = relative => JSON.parse(read(relative).toString("utf8"));

function pngSize(relative) {
  const buffer = read(relative);
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test("precision manifest promotes only audited court-pour assets and preserves production coordinates", () => {
  const manifest = json(relativeManifest);
  assert.equal(manifest.activeRuntime, true);
  assert.deepEqual(manifest.sceneLogicalSize, { width: 2048, height: 1152 });
  assert.equal(manifest.productionReference, "assets/art/game-scene/manifest.json");
  assert.equal(manifest.policy.format, "png");
  assert.equal(manifest.policy.sourceOverwrite, false);
  assert.equal(manifest.policy.resamplingForAlignment, false);
  assert.equal(manifest.policy.webp, false);
  assert.equal(manifest.policy.base64, false);
});

test("precision builder uses integer translation without scale or rotation", () => {
  const builder = read("scripts/build-precision-animation-assets.py").toString("utf8");
  for (const forbidden of [".resize(", ".rotate(", "Image.Resampling", "shutil.move"]) {
    assert.ok(!builder.includes(forbidden), `builder must not use ${forbidden}`);
  }
  assert.ok(builder.includes('"integerCorrection"'));
  assert.ok(builder.includes('"resampled": False'));
});

test("alignment records show fixed anchors and no resampling", () => {
  const corrections = json(
    "assets/art/game-scene-precision-v1/alignment-corrections.json"
  );
  assert.equal(corrections.policy.translation, "integer-only");
  assert.equal(corrections.policy.resampling, false);
  for (const sequence of corrections.sequences) {
    for (const frame of sequence.frames) {
      assert.equal(frame.resampled, false);
      const [ax, ay] = frame.anchorAfter;
      const [tx, ty] = frame.targetAnchor;
      assert.ok(Math.hypot(ax - tx, ay - ty) <= 1.5);
      assert.ok(Number.isInteger(frame.integerCorrection[0]));
      assert.ok(Number.isInteger(frame.integerCorrection[1]));
    }
  }
});

test("new masters and runtime candidates are high-resolution RGBA PNG canvases", () => {
  assert.deepEqual(
    pngSize("assets/art/game-scene-precision-v1/masters/water-droplets-chroma.png"),
    [1536, 1024]
  );
  assert.deepEqual(
    pngSize("assets/art/game-scene-precision-v1/masters/water-droplets-rgba.png"),
    [1536, 1024]
  );
  assert.deepEqual(
    pngSize(
      "assets/art/game-scene-precision-v1/sequences/effects/water-droplets/water-droplets-sheet.png"
    ),
    [4096, 512]
  );
  for (const variant of ["dolsoe-a", "dolsoe-b", "dolsoe-c"]) {
    assert.deepEqual(
      pngSize(
        `assets/art/game-scene-precision-v1/sequences/servants/${variant}/${variant}-sheet.png`
      ),
      [2048, 768]
    );
  }
});

test("V2 Dolsoe source remains byte-identical to its registered source hash", () => {
  const source = read("assets/art/game-scene-v2/servants/dolsoe-water-sheet.png");
  const hash = crypto.createHash("sha256").update(source).digest("hex");
  assert.equal(
    hash,
    "f73fb9d99d664ef18b258b345ebcc5a77cd940516505ce0c7753d78a6bd5782d"
  );
});

test("committed precision audit and contact sheets are deterministic and current", () => {
  const python = process.platform === "win32" ? "py" : "python3";
  const result = spawnSync(
    python,
    ["scripts/audit-animation-assets.py", "--check-artifacts"],
    { cwd: root, encoding: "utf8" }
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = json(
    "assets/art/game-scene-precision-v1/qa/animation-audit.json"
  );
  assert.equal(report.summary.strictFailures, 0);
  assert.equal(report.summary.missingFrames, 0);
  assert.equal(report.summary.dimensionMismatches, 0);
  assert.equal(report.summary.duplicateSequences, 0);
  for (const item of report.sequences.filter(
    sequence => sequence.qualityGate === "strict"
  )) {
    assert.equal(item.status, "PASS", item.id);
    assert.ok(
      fs.existsSync(
        path.join(
          root,
          "assets/art/game-scene-precision-v1/qa/contact-sheets",
          `${item.id}.png`
        )
      )
    );
  }
});

test("night-court summon audits its actual aligned RGBA envelope", () => {
  const manifest = json(relativeManifest);
  const nightCourt = manifest.sequences.find(
    sequence => sequence.id === "production-kongjwi-night-court-pour"
  );
  assert.equal(nightCourt.anchor.type, "effect-envelope-bottom-center");
  assert.equal(nightCourt.anchor.metric, "bboxBottomCenter");
  const auditor = read("scripts/audit-animation-assets.py").toString("utf8");
  assert.ok(auditor.includes('"bboxBottomCenter"'));
  assert.ok(auditor.includes('metric["measuredAnchor"]'));
  assert.ok(auditor.includes("current_rgba.tobytes() == candidate_rgba.tobytes()"));
});

test("production renderer stays shared while court effect mounts promoted precision assets", () => {
  const renderer = read("assets/js/scene-renderer.js").toString("utf8");
  const courtEffect = read("assets/js/court-servant-effect.js").toString("utf8");
  assert.ok(renderer.includes("../art/game-scene/manifest.json"));
  assert.ok(!renderer.includes("game-scene-precision-v1"));
  assert.ok(courtEffect.includes("dolsoe-c-sheet.png"));
  assert.ok(courtEffect.includes("water-droplets-sheet.png"));
  assert.ok(!courtEffect.includes("kongjwi-field-work-cutout.png"));
});
