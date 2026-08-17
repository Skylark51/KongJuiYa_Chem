import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const manifest = JSON.parse(read("assets/그림/게임-장면/manifest.json"));
const html = read("콩쥐야_줘때써.html");
const renderer = read("assets/js/scene-renderer.js");
const controller = read("assets/js/scene-state-machine.js");
const controls = read("assets/js/quiz-shell-controls.js");
const cosmetics = read("assets/js/game-cosmetics-entry.js");
const themeSystem = read("assets/js/theme-system.js");
const sceneComposition = read("assets/css/quiz-scene-composition.css");
const validator = read("scripts/validate-layered-scene.mjs");

const layerNames = [
  "scene-background", "scene-kongjwi", "scene-tool", "scene-water-stream",
  "scene-jar-back", "scene-water-fill", "scene-toad-skin", "scene-toad-expression",
  "scene-jar-front", "scene-water-splash", "scene-water-leak", "scene-foreground", "scene-ui"
];

test("manifest owns one shared 2048×1152 coordinate system", () => {
  assert.deepEqual(manifest.logicalSize, { width: 2048, height: 1152 });
  assert.deepEqual(Object.keys(manifest.layers), layerNames);
  assert.equal(manifest.runtimePolicy.format, "png");
  assert.equal(manifest.runtimePolicy.base64, false);
  assert.equal(manifest.runtimePolicy.webpFallback, false);
  assert.equal(manifest.runtimePolicy.cssSkinFilters, false);
  for (const anchor of ["kongjwiFeet", "toolHandle", "waterStart", "jarMouthCenter", "jarHoleCenter", "toadFace"]) {
    assert.ok(manifest.anchors[anchor], `missing anchor: ${anchor}`);
  }
});

test("renderer creates exactly one ordered logical layer stack", () => {
  assert.match(renderer, /const ORDER = \[/);
  let previous = -1;
  for (const name of layerNames) {
    const index = renderer.indexOf(`"${name}"`);
    assert.ok(index > previous, `${name} must follow the manifest order`);
    previous = index;
  }
  assert.match(renderer, /function createStack/);
  assert.match(renderer, /stack\.id = "layeredScene"/);
  assert.match(renderer, /createSceneStateController\(renderer, manifest\)/);
  assert.match(html, /class="scene-animation-zone"/);
  assert.doesNotMatch(html, /game-asset-animation\.js/);
});

test("legacy actor markup and compatibility bootstrap are removed", () => {
  assert.doesNotMatch(html, /scene-background-layer|scene-cinematic-shade|quiz-scene-actors|sceneJarActor|sceneToadSprite|scene-leak-effect/);
  assert.doesNotMatch(renderer, /querySelectorAll\("\.scene-background-layer/);
  assert.equal(fs.existsSync(path.join(root, "assets/js/quiz-scene-actors.js")), false);
  assert.equal(fs.existsSync(path.join(root, "assets/js/photoreal-scene.js")), false);
  assert.match(cosmetics, /root\.__mountedGameScene/);
});

test("runtime art path is PNG-only", () => {
  const runtime = [
    html, renderer, controller, controls, cosmetics, themeSystem, sceneComposition
  ].join("\n");
  assert.doesNotMatch(runtime, /data:image\/jpeg;base64/i);
  assert.doesNotMatch(runtime, /\.webp(?:["')?])/i);
  assert.doesNotMatch(runtime, /SCENE_ART_LAYOUT|scene-photo\/jar-photo-/);
  assert.doesNotMatch(renderer, /hue-rotate|sepia\(|saturate\(/);
  assert.match(themeSystem, /const JAR_PREVIEW_PNGS/);
  assert.doesNotMatch(sceneComposition, /toad-expression-sprite\.webp/);
});

test("optional toad expression overlay cannot bypass PNG integrity validation", () => {
  const overlay = manifest.assets.effects.toadExpression;
  assert.ok(overlay?.path, "expression overlay path should remain declared");
  if (overlay.enabled === true) {
    assert.equal(manifest.availability[overlay.path], true, "enabled overlay must be production-required");
  }
  assert.match(validator, /expressionOverlay\?\.enabled === true/);
  assert.match(validator, /truncated PNG chunk/);
  assert.match(validator, /IEND chunk missing/);
  assert.match(validator, /trailing data after IEND/);
});

test("one state controller owns all required quiz scene events", () => {
  assert.match(controller, /class LayeredSceneStateController/);
  for (const eventName of [
    "game:start", "question:changed", "answer:correct", "answer:wrong", "answer:timeout",
    "water:warning", "water:critical", "fever:start", "game:clear", "game:over",
    "game:pause", "game:resume"
  ]) assert.match(controller, new RegExp(`"${eventName}"`));
});
