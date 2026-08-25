#!/usr/bin/env python3
"""Build only the runtime court-servant sheets from canonical Korean masters."""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets" / "그림" / "개발자료" / "궁중복-하인"
RUNTIME_ROOT = ROOT / "assets" / "그림" / "게임-장면" / "효과" / "궁중복-하인"
WATER = SOURCE_ROOT / "물방울-원본.png"
DOLSOE = SOURCE_ROOT / "돌쇠-물붓기-원본.png"


def load(path: Path) -> Image.Image:
    with Image.open(path) as image:
        image.load()
        return image.convert("RGBA")


def anchor(image: Image.Image) -> tuple[float, int]:
    alpha = image.getchannel("A")
    significant = alpha.point(lambda value: 255 if value > 16 else 0)
    bbox = significant.getbbox()
    if not bbox:
        raise RuntimeError(f"empty alpha: {image.size}")
    left, top, right, bottom = bbox
    pixels = alpha.load()
    points = [(x, pixels[x, y]) for y in range(max(top, bottom - 10), bottom) for x in range(left, right) if pixels[x, y] > 16]
    weight = sum(value for _, value in points)
    return sum(x * value for x, value in points) / weight, bottom


def aligned(source: Image.Image, canvas: tuple[int, int], initial: tuple[int, int], target: tuple[int, int]) -> Image.Image:
    staged = Image.new("RGBA", canvas, (0, 0, 0, 0))
    staged.alpha_composite(source, initial)
    before = anchor(staged)
    shift = (round(target[0] - before[0]), round(target[1] - before[1]))
    bbox = staged.getchannel("A").point(lambda value: 255 if value > 16 else 0).getbbox()
    moved = (bbox[0] + shift[0], bbox[1] + shift[1], bbox[2] + shift[0], bbox[3] + shift[1])
    if moved[0] < 0 or moved[1] < 0 or moved[2] > canvas[0] or moved[3] > canvas[1]:
        raise RuntimeError(f"alignment clips {bbox} by {shift} in {canvas}")
    result = Image.new("RGBA", canvas, (0, 0, 0, 0))
    result.alpha_composite(staged, shift)
    return result


def save_sheet(frames: list[Image.Image], path: Path) -> None:
    width, height = frames[0].size
    sheet = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * width, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, "PNG", optimize=True, compress_level=9)


def build_water() -> None:
    source = load(WATER)
    if source.size != (1536, 1024):
        raise RuntimeError(f"water master size: {source.size}")
    frames = []
    for index in range(8):
        x, y = (index % 4) * 384, (index // 4) * 512
        frames.append(aligned(source.crop((x, y, x + 384, y + 512)), (512, 512), (64, 0), (256, 480)))
    save_sheet(frames, RUNTIME_ROOT / "물방울-동작.png")


def build_dolsoe() -> None:
    source = load(DOLSOE)
    if source.size != (1024, 1536):
        raise RuntimeError(f"Dolsoe master size: {source.size}")
    # Runtime uses the third authored servant row (the previously audited C sequence).
    row = 2
    frames = []
    for column in range(4):
        crop = source.crop((column * 256, row * 512, (column + 1) * 256, (row + 1) * 512))
        frames.append(aligned(crop, (512, 768), (128, 228), (256, 740)))
    save_sheet(frames, RUNTIME_ROOT / "돌쇠-동작.png")


def main() -> None:
    build_water()
    build_dolsoe()
    print("Built canonical court-servant runtime sheets")


if __name__ == "__main__":
    main()
