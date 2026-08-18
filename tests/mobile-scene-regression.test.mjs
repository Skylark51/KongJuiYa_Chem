import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const manifest = JSON.parse(read("assets/그림/게임-장면/manifest.json"));

test("jar cards always use the currently equipped jar PNG without recoloring", () => {
  const source = read("assets/js/theme-system.js");
  assert.match(source, /const JAR_PREVIEW_PNGS = Object\.freeze\(\{/);
  for (const skin of ["onggi", "celadon", "moon-white", "night-lacquer"]) {
    assert.match(source, new RegExp(`(?:"${skin}"|${skin}):`));
  }
  assert.match(source, /readEquippedJarSkin/);
  assert.match(source, /saved\?\.equipped\?\.jar/);
  assert.match(source, /createJarPreview\(mode, jarSkin = readEquippedJarSkin\(\)\)/);
  assert.match(source, /refreshJarPreviews/);
  assert.match(source, /filter:\s*none\s*!important/);
  assert.doesNotMatch(source, /hue-rotate|sepia\(|thumbnailFilter/);
});

test("layered scene loads the current runtime stylesheet and one uniform logical scale", () => {
  const renderer = read("assets/js/scene-renderer.js");
  assert.match(renderer, /game-asset-animation\.css\?v=20260818-fixed-scene-frame1/);
  assert.match(renderer, /await ensureRuntimeStylesheet\(\)/);
  assert.match(renderer, /function fitStackToHost/);
  assert.match(renderer, /Math\.min\(hostWidth \/ logical\.width, hostHeight \/ logical\.height\)/);
  assert.match(renderer, /stack\.dataset\.scaleMode = "uniform-contain"/);
  assert.match(renderer, /new ResizeObserver/);
  assert.match(renderer, /stack\.dataset\.assetMode =/);
  assert.match(renderer, /"coherent-fallback"/);
  assert.match(renderer, /const motionRig = authoredKongjwi\.authored && authoredTool\.authored/);
  assert.match(renderer, /fallbackWaterArc/);
});

test("static fallback actors use explicit shared-coordinate placements", () => {
  assert.equal(manifest.logicalSize.width, 2048);
  assert.equal(manifest.logicalSize.height, 1152);
  assert.equal(manifest.runtimePolicy.fallbackMode, "coherent-static-rig");
  assert.equal(manifest.runtimePolicy.uniformScalePolicy, "shared-2048x1152-contain");
  assert.equal(manifest.responsive.mobile.scaleMode, "uniform-contain");
  for (const actor of ["kongjwi", "tool", "waterStream", "toad"]) {
    assert.ok(manifest.fallbackPlacements[actor], `missing fallback placement: ${actor}`);
  }

  const css = read("assets/css/game-asset-animation.css");
  assert.match(css, /\.scene-layer-image\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain;/s);
  assert.match(css, /data-kongjwi-mode="static"/);
  assert.match(css, /layered-static-tool-pour/);
  assert.match(css, /layered-fallback-water/);
});

test("portrait quiz reserves a visible animation stage before sizing the keypad", () => {
  const css = read("assets/css/mobile-quiz-balance.css");

  assert.match(css, /--mobile-scene-height:\s*clamp\(284px,\s*42dvh,\s*348px\)/);
  assert.match(css, /max-height:\s*700px[\s\S]*--mobile-scene-height:\s*clamp\(268px,\s*43dvh,\s*296px\)/);
  assert.match(css, /max-height:\s*590px[\s\S]*--mobile-scene-height:\s*clamp\(220px,\s*40dvh,\s*244px\)/);
  assert.match(css, /\.scene-panel,\s*\n\s*\.game-stage\s*\{[^}]*height:\s*var\(--mobile-scene-height\)/s);
  assert.match(css, /\.scene-question-bubble\s*\{[^}]*top:\s*7px;[^}]*min-height:\s*76px;/s);
  assert.match(css, /\.scene-question-bubble::after\s*\{\s*display:\s*none;/s);
  assert.match(css, /\.mobile-keypad\s*\{[^}]*gap:\s*4px;[^}]*padding:\s*4px;/s);
  assert.match(css, /max-height:\s*700px[\s\S]*\.mobile-keypad button,[\s\S]*min-height:\s*38px\s*!important/);
});
