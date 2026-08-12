import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const skins = ["underlayer", "classic-red", "blue-scholar", "field-work", "ragged", "night-court"];
const tools = ["wood", "brass", "celadon", "moon"];

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", `${file} must be PNG`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test("all-outfit motion manifest uses the anatomy-safe uniform scene policy", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/art/game-scene/manifest.json"), "utf8"));
  assert.ok(
    ["20260808-anatomy-safe1", "20260808-head-safe1", "20260808-head-safe2", "20260808-layer-safe1", "20260812-night-court-summon1"].includes(manifest.version),
    `unexpected migration version ${manifest.version}`
  );
  assert.equal(
    manifest.runtimePolicy.kongjwiMotionPolicy,
    "source-locked-intact-standard-outfits-night-court-summon-derived"
  );
  assert.equal(manifest.runtimePolicy.kongjwiFramePolicy, "source-character-pixels-whole-body-pose-only");
  assert.ok(
    ["never-segment-flattened-character-png", "complete-source-required-no-headless-cutouts"]
      .includes(manifest.runtimePolicy.anatomySafetyPolicy)
  );
  assert.equal(manifest.runtimePolicy.toolMotionPolicy, "source-master-grip-pivot-co-registered");
  assert.equal(manifest.runtimePolicy.uniformScalePolicy, "shared-2048x1152-contain");
  assert.equal(manifest.runtimePolicy.waterAnimationPolicy, "synchronized-pour-fill-leak");
  assert.equal(manifest.responsive.mobile.scaleMode, "uniform-contain");
  assert.deepEqual(manifest.sprites.kongjwi.cell, { width: 512, height: 768 });
});

test("all bucket sheets remain co-registered", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/art/game-scene/manifest.json"), "utf8"));
  assert.deepEqual(manifest.sprites.tool.cell, { width: 512, height: 768 });
  assert.deepEqual(manifest.placements.tool, manifest.placements.kongjwi);
  assert.ok(manifest.layers["scene-foreground"] < manifest.layers["scene-kongjwi"], "foreground must not occlude Kongjwi");
  for (const tool of tools) {
    const sheet = manifest.assets.tools[tool].sheet;
    assert.equal(manifest.availability[sheet], true);
    assert.deepEqual(pngSize(path.join(root, sheet)), [4096, 768]);
  }
});

test("renderer keeps one logical aspect and cache-busts scene PNGs", () => {
  const renderer = fs.readFileSync(path.join(root, "assets/js/scene-renderer.js"), "utf8");
  assert.ok(renderer.includes("const versionedAssetUrl ="));
  assert.ok(renderer.includes("const scale = Math.min(hostWidth / logical.width, hostHeight / logical.height)"));
  assert.ok(renderer.includes('stack.dataset.scaleMode = "uniform-contain"'));
  assert.ok(renderer.includes("new ResizeObserver"));
  assert.ok(renderer.includes("sceneAssetVersion = manifest.version"));
});

test("correct state stages character, stream, splash and leak", () => {
  const stateMachine = fs.readFileSync(path.join(root, "assets/js/scene-state-machine.js"), "utf8");
  assert.ok(stateMachine.includes("POUR_CHARACTER_FRAMES"));
  assert.ok(stateMachine.includes('setFlowPhase("pour")'));
  assert.ok(stateMachine.includes('this.playSequence("waterStream"'));
  assert.ok(stateMachine.includes('this.playSequence("waterSplash"'));
  assert.ok(stateMachine.includes("this.startLeakLoop({ energetic: true })"));
  assert.ok(stateMachine.includes("delay: 410"));
});

test("builder preserves complete flattened outfits and repairs a dropped night-court face/head matte", () => {
  const builder = fs.readFileSync(path.join(root, "scripts/build-kongjwi-pour-sheets.py"), "utf8");
  assert.ok(builder.includes("def ensure_night_court_head"));
  assert.ok(builder.includes("ensure_night_court_head(root)"));
  assert.ok(builder.includes("NIGHT_FACE_POLYGON"));
  assert.ok(builder.includes("NIGHT_FACE_REQUIRED_RATIO"));
  assert.ok(builder.includes("added_alpha = ImageChops.subtract(donor_head, current_alpha)"));
  assert.ok(builder.includes('manifest["layers"]["scene-tool"] = 11'));
  assert.ok(builder.includes("def build_intact_frames"));
  assert.ok(builder.includes('current_rgba.tobytes() == sheet.tobytes()'));
  assert.ok(builder.includes("frames, hand_points = build_intact_frames(base)"));
  assert.ok(builder.includes("frames.append(pose_frame(base, body_angle, dx, dy))"));
  assert.ok(builder.includes("hand_points.append(pose_point(HAND, body_angle, dx, dy))"));
  assert.ok(builder.includes('master_path = root / "assets/art/kongjwi-tools" / TOOL_SOURCES[tool_key]'));
  for (const destructiveToken of ["FOREARM_POLYGON", "FOREARM_ANGLES", "mask_from_polygon", "forearm_mask", "elbow_patch"]) {
    assert.ok(!builder.includes(destructiveToken), `builder must never segment character art with ${destructiveToken}`);
  }
});

test("no actor is corrected with nonuniform jar scaling", () => {
  const aspect = fs.readFileSync(path.join(root, "assets/css/scene-source-aspect-fix.css"), "utf8");
  assert.ok(!aspect.includes("--jar-source-aspect-x"));
  assert.ok(!aspect.includes("scaleX(var(--jar-source-aspect-x"));
  assert.ok(aspect.includes("transform: none !important"));
});

test("item and night-court effects are data keyed", () => {
  const registry = fs.readFileSync(path.join(root, "assets/js/scene-cosmetic-effects.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "assets/css/scene-motion-polish.css"), "utf8");
  assert.ok(registry.includes('"night-court": "night-court-moon-aura"'));
  for (const tool of tools) assert.ok(registry.includes(`${tool}:`));
  assert.ok(css.includes('data-outfit-fx="night-court-moon-aura"'));
  assert.ok(css.includes('data-tool-fx="moon-silver-stream"'));
});

test("all Kongjwi sheets remain PNG and available", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/art/game-scene/manifest.json"), "utf8"));
  for (const skin of skins) {
    const sheet = manifest.assets.kongjwi[skin].sheet;
    assert.equal(manifest.availability[sheet], true);
    assert.deepEqual(pngSize(path.join(root, sheet)), [4096, 768]);
  }
});

test("night-court production motion is the authored summon sequence", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/art/game-scene/manifest.json"), "utf8"));
  const provenance = JSON.parse(fs.readFileSync(
    path.join(root, "assets/art/game-scene/kongjwi/night-court/provenance.json"),
    "utf8"
  ));
  const stateMachine = fs.readFileSync(path.join(root, "assets/js/scene-state-machine.js"), "utf8");
  const servantCss = fs.readFileSync(path.join(root, "assets/css/court-servant-effect.css"), "utf8");

  assert.equal(manifest.assets.kongjwi["night-court"].actionMode, "summon-servant-pour");
  assert.equal(
    manifest.runtimePolicy.nightCourtMotionSource,
    "assets/art/game-scene-v2/kongjwi/night-court/summon-sheet.png"
  );
  assert.deepEqual(provenance.frameMap, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(provenance.designPolicy, "preserve-source-rgba-no-redraw");
  for (const frame of provenance.alignments) {
    assert.ok(Math.abs(frame.anchor.x - 256) <= 0.5, "frame " + frame.frame + " center anchor drifted");
    assert.equal(frame.anchor.y, 756, "frame " + frame.frame + " bottom anchor drifted");
  }
  assert.ok(stateMachine.includes("plan.nightCourtKongjwiTimeline || plan.kongjwiTimeline"));
  assert.match(
    servantCss,
    /\.scene-layer-stack\[data-kongjwi-outfit="night-court"\] > \.scene-tool\s*\{[\s\S]*?visibility:\s*hidden/
  );
});
