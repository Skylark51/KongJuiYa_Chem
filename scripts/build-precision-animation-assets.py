#!/usr/bin/env python3
"""Create precision-v1 frames using crop, transparent padding and integer shifts."""
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/art/game-scene-precision-v1"
WATER = OUT / "masters/water-droplets-rgba.png"
DOLSOE = ROOT / "assets/art/game-scene-v2/servants/dolsoe-water-sheet.png"


def load(path):
    with Image.open(path) as image:
        image.load()
        return image.convert("RGBA")


def anchor(image):
    alpha = image.getchannel("A")
    significant = alpha.point(lambda value: 255 if value > 16 else 0)
    bbox = significant.getbbox()
    if not bbox:
        raise RuntimeError("empty alpha")
    left, top, right, bottom = bbox
    pixels = alpha.load()
    points = [
        (x, pixels[x, y])
        for y in range(max(top, bottom - 10), bottom)
        for x in range(left, right)
        if pixels[x, y] > 16
    ]
    x = sum(px * weight for px, weight in points) / sum(
        weight for _, weight in points
    )
    return x, bottom


def aligned(source, canvas, initial, target):
    staged = Image.new("RGBA", canvas, (0, 0, 0, 0))
    staged.alpha_composite(source, initial)
    before = anchor(staged)
    shift = (round(target[0] - before[0]), round(target[1] - before[1]))
    bbox = staged.getchannel("A").point(
        lambda value: 255 if value > 16 else 0
    ).getbbox()
    moved = (
        bbox[0] + shift[0],
        bbox[1] + shift[1],
        bbox[2] + shift[0],
        bbox[3] + shift[1],
    )
    if moved[0] < 0 or moved[1] < 0 or moved[2] > canvas[0] or moved[3] > canvas[1]:
        raise RuntimeError(f"alignment clips {bbox} by {shift} in {canvas}")
    result = Image.new("RGBA", canvas, (0, 0, 0, 0))
    result.alpha_composite(staged, shift)
    return result, {
        "integerCorrection": list(shift),
        "anchorBefore": [round(before[0], 3), before[1]],
        "anchorAfter": [round(anchor(result)[0], 3), anchor(result)[1]],
        "targetAnchor": list(target),
        "resampled": False,
    }


def save(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    image.save(temporary, "PNG", optimize=True, compress_level=9)
    temporary.replace(path)


def sheet(frames, path):
    width, height = frames[0].size
    result = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        result.alpha_composite(frame, (index * width, 0))
    save(result, path)


def water_sequence():
    source = load(WATER)
    if source.size != (1536, 1024):
        raise RuntimeError(f"water master size {source.size}")
    frames, records = [], []
    directory = OUT / "sequences/effects/water-droplets"
    for index in range(8):
        x, y = (index % 4) * 384, (index // 4) * 512
        frame, record = aligned(
            source.crop((x, y, x + 384, y + 512)),
            (512, 512),
            (64, 0),
            (256, 480),
        )
        save(frame, directory / "frames" / f"water-droplets-f{index + 1:03d}.png")
        frames.append(frame)
        record["frame"] = index + 1
        records.append(record)
    sheet(frames, directory / "water-droplets-sheet.png")
    return {"id": "water-droplets", "frames": records}


def dolsoe_sequences():
    source = load(DOLSOE)
    if source.size != (1024, 1536):
        raise RuntimeError(f"Dolsoe master size {source.size}")
    output = []
    for row, name in enumerate(("dolsoe-a", "dolsoe-b", "dolsoe-c")):
        frames, records = [], []
        directory = OUT / "sequences/servants" / name
        for column in range(4):
            frame, record = aligned(
                source.crop(
                    (
                        column * 256,
                        row * 512,
                        (column + 1) * 256,
                        (row + 1) * 512,
                    )
                ),
                (512, 768),
                (128, 228),
                (256, 740),
            )
            save(frame, directory / "frames" / f"{name}-f{column + 1:03d}.png")
            frames.append(frame)
            record["frame"] = column + 1
            records.append(record)
        sheet(frames, directory / f"{name}-sheet.png")
        output.append({"id": name, "sourceRow": row, "frames": records})
    return output


def main():
    records = {
        "version": "20260812-precision-v1",
        "policy": {"translation": "integer-only", "resampling": False},
        "sourceSha256": {
            WATER.relative_to(ROOT).as_posix(): hashlib.sha256(WATER.read_bytes()).hexdigest(),
            DOLSOE.relative_to(ROOT).as_posix(): hashlib.sha256(DOLSOE.read_bytes()).hexdigest(),
        },
        "sequences": [water_sequence(), *dolsoe_sequences()],
    }
    path = OUT / "alignment-corrections.json"
    path.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
