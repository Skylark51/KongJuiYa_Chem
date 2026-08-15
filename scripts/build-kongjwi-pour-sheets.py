#!/usr/bin/env python3
"""Build the layered Kongjwi + bucket motion rig from authored PNG masters.

Flattened character cutouts are treated as indivisible artwork. We never cut a
limb out of an outfit PNG and rotate it independently: doing that with one fixed
mask across multiple costumes can remove collar, shoulder, neck, or hair pixels.
Each Kongjwi frame therefore keeps the entire fitted source image intact and
uses only a small rigid whole-body pose around the feet. Buckets remain a
separate layer and rotate around the shared hand anchor.

The royal-night source was originally decoded from an opaque PNG and then
background-matted. If that matte drops the face/head, the "intact source"
invariant would faithfully preserve a headless character. Detect that defect in
the face core, then repair the broader head alpha from an aligned authored
silhouette while taking every restored RGB pixel from the royal-night source.

The night-court action is the deliberate exception to the rigid-pose source
rule. Its authored summon-sheet is already an eight-frame servant-summoning
sequence, so those exact RGBA frames are uniformly fitted and integer-aligned
to the production 512x768 cells. No pose, face, costume, or effect is redrawn.

Bucket pixels are preserved in a canonical master.png the first time a valid
source is available; if a legacy static bucket PNG is truncated, frame 0 of the
already-valid 4096x768 motion sheet is cropped once and becomes that canonical
master. Future regenerations always start from master.png, so generated sheets
are never recursively scaled.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, UnidentifiedImageError

CELL = (512, 768)
FRAMES = 8
BODY_PIVOT = (CELL[0] // 2, CELL[1] - 58)
NIGHT_SUMMON_SOURCE = Path("assets/art/game-scene-v2/kongjwi/night-court/summon-sheet.png")
NIGHT_SUMMON_GRID = (4, 2)
NIGHT_SUMMON_SOURCE_CELL = (384, 512)
NIGHT_SUMMON_SCALE = 1.30
NIGHT_SUMMON_ALPHA_THRESHOLD = 16
NIGHT_SUMMON_ANCHOR = (CELL[0] // 2, CELL[1] - 12)
NIGHT_SUMMON_PROVENANCE = Path("assets/art/game-scene/kongjwi/night-court/provenance.json")

SOURCES = {
    "underlayer": "kongjwi-underlayer-cutout.png",
    "classic-red": "kongjwi-classic-red-cutout.png",
    "blue-scholar": "kongjwi-blue-scholar-cutout.png",
    "field-work": "kongjwi-field-work-cutout.png",
    "ragged": "kongjwi-ragged-cutout.png",
    "night-court": "kongjwi-night-court-cutout.png",
}
AUTHORED_HQ_SKINS = {"classic-red", "blue-scholar", "field-work"}
AUTHORED_HQ_ROOT = Path("assets/art/game-scene-v2/kongjwi")
TOOL_SOURCES = {
    "wood": "wood.png",
    "brass": "brass.png",
    "celadon": "celadon.png",
    "moon": "moon.png",
}

NIGHT_RAW_SOURCE = "kongjwi-night-court-decoded.png"
NIGHT_HEAD_DONOR = "kongjwi-classic-red-cutout.png"
# Same 256x384 authored coordinate space used by the outfit-rig builder.
NIGHT_HEAD_POLYGON = (
    (92, 12), (164, 12), (174, 31), (174, 84), (169, 113),
    (176, 149), (164, 181), (148, 170), (143, 107), (113, 107),
    (108, 170), (92, 181), (80, 149), (87, 111), (92, 83),
)
# Face-core polygon is intentionally much tighter than the full head. The old
# defective matte still contained collar/hair pixels, so broad head coverage
# could look healthy numerically while the visible face was completely absent.
NIGHT_FACE_POLYGON = (
    (114, 36), (123, 32), (135, 33), (143, 40), (146, 55), (144, 74),
    (137, 87), (128, 92), (118, 88), (111, 76), (109, 56), (111, 43),
)
NIGHT_HEAD_DONOR_SHIFT = (0, -1)
NIGHT_FACE_MIN_DONOR_COVERAGE = 700
NIGHT_FACE_REQUIRED_RATIO = 0.72

# The source character is kept intact in every frame. These are deliberately
# small rigid poses around the feet: they create anticipation / pour / recovery
# without ever separating the head, neck, torso, arms, sleeves, or hair.
BODY_POSES = (
    (0.0, 0, 0),
    (0.0, 0, -1),
    (-0.2, 0, -1),
    (-0.45, 1, -2),
    (-0.75, 2, -3),
    (-1.05, 3, -3),
    (-0.4, 1, -1),
    (0.8, -2, 4),
)

# Shared hand anchor in the normalized 512x768 source frame. The bucket pivots
# here while the character itself remains a single uncut image.
HAND = (333, 386)
TOOL_ANGLES = (0.0, -2.0, -8.0, -18.0, -32.0, -46.0, -20.0, 3.0)


def alpha_bbox(image: Image.Image):
    box = image.getchannel("A").getbbox()
    if not box:
        raise RuntimeError("PNG alpha silhouette is empty")
    return box


def load_rgba(path: Path) -> Image.Image:
    with Image.open(path) as source:
        source.load()
        return source.convert("RGBA")


def alpha_coverage(mask: Image.Image, threshold: int = 16) -> int:
    histogram = mask.histogram()
    return sum(histogram[threshold + 1:])


def polygon_mask(size: tuple[int, int], points) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask


def shifted_alpha(alpha: Image.Image, dx: int, dy: int) -> Image.Image:
    shifted = Image.new("L", alpha.size, 0)
    shifted.paste(alpha, (dx, dy))
    return shifted


def night_head_coverage(root: Path) -> tuple[int, int]:
    """Return current/donor face-core alpha coverage for head completeness validation."""
    source_dir = root / "assets/art/kongjwi"
    current = load_rgba(source_dir / SOURCES["night-court"])
    donor = load_rgba(source_dir / NIGHT_HEAD_DONOR)
    if current.size != donor.size:
        raise RuntimeError(f"Night-court/donor size mismatch: {current.size} vs {donor.size}")

    face_window = polygon_mask(current.size, NIGHT_FACE_POLYGON)
    donor_alpha = shifted_alpha(
        donor.getchannel("A"),
        NIGHT_HEAD_DONOR_SHIFT[0],
        NIGHT_HEAD_DONOR_SHIFT[1],
    )
    donor_face = ImageChops.multiply(donor_alpha, face_window)
    current_face = ImageChops.multiply(current.getchannel("A"), face_window)
    return alpha_coverage(current_face), alpha_coverage(donor_face)


def ensure_night_court_head(root: Path) -> tuple[int, int, bool]:
    """Repair a dropped royal-night face/head matte without repainting source RGB pixels."""
    source_dir = root / "assets/art/kongjwi"
    cutout_path = source_dir / SOURCES["night-court"]
    raw_path = source_dir / NIGHT_RAW_SOURCE
    donor_path = source_dir / NIGHT_HEAD_DONOR

    current = load_rgba(cutout_path)
    raw = load_rgba(raw_path)
    donor = load_rgba(donor_path)
    if raw.size != current.size or donor.size != current.size:
        raise RuntimeError(
            f"Night-court repair source sizes must match: "
            f"cutout={current.size}, raw={raw.size}, donor={donor.size}"
        )

    head_window = polygon_mask(current.size, NIGHT_HEAD_POLYGON)
    face_window = polygon_mask(current.size, NIGHT_FACE_POLYGON)
    donor_alpha = shifted_alpha(
        donor.getchannel("A"),
        NIGHT_HEAD_DONOR_SHIFT[0],
        NIGHT_HEAD_DONOR_SHIFT[1],
    )
    donor_head = ImageChops.multiply(donor_alpha, head_window)
    donor_face = ImageChops.multiply(donor_alpha, face_window)
    current_alpha = current.getchannel("A")
    current_face = ImageChops.multiply(current_alpha, face_window)

    donor_coverage = alpha_coverage(donor_face)
    current_coverage = alpha_coverage(current_face)
    if donor_coverage < NIGHT_FACE_MIN_DONOR_COVERAGE:
        raise RuntimeError(
            f"Night-court face donor is unexpectedly sparse: {donor_coverage} pixels"
        )

    minimum = round(donor_coverage * NIGHT_FACE_REQUIRED_RATIO)
    if current_coverage >= minimum:
        return current_coverage, donor_coverage, False

    # Add only alpha that is missing from the night-court cutout. The colour for
    # every restored pixel comes from the authored royal-night decoded source;
    # the donor contributes silhouette alpha only.
    added_alpha = ImageChops.subtract(donor_head, current_alpha)
    repair_layer = raw.copy()
    repair_layer.putalpha(added_alpha)

    repaired = current.copy()
    repaired.alpha_composite(repair_layer)
    repaired_alpha = ImageChops.lighter(current_alpha, donor_head)
    repaired.putalpha(repaired_alpha)

    repaired_face = ImageChops.multiply(repaired_alpha, face_window)
    repaired_coverage = alpha_coverage(repaired_face)
    if repaired_coverage < minimum:
        raise RuntimeError(
            f"Night-court head repair failed: {repaired_coverage} < {minimum} face pixels"
        )

    repaired.save(cutout_path, format="PNG", optimize=True, compress_level=9)
    print(
        "night-court: restored missing head alpha; face coverage "
        f"{current_coverage}->{repaired_coverage} pixels "
        f"(donor reference {donor_coverage})"
    )
    return repaired_coverage, donor_coverage, True


def fit_source(source: Image.Image) -> Image.Image:
    crop = source.crop(alpha_bbox(source))
    max_w = CELL[0] - 52
    max_h = CELL[1] - 30
    scale = min(max_w / crop.width, max_h / crop.height)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    resized = crop.resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", CELL, (0, 0, 0, 0))
    x = (CELL[0] - size[0]) // 2
    y = CELL[1] - size[1] - 12
    frame.alpha_composite(resized, (x, y))
    return frame


def rotate_point(point, pivot, degrees):
    radians = math.radians(degrees)
    px, py = pivot
    x, y = point
    dx, dy = x - px, y - py
    return (
        px + math.cos(radians) * dx - math.sin(radians) * dy,
        py + math.sin(radians) * dx + math.cos(radians) * dy,
    )


def pose_point(point, angle: float, dx: int, dy: int):
    x, y = rotate_point(point, BODY_PIVOT, angle)
    return (x + dx, y + dy)


def pose_frame(base: Image.Image, angle: float, dx: int, dy: int) -> Image.Image:
    rotated = base.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        expand=False,
        center=BODY_PIVOT,
    )
    frame = Image.new("RGBA", CELL, (0, 0, 0, 0))
    frame.alpha_composite(rotated, (dx, dy))
    return frame


def build_intact_frames(base: Image.Image):
    """Create eight poses without deleting or segmenting any character pixels."""
    frames = []
    hand_points = []
    for body_angle, dx, dy in BODY_POSES:
        frames.append(pose_frame(base, body_angle, dx, dy))
        hand_points.append(pose_point(HAND, body_angle, dx, dy))
    return frames, hand_points


def write_sheet(frames, output: Path):
    sheet = Image.new("RGBA", (CELL[0] * FRAMES, CELL[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * CELL[0], 0))
    if output.exists():
        with Image.open(output) as current:
            current_rgba = current.convert("RGBA")
            if current_rgba.size == sheet.size and current_rgba.tobytes() == sheet.tobytes():
                return False
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="PNG", optimize=True, compress_level=9)
    return True


def threshold_alpha_bbox(image: Image.Image, threshold: int = NIGHT_SUMMON_ALPHA_THRESHOLD):
    alpha = image.getchannel("A")
    return alpha.point(lambda value: 255 if value >= threshold else 0).getbbox()


def build_night_court_summon_frames(root: Path):
    source_path = root / NIGHT_SUMMON_SOURCE
    source = load_rgba(source_path)
    expected_size = (
        NIGHT_SUMMON_SOURCE_CELL[0] * NIGHT_SUMMON_GRID[0],
        NIGHT_SUMMON_SOURCE_CELL[1] * NIGHT_SUMMON_GRID[1],
    )
    if source.size != expected_size:
        raise RuntimeError(f"Unexpected night-court summon sheet size: {source.size}; expected {expected_size}")

    scaled_size = (
        round(NIGHT_SUMMON_SOURCE_CELL[0] * NIGHT_SUMMON_SCALE),
        round(NIGHT_SUMMON_SOURCE_CELL[1] * NIGHT_SUMMON_SCALE),
    )
    frames = []
    alignments = []
    for index in range(FRAMES):
        column = index % NIGHT_SUMMON_GRID[0]
        row = index // NIGHT_SUMMON_GRID[0]
        frame = source.crop((
            column * NIGHT_SUMMON_SOURCE_CELL[0],
            row * NIGHT_SUMMON_SOURCE_CELL[1],
            (column + 1) * NIGHT_SUMMON_SOURCE_CELL[0],
            (row + 1) * NIGHT_SUMMON_SOURCE_CELL[1],
        ))
        scaled = frame.resize(scaled_size, Image.Resampling.LANCZOS)
        bbox = threshold_alpha_bbox(scaled)
        if not bbox:
            raise RuntimeError(f"night-court summon frame {index} has no visible pixels")

        offset_x = round(NIGHT_SUMMON_ANCHOR[0] - (bbox[0] + bbox[2]) / 2)
        offset_y = NIGHT_SUMMON_ANCHOR[1] - bbox[3]
        output = Image.new("RGBA", CELL, (0, 0, 0, 0))
        output.alpha_composite(scaled, (offset_x, offset_y))
        output_bbox = threshold_alpha_bbox(output)
        if not output_bbox:
            raise RuntimeError(f"night-court summon frame {index} became empty")
        if output_bbox[0] == 0 or output_bbox[1] == 0 or output_bbox[2] == CELL[0] or output_bbox[3] == CELL[1]:
            raise RuntimeError(f"night-court summon frame {index} clips the production cell: {output_bbox}")

        center_x = (output_bbox[0] + output_bbox[2]) / 2
        if abs(center_x - NIGHT_SUMMON_ANCHOR[0]) > 0.5 or output_bbox[3] != NIGHT_SUMMON_ANCHOR[1]:
            raise RuntimeError(
                f"night-court summon frame {index} anchor mismatch: "
                f"center={center_x}, bottom={output_bbox[3]}"
            )
        frames.append(output)
        alignments.append({
            "frame": index,
            "sourceGrid": {"column": column, "row": row},
            "integerTranslation": {"x": offset_x, "y": offset_y},
            "alphaBBox": list(output_bbox),
            "anchor": {"x": center_x, "y": output_bbox[3]},
        })
    return frames, alignments


def build_night_court_summon(root: Path, force: bool = False):
    output = root / "assets/art/game-scene/kongjwi/night-court/pour-sheet.png"
    frames, alignments = build_night_court_summon_frames(root)
    if output.exists() and not force:
        with Image.open(output) as current:
            if current.size != (CELL[0] * FRAMES, CELL[1]):
                raise RuntimeError(f"Unexpected night-court sheet size: {current.size}")
    else:
        write_sheet(frames, output)

    source_path = root / NIGHT_SUMMON_SOURCE
    provenance = {
        "source": NIGHT_SUMMON_SOURCE.as_posix(),
        "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
        "generated": output.relative_to(root).as_posix(),
        "generatedSha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "frameMap": list(range(FRAMES)),
        "sourceGrid": {"columns": NIGHT_SUMMON_GRID[0], "rows": NIGHT_SUMMON_GRID[1]},
        "sourceCell": {"width": NIGHT_SUMMON_SOURCE_CELL[0], "height": NIGHT_SUMMON_SOURCE_CELL[1]},
        "outputCell": {"width": CELL[0], "height": CELL[1]},
        "uniformScale": NIGHT_SUMMON_SCALE,
        "resampling": "LANCZOS",
        "anchorRule": "threshold-alpha-bbox-bottom-center",
        "alphaThreshold": NIGHT_SUMMON_ALPHA_THRESHOLD,
        "targetAnchor": {"x": NIGHT_SUMMON_ANCHOR[0], "y": NIGHT_SUMMON_ANCHOR[1]},
        "designPolicy": "preserve-source-rgba-no-redraw",
        "alignments": alignments,
    }
    provenance_path = root / NIGHT_SUMMON_PROVENANCE
    provenance_path.parent.mkdir(parents=True, exist_ok=True)
    provenance_path.write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def build_kongjwi(root: Path, force: bool = False):
    ensure_night_court_head(root)
    shared_hand_points = None
    for skin, filename in SOURCES.items():
        if skin == "night-court":
            continue

        output = root / "assets/art/game-scene/kongjwi" / skin / "pour-sheet.png"
        if skin in AUTHORED_HQ_SKINS:
            canonical = root / AUTHORED_HQ_ROOT / skin / "pour-sheet.png"
            canonical_image = load_rgba(canonical)
            expected_size = (256 * 5, 384 * 6) if skin == "blue-scholar" else (CELL[0] * FRAMES, CELL[1])
            if canonical_image.size != expected_size:
                raise RuntimeError(f"Unexpected authored HQ {skin} sheet size: {canonical_image.size}; expected {expected_size}")
            output.parent.mkdir(parents=True, exist_ok=True)
            if not output.exists() or output.read_bytes() != canonical.read_bytes():
                shutil.copyfile(canonical, output)
                print(f"{skin}: synchronized authored HQ canonical sheet")
            continue

        source = load_rgba(root / "assets/art/kongjwi" / filename)
        base = fit_source(source)
        frames, hand_points = build_intact_frames(base)
        if shared_hand_points is None:
            shared_hand_points = hand_points

        if output.exists() and not force:
            with Image.open(output) as current:
                if current.size != (CELL[0] * FRAMES, CELL[1]):
                    raise RuntimeError(f"Unexpected {skin} sheet size: {current.size}")
            continue
        write_sheet(frames, output)

    build_night_court_summon(root, force=force)
    return shared_hand_points


def prepare_tool_pixels(source: Image.Image) -> Image.Image:
    crop = source.crop(alpha_bbox(source))
    max_w, max_h = 164, 150
    scale = min(1.0, max_w / crop.width, max_h / crop.height)
    if scale >= 1.0:
        return crop.copy()
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    return crop.resize(size, Image.Resampling.LANCZOS)


def load_or_create_tool_master(root: Path, tool_key: str) -> Image.Image:
    generated_dir = root / "assets/art/game-scene/tools" / tool_key
    canonical = generated_dir / "master.png"
    if canonical.exists():
        try:
            return load_rgba(canonical)
        except (OSError, UnidentifiedImageError):
            canonical.unlink(missing_ok=True)

    master_path = root / "assets/art/kongjwi-tools" / TOOL_SOURCES[tool_key]
    try:
        tool = prepare_tool_pixels(load_rgba(master_path))
        source_label = str(master_path.relative_to(root))
    except (OSError, UnidentifiedImageError) as error:
        # Some legacy static bucket PNGs have a valid PNG signature but a
        # truncated image stream. Preserve the already-rendering frame-0 pixels
        # once, instead of failing or recursively resampling whole sheets.
        sheet_path = generated_dir / "pour-sheet.png"
        sheet = load_rgba(sheet_path)
        if sheet.size != (CELL[0] * FRAMES, CELL[1]):
            raise RuntimeError(f"Cannot recover {tool_key} master from {sheet_path}: {sheet.size}") from error
        frame0 = sheet.crop((0, 0, CELL[0], CELL[1]))
        tool = frame0.crop(alpha_bbox(frame0))
        source_label = f"{sheet_path.relative_to(root)} frame 0"
        print(f"{tool_key}: legacy static PNG unreadable; preserving {source_label} as canonical master")

    canonical.parent.mkdir(parents=True, exist_ok=True)
    tool.save(canonical, format="PNG", optimize=True, compress_level=9)
    print(f"{tool_key}: canonical master <- {source_label}")
    return tool


def rotate_tool_about_grip(tool: Image.Image, degrees: float):
    canvas_size = 320
    pivot = (canvas_size // 2, canvas_size // 2)
    grip = (round(tool.width * 0.12), round(tool.height * 0.48))
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(tool, (pivot[0] - grip[0], pivot[1] - grip[1]))
    rotated = canvas.rotate(
        degrees,
        resample=Image.Resampling.BICUBIC,
        expand=False,
        center=pivot,
    )
    return rotated, pivot


def build_tool_sheet(root: Path, tool_key: str, hand_points, force: bool = False):
    output = root / f"assets/art/game-scene/tools/{tool_key}/pour-sheet.png"
    if output.exists() and not force:
        with Image.open(output) as current:
            if current.size != (CELL[0] * FRAMES, CELL[1]):
                raise RuntimeError(f"Unexpected {tool_key} tool sheet size: {current.size}")
        return

    tool = load_or_create_tool_master(root, tool_key)
    frames = []
    for index, hand in enumerate(hand_points):
        rotated, pivot = rotate_tool_about_grip(tool, TOOL_ANGLES[index])
        hx, hy = hand
        layer = Image.new("RGBA", CELL, (0, 0, 0, 0))
        layer.alpha_composite(rotated, (round(hx - pivot[0]), round(hy - pivot[1])))
        frames.append(layer)
    write_sheet(frames, output)


def update_manifest(root: Path):
    path = root / "assets/art/game-scene/manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["version"] = "20260815-blue-scholar-motionfix2"

    policy = manifest.setdefault("runtimePolicy", {})
    policy["kongjwiMotionPolicy"] = "source-locked-intact-standard-outfits-night-court-summon-derived"
    policy["kongjwiFramePolicy"] = "source-character-pixels-whole-body-pose-only"
    policy["nightCourtMotionSource"] = NIGHT_SUMMON_SOURCE.as_posix()
    policy["nightCourtActionMode"] = "summon-servant-pour"
    policy["nightCourtFramePolicy"] = "uniform-scale-integer-anchor-no-redraw"
    policy["anatomySafetyPolicy"] = "complete-source-required-no-headless-cutouts"
    policy["toolMotionPolicy"] = "source-master-grip-pivot-co-registered"
    policy["uniformScalePolicy"] = "shared-2048x1152-contain"
    policy["waterAnimationPolicy"] = "synchronized-pour-fill-leak"
    policy["cosmeticFxPolicy"] = "data-keyed-runtime-effects"
    policy.pop("integratedGripPolicy", None)

    blue = manifest["assets"]["kongjwi"]["blue-scholar"]
    blue["sprite"] = {
        "frames": 30,
        "columns": 5,
        "rows": 6,
        "cell": {"width": 256, "height": 384},
        "sourceSize": {"width": 1280, "height": 2304},
    }
    blue["placement"] = dict(manifest["placements"]["kongjwi"])
    blue["animationProfile"] = "blue-scholar-30f"
    blue["actionMode"] = "magic-pour"

    manifest["sprites"]["tool"]["cell"] = {"width": 512, "height": 768}
    manifest["placements"]["kongjwi"] = {"x": 205, "y": 260, "width": 546, "height": 820}
    manifest["placements"]["tool"] = dict(manifest["placements"]["kongjwi"])
    # The bucket must be in front of the dress/hand region; z=9 placed it fully
    # behind the character and made it look as if the equipped bucket vanished.
    manifest["layers"]["scene-kongjwi"] = 10
    manifest["layers"]["scene-tool"] = 11
    manifest["layers"]["scene-foreground"] = 5
    manifest["anchors"]["toolHandle"] = {"x": 560, "y": 671}
    manifest["anchors"]["waterStart"] = {"x": 663, "y": 538}

    sequences = manifest.setdefault("frames", {}).setdefault("sequences", {})
    correct = sequences.setdefault("answerCorrect", {})
    correct["kongjwiTimeline"] = [2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6]
    correct["nightCourtKongjwiTimeline"] = [2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6]
    correct["toolTimeline"] = [2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6]
    correct["waterStream"] = [1, 2, 3, 4, 5, 6, 7]
    correct["waterSplash"] = [1, 2, 3, 4, 5]
    sequences["leak"] = [0, 1, 2, 3, 4, 5, 6, 7]

    responsive = manifest.setdefault("responsive", {})
    responsive["coordinateSystem"] = "shared-2048x1152"
    responsive.setdefault("mobile", {})["scaleMode"] = "uniform-contain"
    responsive.setdefault("desktop", {})["scaleMode"] = "uniform-contain"

    availability = manifest.setdefault("availability", {})
    availability.pop("assets/art/game-scene/kongjwi/underlayer/wood-grip-sheet.png", None)
    for skin in SOURCES:
        availability[manifest["assets"]["kongjwi"][skin]["sheet"]] = True
    for tool in TOOL_SOURCES:
        availability[manifest["assets"]["tools"][tool]["sheet"]] = True

    night_court = manifest["assets"]["kongjwi"]["night-court"]
    night_court["actionMode"] = "summon-servant-pour"
    night_court["source"] = NIGHT_SUMMON_SOURCE.as_posix()
    night_court["provenance"] = NIGHT_SUMMON_PROVENANCE.as_posix()

    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--force", action="store_true", help="Regenerate all motion sheets from authored/canonical PNG masters")
    args = parser.parse_args()
    root = args.root.resolve()

    hand_points = build_kongjwi(root, force=args.force)
    if hand_points:
        for tool in TOOL_SOURCES:
            build_tool_sheet(root, tool, hand_points, force=args.force)
    update_manifest(root)
    print("Built authored HQ + source-locked standard outfits + anchored night-court summon + four canonical-master bucket sheets")


if __name__ == "__main__":
    main()
