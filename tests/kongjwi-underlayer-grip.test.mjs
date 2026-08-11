import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");
const [catalog, manifestText, renderer, shop, css, uiEffects, builder, effects] = await Promise.all([
  read("data/shop-catalog.js"),
  read("assets/art/game-scene/manifest.json"),
  read("assets/js/scene-renderer.js"),
  read("assets/js/shop-navigation.js"),
  read("assets/css/scene-source-aspect-fix.css"),
  read("assets/js/ui-effects.js"),
  read("scripts/build-kongjwi-pour-sheets.py"),
  read("assets/js/scene-cosmetic-effects.js")
]);
const manifest = JSON.parse(manifestText);

assert.ok(catalog.includes("outfit_underlayer"));
assert.ok(shop.includes("kongjwi-underlayer-cutout.png"));
assert.ok(
  ["20260808-anatomy-safe1", "20260808-head-safe1", "20260808-head-safe2", "20260808-layer-safe1"].includes(manifest.version),
  `unexpected migration version ${manifest.version}`
);
assert.equal(manifest.assets.kongjwi.underlayer.integratedTools, undefined);
assert.equal(manifest.runtimePolicy.kongjwiMotionPolicy, "source-locked-intact-all-outfits");
assert.equal(manifest.runtimePolicy.kongjwiFramePolicy, "source-character-pixels-whole-body-pose-only");
assert.ok(
  ["never-segment-flattened-character-png", "complete-source-required-no-headless-cutouts"]
    .includes(manifest.runtimePolicy.anatomySafetyPolicy)
);
assert.equal(manifest.runtimePolicy.toolMotionPolicy, "source-master-grip-pivot-co-registered");
assert.equal(manifest.runtimePolicy.uniformScalePolicy, "shared-2048x1152-contain");
assert.deepEqual(manifest.placements.tool, manifest.placements.kongjwi);
assert.deepEqual(manifest.placements.tool, { x: 205, y: 260, width: 546, height: 820 });
assert.equal(manifest.sprites.tool.cell.height, 768);

assert.ok(renderer.includes("const versionedAssetUrl ="));
assert.ok(renderer.includes("fitStackToHost"));
assert.ok(renderer.includes("Math.min(hostWidth / logical.width, hostHeight / logical.height)"));
assert.ok(renderer.includes("dataset.toolRig"));
assert.ok(renderer.includes("resolveSceneCosmeticEffects"));
assert.ok(!renderer.includes("integratedToolGrip"));
assert.ok(!renderer.includes("integratedGrip"));

assert.ok(!css.includes("--scene-x: 10.009765625%"), "tool placement must stay manifest-owned instead of being duplicated in CSS");
assert.ok(!css.includes("--scene-height: 71.18055556%"), "tool placement must stay manifest-owned instead of being duplicated in CSS");
assert.ok(!css.includes("--jar-source-aspect-x"));
assert.ok(!css.includes("scaleX(var(--jar-source-aspect-x"));

assert.ok(builder.includes("def build_intact_frames"));
assert.ok(builder.includes("frames.append(pose_frame(base, body_angle, dx, dy))"));
assert.ok(builder.includes("rotate_tool_about_grip"));
assert.ok(builder.includes("TOOL_SOURCES"));
assert.ok(builder.includes("NIGHT_FACE_POLYGON"));
assert.ok(builder.includes("def ensure_night_court_head"));
assert.ok(builder.includes('manifest["layers"]["scene-tool"] = 11'));
for (const destructiveToken of ["FOREARM_POLYGON", "FOREARM_ANGLES", "mask_from_polygon", "forearm_mask", "elbow_patch"]) {
  assert.ok(!builder.includes(destructiveToken), `flattened character art must not use ${destructiveToken}`);
}
assert.ok(effects.includes("night-court-moon-aura"));
assert.ok(effects.includes("moon-silver-stream"));
assert.ok(uiEffects.includes('game-cosmetics-entry.js'));

console.log("complete Kongjwi anatomy, visible bucket grip, and uniform scene scaling locked");
