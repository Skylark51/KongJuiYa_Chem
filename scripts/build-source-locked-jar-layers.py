#!/usr/bin/env python3
"""Build gameplay jar layers directly from the four authored shop/source PNG pairs.

The outer open-lid jar frame is never redrawn. The only body edit is inside the
broken-hole/toad cavity, where pixels are borrowed from the paired no-toad PNG.
A foreground ring is extracted from that same no-toad source so the animated
toad sits behind the real broken ceramic edge.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

VERSION = "20260807-source-locked-jars1"
REFERENCE_SIZE = (1536, 1024)
SKINS = ("onggi", "celadon", "moon-white", "night-lacquer")
GAME_SCENE_ROOT = Path("assets/그림/게임-장면")
JAR_DIRS = {
    "onggi": "전통-옹기",
    "celadon": "청자",
    "moon-white": "달항아리",
    "night-lacquer": "흑칠-야광",
}
JAR_LAYER_NAME = "장독대-레이어.png"
JAR_OPEN_NAME = "열림-두꺼비-없음.png"
JAR_HOLE_NAME = "구멍-전경.png"

# cx, cy, cavity-rx, cavity-ry in the 1536x1024 source coordinate system.
CAVITY = {
    "celadon": (930, 690, 235, 190),
    "moon-white": (945, 675, 230, 195),
    "night-lacquer": (940, 690, 220, 190),
    "onggi": (940, 690, 225, 190),
}

# cx, cy, outer-rx, outer-ry, inner-rx, inner-ry. This is the real ceramic
# foreground crescent that is placed above the animated toad.
FRONT_RING = {
    "celadon": (930, 690, 195, 165, 145, 118),
    "moon-white": (945, 675, 205, 165, 155, 120),
    "night-lacquer": (940, 690, 190, 160, 145, 115),
    "onggi": (940, 690, 195, 165, 145, 120),
}

# Per-skin toad boxes in shared 2048x1152 logical scene coordinates. They
# follow the source-locked hole centers rather than the old synthetic jar art.
TOAD_BOX = {
    "onggi": {"x": 1484, "y": 657, "width": 360, "height": 280},
    "celadon": {"x": 1463, "y": 636, "width": 370, "height": 290},
    "moon-white": {"x": 1476, "y": 629, "width": 356, "height": 278},
    "night-lacquer": {"x": 1470, "y": 658, "width": 370, "height": 290},
}


def smoothstep(value: np.ndarray) -> np.ndarray:
    value = np.clip(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def scale_spec(spec: tuple[float, ...], size: tuple[int, int]) -> tuple[float, ...]:
    sx = size[0] / REFERENCE_SIZE[0]
    sy = size[1] / REFERENCE_SIZE[1]
    result = []
    for index, value in enumerate(spec):
        result.append(value * (sx if index % 2 == 0 else sy))
    return tuple(result)


def body_bbox(array: np.ndarray, y0_ratio: float = 300 / 1024, alpha_threshold: int = 10):
    alpha = array[..., 3] > alpha_threshold
    y0 = int(round(array.shape[0] * y0_ratio))
    y_grid = np.arange(array.shape[0])[:, None]
    yy, xx = np.where(alpha & (y_grid >= y0))
    if not len(xx):
        raise RuntimeError("장독대 알파 영역을 찾지 못했습니다.")
    return int(xx.min()), int(yy.min()), int(xx.max() + 1), int(yy.max() + 1)


def align_closed_to_open(open_array: np.ndarray, closed_image: Image.Image):
    closed_array = np.asarray(closed_image, dtype=np.uint8)
    open_box = body_bbox(open_array)
    closed_box = body_bbox(closed_array)
    open_width = open_box[2] - open_box[0]
    closed_width = closed_box[2] - closed_box[0]
    open_height = open_box[3] - open_box[1]
    closed_height = closed_box[3] - closed_box[1]
    scale = ((open_width / closed_width) + (open_height / closed_height)) / 2.0
    open_center = (open_box[0] + open_box[2]) / 2.0
    closed_center = (closed_box[0] + closed_box[2]) / 2.0
    tx = open_center - scale * closed_center
    ty = open_box[3] - scale * closed_box[3]

    resized = closed_image.resize(
        (max(1, round(closed_image.width * scale)), max(1, round(closed_image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (open_array.shape[1], open_array.shape[0]), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (round(tx), round(ty)))
    return np.asarray(canvas, dtype=np.uint8), {
        "scale": scale,
        "translate": [tx, ty],
        "openBodyBox": list(open_box),
        "closedBodyBox": list(closed_box),
        "openCanvas": [open_array.shape[1], open_array.shape[0]],
        "closedCanvas": [closed_image.width, closed_image.height],
    }


def patch_toad_cavity(open_array: np.ndarray, registered_closed: np.ndarray, spec):
    cx, cy, rx, ry = spec
    yy, xx = np.ogrid[: open_array.shape[0], : open_array.shape[1]]
    distance = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    blend = smoothstep((1.0 - distance) / (1.0 - 0.72))[..., None]
    blend *= np.clip(registered_closed[..., 3:4] / 255.0, 0.0, 1.0)
    result = open_array.astype(np.float32) * (1.0 - blend) + registered_closed.astype(np.float32) * blend
    return np.clip(result, 0, 255).astype(np.uint8)


def foreground_ring(registered_closed: np.ndarray, spec):
    cx, cy, outer_rx, outer_ry, inner_rx, inner_ry = spec
    yy, xx = np.ogrid[: registered_closed.shape[0], : registered_closed.shape[1]]
    outer = ((xx - cx) / outer_rx) ** 2 + ((yy - cy) / outer_ry) ** 2
    inner = ((xx - cx) / inner_rx) ** 2 + ((yy - cy) / inner_ry) ** 2
    # Analytical one-pixel-ish feather at both ring edges.
    outer_alpha = np.clip((1.02 - outer) / 0.04, 0.0, 1.0)
    inner_alpha = np.clip((inner - 0.98) / 0.04, 0.0, 1.0)
    mask = smoothstep(outer_alpha) * smoothstep(inner_alpha)
    mask = np.minimum(mask, registered_closed[..., 3] / 255.0)
    result = registered_closed.copy()
    result[..., 3] = np.clip(mask * 255.0, 0, 255).astype(np.uint8)
    return result


def source_bbox(open_array: np.ndarray, padding: int = 18):
    yy, xx = np.where(open_array[..., 3] > 8)
    if not len(xx):
        raise RuntimeError("열린 장독대 원본에 알파 영역이 없습니다.")
    return (
        max(0, int(xx.min()) - padding),
        max(0, int(yy.min()) - padding),
        min(open_array.shape[1], int(xx.max() + 1) + padding),
        min(open_array.shape[0], int(yy.max() + 1) + padding),
    )


def fit_to_cell(array: np.ndarray, bbox, cell: int = 1024, margin: int = 34):
    x0, y0, x1, y1 = bbox
    crop = Image.fromarray(array[y0:y1, x0:x1], "RGBA")
    max_dimension = cell - 2 * margin
    scale = min(max_dimension / crop.width, max_dimension / crop.height)
    width = max(1, round(crop.width * scale))
    height = max(1, round(crop.height * scale))
    resized = crop.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    offset = ((cell - width) // 2, (cell - height) // 2)
    canvas.alpha_composite(resized, offset)
    return canvas, {
        "crop": list(bbox),
        "scale": scale,
        "offset": list(offset),
        "size": [width, height],
    }


def build_skin(root: Path, skin: str):
    source_dir = root / "assets" / "art" / "jars" / skin
    output_dir = root / GAME_SCENE_ROOT / JAR_DIRS[skin]
    output_dir.mkdir(parents=True, exist_ok=True)

    open_image = Image.open(source_dir / "lid-open.png").convert("RGBA")
    closed_image = Image.open(source_dir / "thumbnail-no-toad.png").convert("RGBA")

    open_array = np.asarray(open_image, dtype=np.uint8)
    registered_closed, registration = align_closed_to_open(open_array, closed_image)
    cavity_spec = scale_spec(CAVITY[skin], open_image.size)
    ring_spec = scale_spec(FRONT_RING[skin], open_image.size)

    clean_open = patch_toad_cavity(open_array, registered_closed, cavity_spec)
    front = foreground_ring(registered_closed, ring_spec)
    bbox = source_bbox(open_array)
    back_cell, fit = fit_to_cell(clean_open, bbox)
    front_cell, _ = fit_to_cell(front, bbox)

    sheet = Image.new("RGBA", (2048, 1024), (0, 0, 0, 0))
    sheet.alpha_composite(back_cell, (0, 0))
    sheet.alpha_composite(front_cell, (1024, 0))

    back_cell.save(output_dir / JAR_OPEN_NAME, optimize=True, compress_level=9)
    front_cell.save(output_dir / JAR_HOLE_NAME, optimize=True, compress_level=9)
    sheet.save(output_dir / JAR_LAYER_NAME, optimize=True, compress_level=9)

    parts = {
        "version": 1,
        "frameLock": True,
        "sourceOpen": f"assets/art/jars/{skin}/lid-open.png",
        "sourceClosed": f"assets/art/jars/{skin}/thumbnail-no-toad.png",
        "openNoToad": JAR_OPEN_NAME,
        "holeFront": JAR_HOLE_NAME,
        "runtimeSheet": JAR_LAYER_NAME,
        "runtimeFrames": {"back": 0, "front": 1},
        "registration": registration,
        "fit": fit,
        "cavitySpec": list(cavity_spec),
        "frontRingSpec": list(ring_spec),
        "runtimePolicy": (
            "source-locked open jar: outer frame/lid/pattern are kept from lid-open.png; "
            "only the toad cavity is replaced from the paired no-toad source; frame 1 is the no-toad broken-hole foreground rim"
        ),
    }
    (output_dir / "parts.json").write_text(json.dumps(parts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_manifest(root: Path):
    manifest_path = root / GAME_SCENE_ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["version"] = "2026.08.07-source-locked-jars1"
    manifest.setdefault("runtimePolicy", {})["jarFramePolicy"] = "source-locked-paired-png"
    manifest.setdefault("anchors", {})["jarHoleCenter"] = {"x": 1655, "y": 788}
    manifest["anchors"]["toadFace"] = {"x": 1655, "y": 748}
    manifest.setdefault("placements", {})["toad"] = {"x": 1470, "y": 645, "width": 360, "height": 280}
    manifest.setdefault("fallbackPlacements", {})["toad"] = {"x": 1470, "y": 645, "width": 360, "height": 280}

    availability = manifest.setdefault("availability", {})
    jars = manifest.setdefault("assets", {}).setdefault("jars", {})
    compositions = manifest.setdefault("jarCompositions", {})
    for skin in SKINS:
        raw_layers = f"{GAME_SCENE_ROOT.as_posix()}/{JAR_DIRS[skin]}/{JAR_LAYER_NAME}"
        versioned_layers = f"{raw_layers}?v={VERSION}"
        jar = jars.setdefault(skin, {})
        jar.update({
            "layers": versioned_layers,
            "fallback": f"assets/art/jars/{skin}/lid-open.png",
            "sourceOpen": f"assets/art/jars/{skin}/lid-open.png",
            "sourceClosed": f"assets/art/jars/{skin}/thumbnail-no-toad.png",
            "openNoToad": f"{GAME_SCENE_ROOT.as_posix()}/{JAR_DIRS[skin]}/{JAR_OPEN_NAME}",
            "holeFront": f"{GAME_SCENE_ROOT.as_posix()}/{JAR_DIRS[skin]}/{JAR_HOLE_NAME}",
            "parts": f"{GAME_SCENE_ROOT.as_posix()}/{JAR_DIRS[skin]}/parts.json",
        })
        availability[raw_layers] = True
        availability[versioned_layers] = True
        if skin in compositions:
            compositions[skin]["toad"] = TOAD_BOX[skin]

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    for skin in SKINS:
        build_skin(root, skin)
    update_manifest(root)
    print("Built source-locked gameplay jar layers for:", ", ".join(SKINS))


if __name__ == "__main__":
    main()
