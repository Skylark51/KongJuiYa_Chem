#!/usr/bin/env python3
"""Validate production toad cosmetic canvas, alpha anchors, and mirrored copies."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SKINS = ("gold-worker", "jade-guard", "star-night")
SOURCE = ROOT / "assets/art/source-locked/toad/skins"
COPIES = (
    ROOT / "assets/그림/게임-장면/두꺼비/스킨",
    ROOT / "assets/art/game-scene-v2/toad/skins",
)
EXPECTED_SIZE = (1024, 768)
toad_files = {
    "gold-worker": "황금-일꾼.png",
    "jade-guard": "비취-수호.png",
    "star-night": "별밤.png",
}
EXPECTED_CENTER_X = 511.5
EXPECTED_BOTTOM = 742


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect(path: Path) -> tuple[tuple[int, int, int, int], float, int]:
    with Image.open(path) as source:
        source.load()
        if source.format != "PNG" or source.mode != "RGBA":
            raise AssertionError(f"{path}: expected RGBA PNG, got {source.format} {source.mode}")
        if source.size != EXPECTED_SIZE:
            raise AssertionError(f"{path}: expected {EXPECTED_SIZE}, got {source.size}")
        alpha = source.getchannel("A")
        if any(alpha.getpixel(point) for point in ((0, 0), (1023, 0), (0, 767), (1023, 767))):
            raise AssertionError(f"{path}: canvas corners must be transparent")
        bbox = alpha.getbbox()
    if bbox is None:
        raise AssertionError(f"{path}: empty alpha channel")
    left, top, right, bottom = bbox
    center_x = (left + right - 1) / 2
    bottom_anchor = bottom - 1
    if abs(center_x - EXPECTED_CENTER_X) > 1:
        raise AssertionError(f"{path}: center x {center_x} is outside tolerance")
    if bottom_anchor != EXPECTED_BOTTOM:
        raise AssertionError(f"{path}: bottom {bottom_anchor} != {EXPECTED_BOTTOM}")
    if not 800 <= right - left <= 940 or not 500 <= bottom - top <= 710:
        raise AssertionError(f"{path}: anomalous bbox {bbox}")
    return bbox, center_x, bottom_anchor


def main() -> None:
    for name in SKINS:
        source = SOURCE / f"{name}.png"
        bbox, center_x, bottom = inspect(source)
        source_hash = digest(source)
        for directory in COPIES:
            destination_name = toad_files[skin] if directory == COPIES[0] else source.name
            copy = directory / destination_name
            inspect(copy)
            if digest(copy) != source_hash:
                raise AssertionError(f"{copy}: does not match source-locked master")
        print(f"PASS {name}: canvas=1024x768 bbox={bbox} center_x={center_x:.1f} bottom={bottom}")


if __name__ == "__main__":
    main()
