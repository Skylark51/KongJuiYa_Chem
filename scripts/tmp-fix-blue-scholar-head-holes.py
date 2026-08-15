#!/usr/bin/env python3
from pathlib import Path
import json
import shutil

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CELL_W, CELL_H, FRAMES = 512, 768, 8
REVISION = "20260815-blue-scholar-headsafe1"
V2 = ROOT / "assets/art/game-scene-v2/kongjwi/blue-scholar/pour-sheet.png"
ACTIVE = ROOT / "assets/art/game-scene/kongjwi/blue-scholar/pour-sheet.png"


def repair_blue_scholar():
    original = Image.open(V2).convert("RGBA")
    if original.size != (4096, 768):
        raise RuntimeError(f"unexpected blue-scholar sheet size: {original.size}")

    original_frames = [
        np.asarray(original.crop((i * CELL_W, 0, (i + 1) * CELL_W, CELL_H)), dtype=np.uint8).copy()
        for i in range(FRAMES)
    ]
    frames = [frame.copy() for frame in original_frames]

    donors = {0: 5, 1: 5, 3: 6}
    matrices = {
        0: np.array([[1.02455380, 0.0132344373, -9.34106399],
                     [-0.0132344373, 1.02455380, 14.8251858]], dtype=np.float32),
        1: np.array([[1.0141254, 0.03065509, -27.06453413],
                     [-0.03065509, 1.0141254, 20.93064064]], dtype=np.float32),
        3: np.array([[1.02328386, -0.10947533, 35.66988694],
                     [0.10947533, 1.02328386, -17.11896706]], dtype=np.float32),
    }

    def warped_donor(target_index):
        donor = original_frames[donors[target_index]]
        return cv2.warpAffine(
            donor,
            matrices[target_index],
            (CELL_W, CELL_H),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0, 0),
        ).astype(np.float32)

    def authoritative_crown(target_index, box, fade_y, preserve_bright_threshold=140):
        target = original_frames[target_index].astype(np.float32)
        donor = warped_donor(target_index)
        x0, y0, x1, y1 = box
        region = np.zeros((CELL_H, CELL_W), dtype=np.float32)
        region[y0:y1, x0:x1] = 1.0
        fy0, fy1 = fade_y
        for y in range(max(y0, fy0), min(y1, fy1)):
            region[y, :] *= (fy1 - y) / (fy1 - fy0)
        brightness = target[:, :, :3].mean(axis=2)
        preserve = ((brightness > preserve_bright_threshold) & (target[:, :, 3] > 100)).astype(np.float32)
        weight = region * (1.0 - preserve)
        output = target * (1.0 - weight[:, :, None]) + donor * weight[:, :, None]
        return np.clip(output, 0, 255).astype(np.uint8)

    frames[0] = authoritative_crown(0, (190, 55, 345, 155), (125, 155))

    target = original_frames[1].astype(np.float32)
    donor = warped_donor(1)
    crown = authoritative_crown(1, (170, 60, 325, 155), (125, 155)).astype(np.float32)
    donor_brightness = donor[:, :, :3].mean(axis=2)
    target_brightness = target[:, :, :3].mean(axis=2)
    region = np.zeros((CELL_H, CELL_W), dtype=np.float32)
    region[100:215, 165:245] = 1.0
    hair = ((donor[:, :, 3] > 20) & (donor_brightness < 125)).astype(np.float32)
    weight = cv2.GaussianBlur(region * hair, (0, 0), 0.35)
    preserve = ((target_brightness > 145) & (target[:, :, 3] > 100)).astype(np.float32)
    weight *= (1.0 - preserve)
    repaired = crown * (1.0 - weight[:, :, None]) + donor * weight[:, :, None]
    frames[1] = np.clip(repaired, 0, 255).astype(np.uint8)

    frames[3] = authoritative_crown(3, (190, 50, 390, 150), (118, 150))

    for index in (2, 4, 5, 6, 7):
        if not np.array_equal(frames[index], original_frames[index]):
            raise RuntimeError(f"untargeted frame changed: {index}")

    checks = {0: (259, 101), 1: (228, 106), 3: (281, 102)}
    for index, (x, y) in checks.items():
        before = int(original_frames[index][y, x, 3])
        after = int(frames[index][y, x, 3])
        if before >= 50 or after < 220:
            raise RuntimeError(f"head-hole repair failed for frame {index}: alpha {before}->{after}")
        print(f"frame {index}: repaired crown alpha ({x},{y}) {before}->{after}")

    # Keep the actual face core (eyes/nose/mouth) untouched. The earlier guard was
    # intentionally too broad and included crown/hair pixels that must change.
    face_core = (235, 155, 295, 205)
    for index in (0, 3):
        x0, y0, x1, y1 = face_core
        if not np.array_equal(frames[index][y0:y1, x0:x1], original_frames[index][y0:y1, x0:x1]):
            raise RuntimeError(f"face core changed in frame {index}")

    sheet = Image.new("RGBA", (CELL_W * FRAMES, CELL_H), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(Image.fromarray(frame, "RGBA"), (index * CELL_W, 0))
    sheet.save(V2, "PNG", optimize=True, compress_level=9)
    shutil.copyfile(V2, ACTIVE)

    audit_dir = ROOT / "diagnostic-blue-scholar-fixed"
    audit_dir.mkdir(exist_ok=True)
    audit = Image.new("RGBA", (1120, 520), (235, 235, 235, 255))
    for index, frame in enumerate(frames):
        crop = Image.fromarray(frame, "RGBA").crop((120, 40, 400, 300))
        x = (index % 4) * 280
        y = (index // 4) * 260
        audit.alpha_composite(crop, (x, y))
        ImageDraw.Draw(audit).text((x + 8, y + 8), f"F{index}", fill=(220, 0, 0, 255))
    audit.save(audit_dir / "heads-fixed.png")


def patch_builder():
    path = ROOT / "scripts/build-kongjwi-pour-sheets.py"
    text = path.read_text(encoding="utf-8")
    if "AUTHORED_HQ_SKINS" in text:
        return

    text = text.replace("import math\nfrom pathlib import Path", "import math\nimport shutil\nfrom pathlib import Path", 1)
    marker = '''SOURCES = {\n    "underlayer": "kongjwi-underlayer-cutout.png",\n    "classic-red": "kongjwi-classic-red-cutout.png",\n    "blue-scholar": "kongjwi-blue-scholar-cutout.png",\n    "field-work": "kongjwi-field-work-cutout.png",\n    "ragged": "kongjwi-ragged-cutout.png",\n    "night-court": "kongjwi-night-court-cutout.png",\n}\n'''
    if text.count(marker) != 1:
        raise RuntimeError("SOURCES marker changed")
    text = text.replace(marker, marker + 'AUTHORED_HQ_SKINS = {"classic-red", "blue-scholar", "field-work"}\nAUTHORED_HQ_ROOT = Path("assets/art/game-scene-v2/kongjwi")\n', 1)

    old = '''def build_kongjwi(root: Path, force: bool = False):\n    ensure_night_court_head(root)\n    shared_hand_points = None\n    for skin, filename in SOURCES.items():\n        if skin == "night-court":\n            continue\n        source = load_rgba(root / "assets/art/kongjwi" / filename)\n        base = fit_source(source)\n        frames, hand_points = build_intact_frames(base)\n        if shared_hand_points is None:\n            shared_hand_points = hand_points\n\n        output = root / "assets/art/game-scene/kongjwi" / skin / "pour-sheet.png"\n        if output.exists() and not force:\n            with Image.open(output) as current:\n                if current.size != (CELL[0] * FRAMES, CELL[1]):\n                    raise RuntimeError(f"Unexpected {skin} sheet size: {current.size}")\n            continue\n        write_sheet(frames, output)\n\n    build_night_court_summon(root, force=force)\n    return shared_hand_points\n'''
    new = '''def build_kongjwi(root: Path, force: bool = False):\n    ensure_night_court_head(root)\n    shared_hand_points = None\n    for skin, filename in SOURCES.items():\n        if skin == "night-court":\n            continue\n\n        output = root / "assets/art/game-scene/kongjwi" / skin / "pour-sheet.png"\n        if skin in AUTHORED_HQ_SKINS:\n            canonical = root / AUTHORED_HQ_ROOT / skin / "pour-sheet.png"\n            canonical_image = load_rgba(canonical)\n            if canonical_image.size != (CELL[0] * FRAMES, CELL[1]):\n                raise RuntimeError(f"Unexpected authored HQ {skin} sheet size: {canonical_image.size}")\n            output.parent.mkdir(parents=True, exist_ok=True)\n            if not output.exists() or output.read_bytes() != canonical.read_bytes():\n                shutil.copyfile(canonical, output)\n                print(f"{skin}: synchronized authored HQ canonical sheet")\n            continue\n\n        source = load_rgba(root / "assets/art/kongjwi" / filename)\n        base = fit_source(source)\n        frames, hand_points = build_intact_frames(base)\n        if shared_hand_points is None:\n            shared_hand_points = hand_points\n\n        if output.exists() and not force:\n            with Image.open(output) as current:\n                if current.size != (CELL[0] * FRAMES, CELL[1]):\n                    raise RuntimeError(f"Unexpected {skin} sheet size: {current.size}")\n            continue\n        write_sheet(frames, output)\n\n    build_night_court_summon(root, force=force)\n    return shared_hand_points\n'''
    if text.count(old) != 1:
        raise RuntimeError("build_kongjwi block changed")
    text = text.replace(old, new, 1)
    text = text.replace('manifest["version"] = "20260812-night-court-summon1"', f'manifest["version"] = "{REVISION}"', 1)
    text = text.replace(
        "Built intact standard outfits + anchored night-court summon + four canonical-master bucket sheets",
        "Built authored HQ + source-locked standard outfits + anchored night-court summon + four canonical-master bucket sheets",
        1,
    )
    path.write_text(text, encoding="utf-8")


def patch_build_workflow():
    path = ROOT / ".github/workflows/build-kongjwi-pour-motion.yml"
    text = path.read_text(encoding="utf-8")
    if "hq_skins =" not in text:
        old = '          skins = ("underlayer", "classic-red", "blue-scholar", "field-work", "ragged")'
        new = '          generated_skins = ("underlayer", "ragged")\n          hq_skins = ("classic-red", "blue-scholar", "field-work")'
        if text.count(old) != 1:
            raise RuntimeError("workflow skins marker changed")
        text = text.replace(old, new, 1)
        text = text.replace('assert manifest["version"] == "20260812-night-court-summon1"', f'assert manifest["version"] == "{REVISION}"', 1)
        if text.count("          for skin in skins:\n") != 1:
            raise RuntimeError("workflow generated skin loop changed")
        text = text.replace("          for skin in skins:\n", "          for skin in generated_skins:\n", 1)

        anchor = '''              assert np.count_nonzero(np.any(np.abs(idle - wrong) > 12, axis=2)) > 300, skin\n\n          night_path = Path("assets/art/game-scene/kongjwi/night-court/pour-sheet.png")\n'''
        insert = '''              assert np.count_nonzero(np.any(np.abs(idle - wrong) > 12, axis=2)) > 300, skin\n\n          for skin in hq_skins:\n              active_path = Path("assets/art/game-scene/kongjwi") / skin / "pour-sheet.png"\n              canonical_path = Path("assets/art/game-scene-v2/kongjwi") / skin / "pour-sheet.png"\n              assert active_path.read_bytes() == canonical_path.read_bytes(), f"{skin}: runtime diverged from authored HQ canonical sheet"\n              image = Image.open(active_path).convert("RGBA")\n              assert image.size == (4096, 768), (skin, image.size)\n\n          blue = Image.open(Path("assets/art/game-scene/kongjwi/blue-scholar/pour-sheet.png")).convert("RGBA")\n          for frame, point in {0: (259, 101), 1: (228, 106), 3: (281, 102)}.items():\n              x, y = point\n              assert blue.getpixel((frame * 512 + x, y))[3] >= 220, f"blue-scholar frame {frame}: crown hole regressed"\n\n          night_path = Path("assets/art/game-scene/kongjwi/night-court/pour-sheet.png")\n'''
        if text.count(anchor) != 1:
            raise RuntimeError("workflow HQ validation insertion anchor changed")
        text = text.replace(anchor, insert, 1)
    path.write_text(text, encoding="utf-8")


def patch_tests():
    path = ROOT / "tests/kongjwi-pour-motion.test.mjs"
    text = path.read_text(encoding="utf-8")
    if REVISION not in text:
        old = '["20260808-anatomy-safe1", "20260808-head-safe1", "20260808-head-safe2", "20260808-layer-safe1", "20260812-night-court-summon1"]'
        new = '["20260808-anatomy-safe1", "20260808-head-safe1", "20260808-head-safe2", "20260808-layer-safe1", "20260812-night-court-summon1", "20260815-blue-scholar-headsafe1"]'
        if text.count(old) != 1:
            raise RuntimeError("test manifest version list changed")
        text = text.replace(old, new, 1)
    if 'builder.includes("AUTHORED_HQ_SKINS")' not in text:
        anchor = '  assert.ok(builder.includes("def build_intact_frames"));\n'
        if text.count(anchor) != 1:
            raise RuntimeError("builder test anchor changed")
        text = text.replace(
            anchor,
            '  assert.ok(builder.includes("AUTHORED_HQ_SKINS"));\n  assert.ok(builder.includes("shutil.copyfile(canonical, output)"));\n' + anchor,
            1,
        )
    path.write_text(text, encoding="utf-8")


def bump_runtime_revision():
    manifest_path = ROOT / "assets/art/game-scene/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["version"] = REVISION
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for filename in ("assets/js/scene-renderer.js", "콩쥐야_줘때써.html"):
        path = ROOT / filename
        text = path.read_text(encoding="utf-8")
        if REVISION not in text:
            if "20260814-kongjwi-outfits1" not in text:
                raise RuntimeError(f"old runtime revision missing in {filename}")
            text = text.replace("20260814-kongjwi-outfits1", REVISION)
        path.write_text(text, encoding="utf-8")


def main():
    repair_blue_scholar()
    patch_builder()
    patch_build_workflow()
    patch_tests()
    bump_runtime_revision()
    print("blue-scholar head-hole repair and regression guards staged")


if __name__ == "__main__":
    main()
