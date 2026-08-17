#!/usr/bin/env python3
"""Rebuild water-effect sprite sheets at their final runtime resolution."""
from __future__ import annotations

from math import pi, sin
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SHEET_W = 4096
CELL = 512
FRAMES = 8
OUT = Path("assets/그림/게임-장면/효과")


def rgba_layer():
    return Image.new("RGBA", (SHEET_W, CELL), (0, 0, 0, 0))


def add_soft_circle(draw, xy, radius, fill, outline=None, width=1):
    x, y = xy
    draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=fill, outline=outline, width=width)


def build_pour():
    base = rgba_layer()
    glow = rgba_layer()
    main = ImageDraw.Draw(base, "RGBA")
    soft = ImageDraw.Draw(glow, "RGBA")
    start = (126, 116)
    end = (404, 392)
    strengths = [0.0, 0.12, 0.38, 0.72, 0.95, 1.0, 0.58, 0.16]

    for frame, strength in enumerate(strengths):
        offset = frame * CELL
        if frame == 0:
            continue
        if strength < 0.2:
            count = 3 if frame == 1 else 4
            for index in range(count):
                t = (index + 1) / (count + 2)
                x = start[0] + (end[0] - start[0]) * t * (0.65 if frame == 1 else 0.85)
                y = start[1] + (end[1] - start[1]) * t + 34 * sin(pi * t)
                radius = 4 + index * 1.2
                add_soft_circle(soft, (offset + x, y), radius * 2.2, (64, 202, 255, 35))
                add_soft_circle(main, (offset + x, y), radius, (136, 231, 255, 190), (220, 250, 255, 225), 1)
            continue

        points = []
        max_t = min(1.0, 0.46 + strength * 0.58)
        for index in range(34):
            t = max_t * index / 33
            x = start[0] + (end[0] - start[0]) * t
            y = start[1] + (end[1] - start[1]) * t - 54 * sin(pi * t)
            points.append((offset + x, y))

        width = int(8 + 21 * strength)
        soft.line(points, fill=(52, 178, 255, 40), width=width + 20, joint="curve")
        soft.line(points, fill=(86, 212, 255, 65), width=width + 9, joint="curve")
        main.line(points, fill=(103, 211, 246, 175), width=width, joint="curve")
        main.line([(x - 2, y - 2) for x, y in points], fill=(221, 251, 255, 190), width=max(2, width // 4), joint="curve")

        for index in range(5):
            t = 0.64 + index * 0.065
            if t > max_t + 0.10:
                continue
            capped = min(t, 1.0)
            x = start[0] + (end[0] - start[0]) * capped + (index % 2) * 8 - 4
            y = start[1] + (end[1] - start[1]) * capped - 54 * sin(pi * capped) + 11 + index * 3
            radius = 3 + (index % 2)
            add_soft_circle(main, (offset + x, y), radius, (168, 238, 255, 175), (230, 253, 255, 210), 1)

    return Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(7)), base)


def build_leak():
    base = rgba_layer()
    glow = rgba_layer()
    main = ImageDraw.Draw(base, "RGBA")
    soft = ImageDraw.Draw(glow, "RGBA")

    for frame in range(FRAMES):
        phase = 2 * pi * frame / FRAMES
        offset = frame * CELL
        hole_x, hole_y = 256, 102
        bottom = 404
        points = []
        for index in range(31):
            t = index / 30
            x = hole_x + 8 * sin(phase + t * 2.5 * pi) * (0.25 + 0.75 * t)
            y = hole_y + (bottom - hole_y) * t
            points.append((offset + x, y))

        soft.line(points, fill=(45, 177, 246, 42), width=30, joint="curve")
        soft.line(points, fill=(78, 208, 255, 62), width=20, joint="curve")
        main.line(points, fill=(91, 205, 241, 172), width=12, joint="curve")
        main.line([(x - 2, y) for x, y in points], fill=(213, 249, 255, 190), width=3, joint="curve")

        for index in range(4):
            t = ((frame / FRAMES) + index * 0.27) % 1.0
            x = hole_x + 18 * sin(phase + index * 1.7) + (index - 1.5) * 4
            y = hole_y + 46 + t * 294
            radius = 4 + (index % 2)
            add_soft_circle(soft, (offset + x, y), radius * 2.3, (62, 193, 255, 36))
            add_soft_circle(main, (offset + x, y), radius, (145, 230, 252, 185), (226, 252, 255, 215), 1)

        pulse = 1.0 + 0.08 * sin(phase)
        center_x, center_y = offset + 257, 421
        soft.ellipse((center_x - 80 * pulse, center_y - 18, center_x + 80 * pulse, center_y + 18), fill=(44, 169, 232, 30))
        main.ellipse((center_x - 54 * pulse, center_y - 8, center_x + 54 * pulse, center_y + 8), outline=(126, 222, 249, 130), width=3)
        main.arc((center_x - 38 * pulse, center_y - 6, center_x + 38 * pulse, center_y + 9), 190, 350, fill=(219, 249, 255, 160), width=2)

    return Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(7)), base)


def save_rgba(image, filename):
    if image.mode != "RGBA" or image.size != (SHEET_W, CELL):
        raise RuntimeError(f"{filename}: invalid image contract: {image.mode} {image.size}")
    path = OUT / filename
    image.save(path, format="PNG", optimize=False, compress_level=6)
    with Image.open(path) as check:
        check.load()
        if check.mode != "RGBA" or check.size != (SHEET_W, CELL):
            raise RuntimeError(f"{filename}: failed round-trip validation")
    print(f"{path}: {path.stat().st_size} bytes, RGBA, 4096x512")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    save_rgba(build_pour(), "물줄기-동작.png")
    save_rgba(build_leak(), "구멍-누수-동작.png")
