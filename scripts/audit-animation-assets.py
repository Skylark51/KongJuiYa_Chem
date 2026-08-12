#!/usr/bin/env python3
"""Audit PNG frame grids, anchors, bboxes and duplicates; render QA sheets."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ALPHA_THRESHOLD = 16
ANCHOR_BAND = 10


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest",
        default="assets/art/game-scene-precision-v1/animation-manifest.json",
    )
    parser.add_argument("--write-artifacts", action="store_true")
    parser.add_argument("--check-artifacts", action="store_true")
    return parser.parse_args()


def load_png(path):
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("not a PNG")
    with Image.open(path) as probe:
        probe.verify()
    with Image.open(path) as source:
        source.load()
        return source.convert("RGBA")


def frames_for(sequence):
    size = (sequence["canvas"]["width"], sequence["canvas"]["height"])
    if "frames" in sequence:
        result = []
        for relative in sequence["frames"]:
            frame = load_png(ROOT / relative)
            if frame.size != size:
                raise ValueError(f"{relative}: {frame.size} != {size}")
            result.append((relative, frame))
        return result
    relative = sequence["sheet"]
    sheet = load_png(ROOT / relative)
    layout = sequence["layout"]
    expected = (size[0] * layout["columns"], size[1] * layout["rows"])
    if sheet.size != expected:
        raise ValueError(f"{relative}: sheet {sheet.size} != {expected}")
    result = []
    for index in range(layout["frameCount"]):
        x = (index % layout["columns"]) * size[0]
        y = (index // layout["columns"]) * size[1]
        frame = sheet.crop((x, y, x + size[0], y + size[1]))
        result.append((f"{relative}#frame-{index + 1:03d}", frame))
    return result


def measure(frame):
    alpha = frame.getchannel("A")
    significant = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    bbox = significant.getbbox()
    if not bbox:
        raise ValueError("empty alpha silhouette")
    left, top, right, bottom = bbox
    pixels = alpha.load()
    weighted_x = 0.0
    weight = 0.0
    for y in range(max(top, bottom - ANCHOR_BAND), bottom):
        for x in range(left, right):
            value = pixels[x, y]
            if value > ALPHA_THRESHOLD:
                weighted_x += x * value
                weight += value
    anchor_x = weighted_x / weight if weight else (left + right - 1) / 2
    area = sum(alpha.histogram()[ALPHA_THRESHOLD + 1 :])
    return {
        "canvas": list(frame.size),
        "alphaExtrema": list(alpha.getextrema()),
        "alphaBBox": list(bbox),
        "bboxCenter": [
            round((left + right - 1) / 2, 3),
            round((top + bottom - 1) / 2, 3),
        ],
        "bboxBottomCenter": [round((left + right) / 2, 3), bottom],
        "bboxSize": [right - left, bottom - top],
        "alphaArea": area,
        "bottomBandAnchor": [round(anchor_x, 3), bottom],
        "touchesCanvasEdge": (
            left == 0 or top == 0 or right == frame.width or bottom == frame.height
        ),
        "pixelSha256": hashlib.sha256(frame.tobytes()).hexdigest(),
    }


def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def audit(sequence):
    gate = sequence.get("qualityGate", "strict")
    errors, warnings, metrics = [], [], []
    anchor_metric = sequence.get("anchor", {}).get("metric", "bottomBandAnchor")
    if anchor_metric not in {"bottomBandAnchor", "bboxBottomCenter"}:
        return {
            "id": sequence["id"],
            "qualityGate": gate,
            "status": "FAIL",
            "errors": [f"unsupported anchor metric: {anchor_metric}"],
            "warnings": [],
            "frames": [],
            "observed": {},
        }, []
    try:
        frames = frames_for(sequence)
    except (FileNotFoundError, OSError, ValueError) as error:
        return {
            "id": sequence["id"],
            "qualityGate": gate,
            "status": "FAIL",
            "errors": [str(error)],
            "warnings": [],
            "frames": [],
            "observed": {},
        }, []
    if len(frames) != sequence["frameCount"]:
        errors.append(f"frame count {len(frames)} != {sequence['frameCount']}")
    hashes = defaultdict(list)
    for index, (source, frame) in enumerate(frames):
        try:
            metric = measure(frame)
            metric["measuredAnchor"] = metric[anchor_metric]
            metric.update(index=index + 1, source=source)
            metrics.append(metric)
            hashes[metric["pixelSha256"]].append(index + 1)
            if metric["alphaExtrema"][0] != 0:
                errors.append(f"frame {index + 1}: no transparent pixels")
            if metric["touchesCanvasEdge"] and not sequence.get(
                "allowEdgeContact", False
            ):
                errors.append(f"frame {index + 1}: alpha touches canvas edge")
        except ValueError as error:
            errors.append(f"frame {index + 1}: {error}")
    duplicates = [group for group in hashes.values() if len(group) > 1]
    if duplicates and not sequence.get("allowDuplicateFrames", False):
        errors.append(f"duplicate frames: {duplicates}")

    motion = sequence.get("motion", {})
    thresholds = {
        "maxAnchorDeltaPx": motion.get("maxAnchorDeltaPx"),
        "maxBboxCenterDeltaPx": motion.get("maxBboxCenterDeltaPx"),
        "maxAlphaAreaChangeRatio": motion.get("maxAlphaAreaChangeRatio"),
    }
    observed = {
        "maxAnchorDeltaPx": 0.0,
        "maxBboxCenterDeltaPx": 0.0,
        "maxAlphaAreaChangeRatio": 0.0,
        "duplicateFrameGroups": duplicates,
    }
    deltas = []
    for previous, current in zip(metrics, metrics[1:]):
        anchor = distance(previous["measuredAnchor"], current["measuredAnchor"])
        bbox = distance(previous["bboxCenter"], current["bboxCenter"])
        area = abs(current["alphaArea"] - previous["alphaArea"]) / max(
            previous["alphaArea"], 1
        )
        observed["maxAnchorDeltaPx"] = max(observed["maxAnchorDeltaPx"], anchor)
        observed["maxBboxCenterDeltaPx"] = max(
            observed["maxBboxCenterDeltaPx"], bbox
        )
        observed["maxAlphaAreaChangeRatio"] = max(
            observed["maxAlphaAreaChangeRatio"], area
        )
        deltas.append({
            "from": previous["index"],
            "to": current["index"],
            "anchorDeltaPx": round(anchor, 3),
            "bboxCenterDeltaPx": round(bbox, 3),
            "alphaAreaChangeRatio": round(area, 5),
        })
    labels = {
        "maxAnchorDeltaPx": "anchor jitter",
        "maxBboxCenterDeltaPx": "bbox center jump",
        "maxAlphaAreaChangeRatio": "alpha area change",
    }
    for key, threshold in thresholds.items():
        if threshold is not None and observed[key] > threshold:
            message = f"{labels[key]} {observed[key]:.3f} > {threshold:.3f}"
            (errors if gate == "strict" else warnings).append(message)
    for key in tuple(observed):
        if isinstance(observed[key], float):
            observed[key] = round(observed[key], 5)
    status = "FAIL" if errors else ("WARN" if warnings else "PASS")
    return {
        "id": sequence["id"],
        "actor": sequence.get("actor"),
        "clip": sequence.get("clip"),
        "qualityGate": gate,
        "status": status,
        "errors": errors,
        "warnings": warnings,
        "thresholds": thresholds,
        "observed": observed,
        "deltas": deltas,
        "frames": metrics,
    }, frames


def checkerboard(size, tile=16):
    image = Image.new("RGBA", size, (236, 239, 244, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle(
                    (x, y, min(x + tile, size[0]), min(y + tile, size[1])),
                    fill=(208, 214, 223, 255),
                )
    return image


def contact_sheet(sequence, frames, result):
    columns = min(4, len(frames))
    rows = math.ceil(len(frames) / columns)
    width, height = sequence["canvas"]["width"], sequence["canvas"]["height"]
    scale = min(1.0, 320 / width, 420 / height)
    preview = (round(width * scale), round(height * scale))
    cell = (preview[0], preview[1] + 34)
    sheet = Image.new(
        "RGBA", (cell[0] * columns, cell[1] * rows), (22, 25, 31, 255)
    )
    font = ImageFont.load_default()
    for index, (_, frame) in enumerate(frames):
        x, y = (index % columns) * cell[0], (index // columns) * cell[1]
        panel = checkerboard(preview)
        panel.alpha_composite(frame.resize(preview, Image.Resampling.LANCZOS))
        draw = ImageDraw.Draw(panel)
        metric = result["frames"][index]
        bbox = tuple(round(value * scale) for value in metric["alphaBBox"])
        draw.rectangle(bbox, outline=(255, 196, 45, 255), width=2)
        ax = round(metric["measuredAnchor"][0] * scale)
        ay = round(metric["measuredAnchor"][1] * scale)
        draw.line((ax - 7, ay, ax + 7, ay), fill=(255, 68, 68, 255), width=2)
        draw.line((ax, ay - 7, ax, ay + 7), fill=(255, 68, 68, 255), width=2)
        sheet.alpha_composite(panel, (x, y))
        ImageDraw.Draw(sheet).text(
            (x + 8, y + preview[1] + 8),
            f"{index + 1:02d} A({metric['measuredAnchor'][0]:.1f},"
            f"{metric['measuredAnchor'][1]:.1f})",
            font=font,
            fill=(244, 247, 252, 255),
        )
    return sheet


def markdown(manifest, report):
    lines = [
        "# Animation asset audit",
        "",
        f"- Manifest: {report['manifest']}",
        f"- Manifest SHA256: {report['manifestSha256']}",
        f"- Scene logical canvas: {manifest['sceneLogicalSize']['width']}x"
        f"{manifest['sceneLogicalSize']['height']}",
        f"- Strict failures: {report['summary']['strictFailures']}",
        f"- Warnings: {report['summary']['warnings']}",
        "",
        "| Sequence | Gate | Status | Frames | Anchor delta | Bbox delta |",
        "| --- | --- | --- | ---: | ---: | ---: |",
    ]
    for item in report["sequences"]:
        observed = item["observed"]
        lines.append(
            f"| {item['id']} | {item['qualityGate']} | {item['status']} | "
            f"{len(item['frames'])} | "
            f"{observed.get('maxAnchorDeltaPx', 0):.3f}px | "
            f"{observed.get('maxBboxCenterDeltaPx', 0):.3f}px |"
        )
        for message in item["errors"]:
            lines.extend(("", f"> FAIL {item['id']}: {message}", ""))
        for message in item["warnings"]:
            lines.extend(("", f"> WARN {item['id']}: {message}", ""))
    lines.extend((
        "",
        "Production-reference warnings document existing behavior only.",
        "Only strict PASS sequences are eligible for later runtime promotion.",
        "",
    ))
    return "\n".join(lines)


def write_or_check(path, data, check):
    if check:
        return path.exists() and path.read_bytes() == data
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(data)
    temporary.replace(path)
    return True


def main():
    args = arguments()
    manifest_path = ROOT / args.manifest
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    results, frame_sets = [], {}
    for sequence in manifest["sequences"]:
        result, frames = audit(sequence)
        results.append(result)
        frame_sets[sequence["id"]] = frames
    report = {
        "manifest": manifest_path.relative_to(ROOT).as_posix(),
        "manifestSha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
        "summary": {
            "sequenceCount": len(results),
            "strictFailures": sum(
                item["qualityGate"] == "strict" and item["status"] == "FAIL"
                for item in results
            ),
            "warnings": sum(bool(item["warnings"]) for item in results),
            "missingFrames": sum(not item["frames"] for item in results),
            "dimensionMismatches": sum(
                any(" != " in error for error in item["errors"]) for item in results
            ),
            "duplicateSequences": sum(
                bool(item["observed"].get("duplicateFrameGroups"))
                for item in results
            ),
        },
        "sequences": results,
    }
    qa = ROOT / manifest["qaRoot"]
    artifacts = [
        (
            qa / "animation-audit.json",
            (json.dumps(report, indent=2, sort_keys=True) + "\n").encode(),
        ),
        (qa / "ANIMATION_AUDIT.md", markdown(manifest, report).encode()),
    ]
    for sequence, result in zip(manifest["sequences"], results):
        frames = frame_sets[sequence["id"]]
        if frames and len(result["frames"]) == len(frames):
            buffer = io.BytesIO()
            contact_sheet(sequence, frames, result).save(
                buffer, format="PNG", optimize=True, compress_level=9
            )
            artifacts.append((
                qa / "contact-sheets" / f"{sequence['id']}.png",
                buffer.getvalue(),
            ))
    if args.write_artifacts or args.check_artifacts:
        stale = [
            str(path.relative_to(ROOT))
            for path, data in artifacts
            if not write_or_check(path, data, args.check_artifacts)
        ]
        if stale:
            print("QA artifacts are stale:")
            print("\n".join(f"  - {path}" for path in stale))
            return 1
    print(json.dumps(report["summary"], sort_keys=True))
    for item in results:
        print(f"{item['status']:4} {item['qualityGate']:10} {item['id']}")
        for message in item["errors"] + item["warnings"]:
            print(f"     {message}")
    return 1 if report["summary"]["strictFailures"] else 0


if __name__ == "__main__":
    sys.exit(main())
