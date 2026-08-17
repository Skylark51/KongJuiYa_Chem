#!/usr/bin/env python3
"""Normalize the current blue-scholar 30f art and repair its runtime contract.

This is intentionally a current-design preservation tool, not a redraw tool.
The packed 1024x1536 source contains 30 visually distinct figures, but those
figures overlap the nominal 5x6 grid and their body scale drifts by row.  The
runtime therefore cannot safely crop that file as 30 equal cells.

The repair recovers each existing figure from the authored RGBA pixels,
registers the feet to one anchor, applies only a uniform whole-frame scale to
remove row-by-row zoom drift, and writes a true 5x6 sprite sheet with fixed
256x384 cells.  No face, costume, pose, effect, or colour is redrawn.
"""
from __future__ import annotations

from pathlib import Path
import hashlib
import json
import shutil

import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ROOT / "assets/art/game-scene-v2/kongjwi/blue-scholar/pour-sheet.png"
RUNTIME = ROOT / "assets/그림/게임-장면/콩쥐/청색-학자복/물붓기-동작.png"
PREVIEW = ROOT / "assets/art/game-scene-v2/kongjwi/blue-scholar/preview.png"
PROVENANCE = ROOT / "assets/art/game-scene-v2/kongjwi/blue-scholar/normalization.json"
PACKED_SIZE = (1024, 1536)
CELL = (256, 384)
GRID = (5, 6)
NORMALIZED_SIZE = (CELL[0] * GRID[0], CELL[1] * GRID[1])
TARGET_FOOT = (128, 350)
TARGET_BODY_HEIGHT = 260
CORE_ALPHA = 96
MIN_CORE_AREA = 10000


def _png_rgba(path: Path) -> Image.Image:
    with Image.open(path) as source:
        source.load()
        return source.convert("RGBA")


def _validate_normalized(image: Image.Image) -> None:
    if image.size != NORMALIZED_SIZE:
        raise RuntimeError(f"normalized size mismatch: {image.size} != {NORMALIZED_SIZE}")
    for index in range(30):
        x = index % GRID[0] * CELL[0]
        y = index // GRID[0] * CELL[1]
        cell = image.crop((x, y, x + CELL[0], y + CELL[1]))
        bbox = cell.getchannel("A").getbbox()
        if not bbox:
            raise RuntimeError(f"frame {index} is empty")
        if bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= CELL[0] or bbox[3] >= CELL[1]:
            raise RuntimeError(f"frame {index} touches/crosses its production cell: {bbox}")


def normalize_current_design() -> tuple[str, str, list[dict]]:
    source_bytes = CANONICAL.read_bytes()
    source_sha = hashlib.sha256(source_bytes).hexdigest()
    source = _png_rgba(CANONICAL)

    if source.size == NORMALIZED_SIZE:
        _validate_normalized(source)
        first = source.crop((0, 0, CELL[0], CELL[1]))
        first.save(PREVIEW, format="PNG", optimize=True, compress_level=9)
        shutil.copyfile(CANONICAL, RUNTIME)
        output_sha = hashlib.sha256(CANONICAL.read_bytes()).hexdigest()
        return source_sha, output_sha, []

    if source.size != PACKED_SIZE:
        raise RuntimeError(f"expected packed current-design source {PACKED_SIZE}, got {source.size}")

    rgba = np.array(source)
    alpha = rgba[:, :, 3]
    core = (alpha > CORE_ALPHA).astype(np.uint8)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(core, 8)

    components = []
    for label in range(1, count):
        x, y, w, h, area = stats[label]
        if int(area) >= MIN_CORE_AREA:
            components.append((label, int(x), int(y), int(w), int(h), int(area), centroids[label]))
    if len(components) != 30:
        raise RuntimeError(f"packed source must expose exactly 30 character cores, found {len(components)}")

    # Reading order is six visual rows of five.  We detect the characters first
    # instead of trusting the invalid nominal grid boundaries.
    by_y = sorted(components, key=lambda item: float(item[6][1]))
    ordered = []
    for row in range(GRID[1]):
        ordered.extend(sorted(by_y[row * GRID[0]:(row + 1) * GRID[0]], key=lambda item: float(item[6][0])))

    # Assign every non-transparent authored pixel to its nearest detected
    # character core.  This preserves loose hair, sleeves and magic effects that
    # extend outside the old nominal cells without importing pixels from a
    # neighbouring frame.
    seeds = np.zeros_like(labels, dtype=np.int16)
    for index, component in enumerate(ordered, 1):
        seeds[labels == component[0]] = index
    _, nearest_indices = distance_transform_edt(seeds == 0, return_indices=True)
    nearest = seeds[nearest_indices[0], nearest_indices[1]]

    frames: list[Image.Image] = []
    metrics: list[dict] = []
    for index, component in enumerate(ordered, 1):
        visible = (nearest == index) & (alpha > 0)
        ys, xs = np.where(visible)
        if not len(xs):
            raise RuntimeError(f"frame {index - 1} became empty during separation")
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)
        crop = rgba[y0:y1, x0:x1].copy()
        local = visible[y0:y1, x0:x1]
        crop[:, :, 3] = np.where(local, crop[:, :, 3], 0)

        label = component[0]
        core_ys, core_xs = np.where(labels == label)
        bottom = int(core_ys.max() + 1)
        foot_band = core_ys >= core_ys.max() - 20
        foot_x = float(np.median(core_xs[foot_band]))

        # Estimate body height in a narrow vertical band around the feet.  Wide
        # sleeves and raised arms then do not masquerade as camera zoom.
        central = (core_xs >= foot_x - 40) & (core_xs <= foot_x + 40)
        body_ys = core_ys[central]
        body_height = int(body_ys.max() + 1 - body_ys.min())

        local_foot_x = foot_x - x0
        local_foot_y = bottom - y0
        left, right = x0 - foot_x, x1 - foot_x
        top, below = y0 - bottom, y1 - bottom

        target_scale = TARGET_BODY_HEIGHT / max(1, body_height)
        fit_x_left = (TARGET_FOOT[0] - 4) / (-left) if left < 0 else 99.0
        fit_x_right = (CELL[0] - 4 - TARGET_FOOT[0]) / right if right > 0 else 99.0
        fit_y_top = (TARGET_FOOT[1] - 8) / (-top) if top < 0 else 99.0
        fit_y_bottom = (CELL[1] - 4 - TARGET_FOOT[1]) / below if below > 0 else 99.0
        scale = min(target_scale, fit_x_left, fit_x_right, fit_y_top, fit_y_bottom)
        if not 0.90 <= scale <= 1.16:
            raise RuntimeError(f"frame {index - 1} requires unsafe whole-frame scale {scale:.4f}")

        frame = Image.fromarray(crop, "RGBA")
        scaled_size = (max(1, round(frame.width * scale)), max(1, round(frame.height * scale)))
        frame = frame.resize(scaled_size, Image.Resampling.LANCZOS)
        paste_x = round(TARGET_FOOT[0] - local_foot_x * scale)
        paste_y = round(TARGET_FOOT[1] - local_foot_y * scale)

        cell = Image.new("RGBA", CELL, (0, 0, 0, 0))
        cell.alpha_composite(frame, (paste_x, paste_y))
        bbox = cell.getchannel("A").getbbox()
        if not bbox:
            raise RuntimeError(f"frame {index - 1} is empty after registration")
        if bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= CELL[0] or bbox[3] >= CELL[1]:
            raise RuntimeError(f"frame {index - 1} touches/crosses its fixed cell: {bbox}")

        frames.append(cell)
        metrics.append({
            "frame": index - 1,
            "sourceBBox": [x0, y0, x1, y1],
            "bodyCoreHeight": body_height,
            "uniformScale": round(float(scale), 6),
            "targetFootAnchor": list(TARGET_FOOT),
            "outputBBox": list(bbox),
        })

    sheet = Image.new("RGBA", NORMALIZED_SIZE, (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % GRID[0]) * CELL[0], (index // GRID[0]) * CELL[1]))
    _validate_normalized(sheet)

    CANONICAL.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CANONICAL, format="PNG", optimize=True, compress_level=9)
    RUNTIME.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(CANONICAL, RUNTIME)
    frames[0].save(PREVIEW, format="PNG", optimize=True, compress_level=9)
    output_sha = hashlib.sha256(CANONICAL.read_bytes()).hexdigest()
    return source_sha, output_sha, metrics


def patch_runtime(source_sha: str, output_sha: str, metrics: list[dict]) -> None:
    PROVENANCE.write_text(json.dumps({
        "sourceGitBlob": "1e7001361102fe5344f971f47774a6914e7239da",
        "sourceSha256BeforeNormalization": source_sha,
        "sourceSizeBeforeNormalization": {"width": PACKED_SIZE[0], "height": PACKED_SIZE[1]},
        "outputSha256": output_sha,
        "outputSize": {"width": NORMALIZED_SIZE[0], "height": NORMALIZED_SIZE[1]},
        "grid": {"columns": GRID[0], "rows": GRID[1]},
        "cell": {"width": CELL[0], "height": CELL[1]},
        "policy": "current-design-pixels-only-separate-register-uniform-whole-frame-scale-no-redraw",
        "componentCoreAlphaThreshold": CORE_ALPHA,
        "targetBodyCoreHeight": TARGET_BODY_HEIGHT,
        "targetFootAnchor": list(TARGET_FOOT),
        "frames": metrics,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    manifest_path = ROOT / "assets/그림/게임-장면/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["version"] = "20260815-blue-scholar-motionfix2"
    blue = manifest["assets"]["kongjwi"]["blue-scholar"]
    blue["sprite"] = {
        "frames": 30,
        "columns": 5,
        "rows": 6,
        "cell": {"width": CELL[0], "height": CELL[1]},
        "sourceSize": {"width": NORMALIZED_SIZE[0], "height": NORMALIZED_SIZE[1]},
    }
    blue["placement"] = dict(manifest["placements"]["kongjwi"])
    blue["animationProfile"] = "blue-scholar-30f"
    blue["actionMode"] = "magic-pour"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    renderer_path = ROOT / "assets/js/scene-renderer.js"
    renderer = renderer_path.read_text(encoding="utf-8")
    renderer = renderer.replace("20260815-blue-scholar-gridfix1", "20260815-blue-scholar-motionfix2")
    old = '''    if (isBlueScholar30f) clearLayer(layer(stack, "scene-water-stream"));
    else if (motionRig && chosen.stream.url) sprite(layer(stack, "scene-water-stream"), chosen.stream, s.waterStream);
    else fallbackWaterArc(layer(stack, "scene-water-stream"));'''
    new = '''    if (motionRig && chosen.stream.url) sprite(layer(stack, "scene-water-stream"), chosen.stream, s.waterStream);
    else fallbackWaterArc(layer(stack, "scene-water-stream"));'''
    if old not in renderer:
        raise RuntimeError("expected blue-scholar stream suppression block not found")
    renderer = renderer.replace(old, new, 1)
    old = '''    if (isBlueScholar30f) clearLayer(layer(stack, "scene-water-splash"));
    else if (motionRig && chosen.splash.url) sprite(layer(stack, "scene-water-splash"), chosen.splash, s.waterSplash);
    else clearLayer(layer(stack, "scene-water-splash"));'''
    new = '''    if (motionRig && chosen.splash.url) sprite(layer(stack, "scene-water-splash"), chosen.splash, s.waterSplash);
    else clearLayer(layer(stack, "scene-water-splash"));'''
    if old not in renderer:
        raise RuntimeError("expected blue-scholar splash suppression block not found")
    renderer_path.write_text(renderer.replace(old, new, 1), encoding="utf-8")

    state_path = ROOT / "assets/js/scene-state-machine.js"
    state = state_path.read_text(encoding="utf-8")
    state = state.replace(
        "const BLUE_SCHOLAR_IDLE_FRAMES = [0, 1, 2, 3, 2, 1, 0];",
        "const BLUE_SCHOLAR_IDLE_FRAMES = [0, 1, 0];",
    )
    state = state.replace(
        "const BLUE_SCHOLAR_WRONG_FRAMES = [25, 26, 27, 28, 29];",
        "const BLUE_SCHOLAR_WRONG_FRAMES = [0];",
    )
    old = '''    this.renderer.setFlowPhase("prepare");
    this.schedule(() => this.renderer.setFlowPhase("pour"), 400);
    this.schedule(() => this.renderer.setFlowPhase("settle"), 1040);
    if (!hold) this.schedule(() => this.renderer.setFlowPhase("idle"), 1320);'''
    new = '''    const blueScholar = this.isBlueScholar30f();
    this.renderer.setFlowPhase("prepare");
    this.schedule(() => this.renderer.setFlowPhase("pour"), blueScholar ? 660 : 400);
    this.schedule(() => this.renderer.setFlowPhase("settle"), blueScholar ? 1120 : 1040);
    if (!hold) this.schedule(() => this.renderer.setFlowPhase("idle"), 1320);'''
    if old not in state:
        raise RuntimeError("flow timing block not found")
    state = state.replace(old, new, 1)
    old = '''    if (this.isBlueScholar30f()) {
      this.playSequence("kongjwi", BLUE_SCHOLAR_FRAMES, 1320, { hold });
      this.startLeakLoop({ energetic: true });
      return;
    }'''
    new = '''    if (blueScholar) {
      this.playSequence("kongjwi", BLUE_SCHOLAR_FRAMES, 1320, { hold });
      this.renderer.setFrame("tool", 0);
      this.playSequence("waterStream", plan.waterStream || POUR_STREAM_FRAMES, 560, { delay: 660, hold });
      this.playSequence("waterSplash", plan.waterSplash || POUR_SPLASH_FRAMES, 430, { delay: 760, hold });
      this.startLeakLoop({ energetic: true });
      return;
    }'''
    if old not in state:
        raise RuntimeError("blue scholar feedback block not found")
    state_path.write_text(state.replace(old, new, 1), encoding="utf-8")

    shop_path = ROOT / "assets/js/shop-navigation.js"
    shop = shop_path.read_text(encoding="utf-8")
    shop = shop.replace("20260815-shop-static-cutout1", "20260815-blue-scholar-current-preview1")
    old_path = '`assets/art/source-locked/kongjwi/blue-scholar/base-cutout.png?v=${ASSET_VERSION}`'
    new_path = '`assets/art/game-scene-v2/kongjwi/blue-scholar/preview.png?v=${ASSET_VERSION}`'
    if old_path not in shop:
        raise RuntimeError("legacy blue scholar shop preview mapping not found")
    shop = shop.replace(old_path, new_path, 1)
    shop = shop.replace(
        "// The shop and wardrobe are static previews. Always use the canonical\n"
        "// source-locked full-body cutouts here; gameplay pour sheets belong only to\n"
        "// the quiz animation renderer and must never be enlarged inside shop cards.",
        "// The shop and wardrobe use static full-body previews. Blue scholar must\n"
        "// stay visually identical to the current 30-frame gameplay art, so its preview\n"
        "// is extracted from that canonical current-design sheet rather than the legacy cutout.",
    )
    shop_path.write_text(shop, encoding="utf-8")

    html_path = ROOT / "shop.html"
    html = html_path.read_text(encoding="utf-8").replace(
        "20260815-shop-static-cutout1", "20260815-blue-scholar-current-preview1"
    )
    html_path.write_text(html, encoding="utf-8")

    builder_path = ROOT / "scripts/build-kongjwi-pour-sheets.py"
    builder = builder_path.read_text(encoding="utf-8")
    builder = builder.replace(
        'expected_size = (1024, 1536) if skin == "blue-scholar" else (CELL[0] * FRAMES, CELL[1])',
        'expected_size = (256 * 5, 384 * 6) if skin == "blue-scholar" else (CELL[0] * FRAMES, CELL[1])',
    )
    builder = builder.replace(
        'manifest["version"] = "20260815-blue-scholar-30f1"',
        'manifest["version"] = "20260815-blue-scholar-motionfix2"',
    )
    old = '''    blue["sprite"] = {
        "frames": 30,
        "columns": 5,
        "rows": 6,
        "sourceSize": {"width": 1024, "height": 1536},
    }
    blue["placement"] = {"x": 150, "y": 260, "width": 657, "height": 820}
    blue["animationProfile"] = "blue-scholar-30f"'''
    new = '''    blue["sprite"] = {
        "frames": 30,
        "columns": 5,
        "rows": 6,
        "cell": {"width": 256, "height": 384},
        "sourceSize": {"width": 1280, "height": 2304},
    }
    blue["placement"] = dict(manifest["placements"]["kongjwi"])
    blue["animationProfile"] = "blue-scholar-30f"
    blue["actionMode"] = "magic-pour"'''
    if old not in builder:
        raise RuntimeError("builder blue scholar manifest block not found")
    builder_path.write_text(builder.replace(old, new, 1), encoding="utf-8")

    shop_test_path = ROOT / "tests/shop-outfit-preview-assets.test.mjs"
    test_text = shop_test_path.read_text(encoding="utf-8")
    test_text = test_text.replace(
        '"source-locked/kongjwi/blue-scholar/base-cutout.png",',
        '"game-scene-v2/kongjwi/blue-scholar/preview.png",',
    )
    assertion = '  assert.doesNotMatch(source, /OUTFIT_ART[\\s\\S]*?game-scene\\/kongjwi\\/[^`"]+\\/pour-sheet\\.png/);'
    if assertion not in test_text:
        raise RuntimeError("shop preview regression assertion not found")
    test_text = test_text.replace(
        assertion,
        assertion + '\n  assert.doesNotMatch(source, /source-locked\\/kongjwi\\/blue-scholar\\/base-cutout\\.png/);',
        1,
    )
    shop_test_path.write_text(test_text, encoding="utf-8")

    motion_test = ROOT / "tests/blue-scholar-30f-motion.test.mjs"
    motion_test.write_text('''import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url));
const text = path => read(path).toString("utf8");
const pngSize = path => { const b = read(path); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test("blue scholar canonical 30f sheet has true fixed 5x6 production cells", () => {
  assert.deepEqual(pngSize("assets/art/game-scene-v2/kongjwi/blue-scholar/pour-sheet.png"), [1280, 2304]);
  assert.deepEqual(pngSize("assets/그림/게임-장면/콩쥐/청색-학자복/물붓기-동작.png"), [1280, 2304]);
  assert.deepEqual(pngSize("assets/art/game-scene-v2/kongjwi/blue-scholar/preview.png"), [256, 384]);
  const manifest = JSON.parse(text("assets/그림/게임-장면/manifest.json"));
  const blue = manifest.assets.kongjwi["blue-scholar"];
  assert.equal(blue.sprite.frames, 30);
  assert.equal(blue.sprite.columns, 5);
  assert.equal(blue.sprite.rows, 6);
  assert.deepEqual(blue.sprite.cell, { width: 256, height: 384 });
  assert.deepEqual(blue.sprite.sourceSize, { width: 1280, height: 2304 });
  assert.deepEqual(blue.placement, manifest.placements.kongjwi);
  assert.equal(blue.actionMode, "magic-pour");
});

test("blue scholar current design stays in shop and magic cast produces visible water feedback", () => {
  const shop = text("assets/js/shop-navigation.js");
  const renderer = text("assets/js/scene-renderer.js");
  const state = text("assets/js/scene-state-machine.js");
  assert.match(shop, /game-scene-v2\\/kongjwi\\/blue-scholar\\/preview\\.png/);
  assert.doesNotMatch(shop, /source-locked\\/kongjwi\\/blue-scholar\\/base-cutout\\.png/);
  assert.doesNotMatch(renderer, /if \\(isBlueScholar30f\\) clearLayer\\(layer\\(stack, "scene-water-(?:stream|splash)"\\)\\)/);
  assert.match(state, /BLUE_SCHOLAR_IDLE_FRAMES = \\[0, 1, 0\\]/);
  assert.match(state, /BLUE_SCHOLAR_WRONG_FRAMES = \\[0\\]/);
  assert.match(state, /playSequence\\("waterStream"[\\s\\S]*delay: 660/);
  assert.match(state, /playSequence\\("waterSplash"[\\s\\S]*delay: 760/);
});
''', encoding="utf-8")


def main() -> None:
    source_sha, output_sha, metrics = normalize_current_design()
    patch_runtime(source_sha, output_sha, metrics)
    print(f"blue-scholar normalized: {NORMALIZED_SIZE[0]}x{NORMALIZED_SIZE[1]}, 30 frames, current design preserved")


if __name__ == "__main__":
    main()
