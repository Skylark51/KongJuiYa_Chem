#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
REV = "20260815-blue-scholar-30f1"
OLD = "20260815-blue-scholar-headsafe1"
ACTIVE = ROOT / "assets/art/game-scene/kongjwi/blue-scholar/pour-sheet.png"
CANONICAL = ROOT / "assets/art/game-scene-v2/kongjwi/blue-scholar/pour-sheet.png"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"missing patch marker: {label}")
    return text.replace(old, new, 1)


def validate_source() -> None:
    if ACTIVE.read_bytes() != CANONICAL.read_bytes():
        raise RuntimeError("active/canonical blue-scholar bytes differ")
    with Image.open(ACTIVE) as image:
        image.load()
        if image.size != (1024, 1536):
            raise RuntimeError(f"unexpected blue-scholar size: {image.size}")
        if image.mode != "RGBA":
            raise RuntimeError(f"unexpected blue-scholar mode: {image.mode}")
        alpha_min, alpha_max = image.getchannel("A").getextrema()
        if alpha_min != 0 or alpha_max <= 0:
            raise RuntimeError(f"invalid alpha range: {(alpha_min, alpha_max)}")


def patch_manifest() -> None:
    path = ROOT / "assets/art/game-scene/manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["version"] = REV
    blue = manifest["assets"]["kongjwi"]["blue-scholar"]
    blue["sprite"] = {
        "frames": 30,
        "columns": 5,
        "rows": 6,
        "sourceSize": {"width": 1024, "height": 1536},
    }
    # 1024/5 : 1536/6 = 0.8. Preserve that source-cell aspect instead of
    # squeezing it into the normal 512:768 actor rectangle.
    blue["placement"] = {"x": 150, "y": 260, "width": 657, "height": 820}
    blue["animationProfile"] = "blue-scholar-30f"
    manifest.setdefault("availability", {})[blue["sheet"]] = True
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def patch_renderer() -> None:
    path = ROOT / "assets/js/scene-renderer.js"
    text = path.read_text(encoding="utf-8").replace(OLD, REV)

    text = replace_once(text, '''  const span = document.createElement("span");
  span.className = "scene-sprite";
  span.style.backgroundImage = `url("${asset.url}")`;
  span.style.setProperty("--scene-frame-count", String(spec.frames || 1));
  node.dataset.spriteMode = "sheet";
  node.hidden = false;
  node.append(span);
  frameOf(node, frame);''', '''  const span = document.createElement("span");
  span.className = "scene-sprite";
  span.style.backgroundImage = `url("${asset.url}")`;
  const count = Math.max(1, Number(spec.frames || 1));
  const columns = Math.max(1, Number(spec.columns || count));
  const rows = Math.max(1, Number(spec.rows || 1));
  span.style.setProperty("--scene-frame-count", String(count));
  span.style.setProperty("--scene-frame-columns", String(columns));
  span.style.setProperty("--scene-frame-rows", String(rows));
  if (rows > 1) span.style.backgroundSize = `${columns * 100}% ${rows * 100}%`;
  node.dataset.spriteColumns = String(columns);
  node.dataset.spriteRows = String(rows);
  node.dataset.spriteMode = "sheet";
  node.hidden = false;
  node.append(span);
  frameOf(node, frame);''', "sprite grid metadata")

    text = replace_once(text, '''  const count = Math.max(1, Number(spriteNode.style.getPropertyValue("--scene-frame-count")) || 1);
  const next = Math.max(0, Math.min(count - 1, Number(frame) || 0));
  spriteNode.style.backgroundPosition = `${count <= 1 ? 0 : next / (count - 1) * 100}% center`;
  node.dataset.frame = String(next);''', '''  const count = Math.max(1, Number(spriteNode.style.getPropertyValue("--scene-frame-count")) || 1);
  const columns = Math.max(1, Number(spriteNode.style.getPropertyValue("--scene-frame-columns")) || count);
  const rows = Math.max(1, Number(spriteNode.style.getPropertyValue("--scene-frame-rows")) || 1);
  const next = Math.max(0, Math.min(count - 1, Number(frame) || 0));
  if (rows > 1) {
    const column = next % columns;
    const row = Math.floor(next / columns);
    const x = columns <= 1 ? 0 : column / (columns - 1) * 100;
    const y = rows <= 1 ? 0 : row / (rows - 1) * 100;
    spriteNode.style.backgroundPosition = `${x}% ${y}%`;
  } else {
    spriteNode.style.backgroundPosition = `${count <= 1 ? 0 : next / (count - 1) * 100}% center`;
  }
  node.dataset.frame = String(next);''', "grid frame positioning")

    text = replace_once(text, '''    setCosmetics(next = {}) {
      current = { ...current, ...next };
      if (manifest) load();
    },''', '''    setCosmetics(next = {}) {
      current = { ...current, ...next };
      if (manifest) load();
    },
    getKongjwiOutfit() {
      return key(current.kongjwiOutfit || current.outfit || root.dataset.kongjwiOutfit, ALIAS.outfit, "underlayer");
    },''', "renderer outfit accessor")

    text = replace_once(text, '''    sprite(layer(stack, "scene-kongjwi"), chosen.kongjwi, s.kongjwi);
    sprite(layer(stack, "scene-tool"), chosen.tool, s.tool);''', '''    const kongjwiSpriteSpec = outfitAsset.sprite || s.kongjwi;
    const isBlueScholar30f = outfit === "blue-scholar" && Number(kongjwiSpriteSpec.frames) === 30;
    sprite(layer(stack, "scene-kongjwi"), chosen.kongjwi, kongjwiSpriteSpec);
    if (isBlueScholar30f) clearLayer(layer(stack, "scene-tool"));
    else sprite(layer(stack, "scene-tool"), chosen.tool, s.tool);''', "per-outfit sprite spec")

    text = replace_once(text, '''    if (motionRig && chosen.stream.url) sprite(layer(stack, "scene-water-stream"), chosen.stream, s.waterStream);
    else fallbackWaterArc(layer(stack, "scene-water-stream"));''', '''    if (isBlueScholar30f) clearLayer(layer(stack, "scene-water-stream"));
    else if (motionRig && chosen.stream.url) sprite(layer(stack, "scene-water-stream"), chosen.stream, s.waterStream);
    else fallbackWaterArc(layer(stack, "scene-water-stream"));''', "blue scholar stream suppression")

    text = replace_once(text, '''    if (motionRig && chosen.splash.url) sprite(layer(stack, "scene-water-splash"), chosen.splash, s.waterSplash);
    else clearLayer(layer(stack, "scene-water-splash"));''', '''    if (isBlueScholar30f) clearLayer(layer(stack, "scene-water-splash"));
    else if (motionRig && chosen.splash.url) sprite(layer(stack, "scene-water-splash"), chosen.splash, s.waterSplash);
    else clearLayer(layer(stack, "scene-water-splash"));''', "blue scholar splash suppression")

    text = replace_once(text, '''    box(layer(stack, "scene-kongjwi"), motionRig ? placements.kongjwi : fallback.kongjwi, logical);
    box(layer(stack, "scene-tool"), motionRig ? placements.tool : fallback.tool, logical);''', '''    const kongjwiPlacement = outfitAsset.placement || (motionRig ? placements.kongjwi : fallback.kongjwi);
    box(layer(stack, "scene-kongjwi"), kongjwiPlacement, logical);
    box(layer(stack, "scene-tool"), motionRig ? placements.tool : fallback.tool, logical);''', "per-outfit placement")

    path.write_text(text, encoding="utf-8")


def patch_state_machine() -> None:
    path = ROOT / "assets/js/scene-state-machine.js"
    text = path.read_text(encoding="utf-8")
    marker = 'const POUR_CHARACTER_FRAMES = [2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6];\n'
    if 'BLUE_SCHOLAR_FRAMES' not in text:
        text = replace_once(text, marker, marker + '''const BLUE_SCHOLAR_FRAMES = Array.from({ length: 30 }, (_, index) => index);\nconst BLUE_SCHOLAR_IDLE_FRAMES = [0, 1, 2, 3, 2, 1, 0];\nconst BLUE_SCHOLAR_WRONG_FRAMES = [25, 26, 27, 28, 29];\n''', "blue scholar frame constants")

    helper_marker = '''  startLeakLoop({ energetic = false } = {}) {
    const sequence = this.manifest.frames?.sequences?.leak || LEAK_FRAMES;
    this.playSequence("waterLeak", sequence, energetic ? 760 : 1120, { loop: true, hold: true });
  }
'''
    text = replace_once(text, helper_marker, helper_marker + '''\n  isBlueScholar30f() {\n    return this.renderer.getKongjwiOutfit?.() === "blue-scholar";\n  }\n''', "blue scholar profile helper")

    text = replace_once(text, '''    resetCourtServantPour();
    this.playSequence("kongjwi", plan.kongjwiTimeline || POUR_CHARACTER_FRAMES, 1320, { hold });
    this.playSequence("tool", plan.toolTimeline || POUR_CHARACTER_FRAMES, 1320, { hold });
    this.playSequence("waterStream", plan.waterStream || POUR_STREAM_FRAMES, 650, { delay: 410, hold });
    this.playSequence("waterSplash", plan.waterSplash || POUR_SPLASH_FRAMES, 520, { delay: 540, hold });
    this.startLeakLoop({ energetic: true });''', '''    resetCourtServantPour();
    if (this.isBlueScholar30f()) {
      this.playSequence("kongjwi", BLUE_SCHOLAR_FRAMES, 1320, { hold });
      this.startLeakLoop({ energetic: true });
      return;
    }
    this.playSequence("kongjwi", plan.kongjwiTimeline || POUR_CHARACTER_FRAMES, 1320, { hold });
    this.playSequence("tool", plan.toolTimeline || POUR_CHARACTER_FRAMES, 1320, { hold });
    this.playSequence("waterStream", plan.waterStream || POUR_STREAM_FRAMES, 650, { delay: 410, hold });
    this.playSequence("waterSplash", plan.waterSplash || POUR_SPLASH_FRAMES, 520, { delay: 540, hold });
    this.startLeakLoop({ energetic: true });''', "30f correct sequence")

    text = replace_once(text, '''        this.playSequence("kongjwi", sequences.idle?.kongjwi || [0, 1, 0], 1800, { loop: true });''', '''        this.playSequence("kongjwi", this.isBlueScholar30f() ? BLUE_SCHOLAR_IDLE_FRAMES : (sequences.idle?.kongjwi || [0, 1, 0]), 1800, { loop: true });''', "30f idle")
    text = replace_once(text, '''        this.playSequence("kongjwi", [0, 1, 0], 620);''', '''        this.playSequence("kongjwi", this.isBlueScholar30f() ? BLUE_SCHOLAR_IDLE_FRAMES : [0, 1, 0], 620);''', "30f question idle")
    text = replace_once(text, '''        this.playSequence("kongjwi", sequences.answerWrong?.kongjwi || [7], 560, { hold: true });''', '''        this.playSequence("kongjwi", this.isBlueScholar30f() ? BLUE_SCHOLAR_WRONG_FRAMES : (sequences.answerWrong?.kongjwi || [7]), 560, { hold: true });''', "30f wrong")
    text = text.replace('this.playSequence("kongjwi", [7], 700, { hold: true });', 'this.playSequence("kongjwi", this.isBlueScholar30f() ? BLUE_SCHOLAR_WRONG_FRAMES : [7], 700, { hold: true });')
    path.write_text(text, encoding="utf-8")


def patch_builder() -> None:
    path = ROOT / "scripts/build-kongjwi-pour-sheets.py"
    text = path.read_text(encoding="utf-8")
    text = text.replace('manifest["version"] = "20260815-blue-scholar-headsafe1"', f'manifest["version"] = "{REV}"')
    text = replace_once(text, '''            canonical_image = load_rgba(canonical)
            if canonical_image.size != (CELL[0] * FRAMES, CELL[1]):
                raise RuntimeError(f"Unexpected authored HQ {skin} sheet size: {canonical_image.size}")''', '''            canonical_image = load_rgba(canonical)
            expected_size = (1024, 1536) if skin == "blue-scholar" else (CELL[0] * FRAMES, CELL[1])
            if canonical_image.size != expected_size:
                raise RuntimeError(f"Unexpected authored HQ {skin} sheet size: {canonical_image.size}; expected {expected_size}")''', "builder blue scholar HQ size")
    marker = '    policy.pop("integratedGripPolicy", None)\n'
    if 'blue["animationProfile"] = "blue-scholar-30f"' not in text:
        text = replace_once(text, marker, marker + '''\n    blue = manifest["assets"]["kongjwi"]["blue-scholar"]\n    blue["sprite"] = {\n        "frames": 30,\n        "columns": 5,\n        "rows": 6,\n        "sourceSize": {"width": 1024, "height": 1536},\n    }\n    blue["placement"] = {"x": 150, "y": 260, "width": 657, "height": 820}\n    blue["animationProfile"] = "blue-scholar-30f"\n''', "builder manifest blue scholar profile")
    path.write_text(text, encoding="utf-8")


def patch_tests() -> None:
    path = ROOT / "tests/kongjwi-pour-motion.test.mjs"
    text = path.read_text(encoding="utf-8")
    text = text.replace('"20260815-blue-scholar-headsafe1"].includes(manifest.version)', '"20260815-blue-scholar-headsafe1", "20260815-blue-scholar-30f1"].includes(manifest.version)')
    text = replace_once(text, '''    assert.deepEqual(pngSize(path.join(root, sheet)), [4096, 768]);
  }
});

test("night-court production motion is the authored summon sequence"''', '''    const expected = skin === "blue-scholar" ? [1024, 1536] : [4096, 768];
    assert.deepEqual(pngSize(path.join(root, sheet)), expected);
  }
  assert.equal(manifest.assets.kongjwi["blue-scholar"].sprite.frames, 30);
  assert.equal(manifest.assets.kongjwi["blue-scholar"].sprite.columns, 5);
  assert.equal(manifest.assets.kongjwi["blue-scholar"].sprite.rows, 6);
});

test("night-court production motion is the authored summon sequence"''', "blue scholar PNG test")
    path.write_text(text, encoding="utf-8")

    path = ROOT / "tests/kongjwi-underlayer-grip.test.mjs"
    text = path.read_text(encoding="utf-8")
    text = text.replace('"20260815-blue-scholar-headsafe1"].includes(manifest.version)', '"20260815-blue-scholar-headsafe1", "20260815-blue-scholar-30f1"].includes(manifest.version)')
    path.write_text(text, encoding="utf-8")


def patch_html() -> None:
    path = ROOT / "콩쥐야_줘때써.html"
    path.write_text(path.read_text(encoding="utf-8").replace(OLD, REV), encoding="utf-8")


def final_validate() -> None:
    validate_source()
    manifest = json.loads((ROOT / "assets/art/game-scene/manifest.json").read_text(encoding="utf-8"))
    blue = manifest["assets"]["kongjwi"]["blue-scholar"]
    if manifest["version"] != REV:
        raise RuntimeError("manifest revision did not update")
    if blue.get("sprite", {}).get("frames") != 30 or blue["sprite"].get("columns") != 5 or blue["sprite"].get("rows") != 6:
        raise RuntimeError("blue scholar sprite grid metadata invalid")
    renderer = (ROOT / "assets/js/scene-renderer.js").read_text(encoding="utf-8")
    state = (ROOT / "assets/js/scene-state-machine.js").read_text(encoding="utf-8")
    if "--scene-frame-columns" not in renderer or "outfitAsset.sprite || s.kongjwi" not in renderer:
        raise RuntimeError("renderer 2D sprite-grid support missing")
    if "BLUE_SCHOLAR_FRAMES" not in state or "length: 30" not in state:
        raise RuntimeError("30-frame state timeline missing")


if __name__ == "__main__":
    validate_source()
    patch_manifest()
    patch_renderer()
    patch_state_machine()
    patch_builder()
    patch_tests()
    patch_html()
    final_validate()
    print("blue-scholar 30f migration patched successfully")
