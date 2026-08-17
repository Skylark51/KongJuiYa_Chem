# Asset Runtime Structure

This document is the canonical map for game-scene assets after the 2026-08-17 Korean-path migration.

## Production paths

- `assets/그림/메인/` — main/lobby presentation assets.
- `assets/그림/공용/원본/` — immutable source-quality shared PNG originals.
- `assets/그림/공용/두꺼비/표정/` — shared toad expression PNGs.
- `assets/그림/게임-장면/` — authored layered-scene sheets, effects, background/foreground layers, and `manifest.json`.
- `assets/js/scene-renderer.js` — the single production renderer for the layered game scene.
- `assets/js/scene-asset-paths.js` — compatibility mapping from pre-migration English asset paths to canonical Korean paths.

## Runtime rule

`assets/그림/게임-장면/manifest.json` may still contain historical fallback strings while migration is in progress. Every scene URL must pass through `resolveSceneAssetPath()` in `scene-asset-paths.js` before it is requested. Do not add page-specific asset guards or duplicate fallback PNGs to repair a renamed path.

The former `assets/images/background/courtyard-night.png` is now `assets/그림/메인/배경/밤-뜰.png`. The source-quality counterpart is `assets/그림/공용/원본/배경/밤-뜰.png`.

## Naming rule

Use feature names for permanent modules (`scene-renderer`, `jar-selection-preview`, `subject-toolbar`). Names such as `fix`, `regression`, `guard`, or `parity` are reserved for temporary branches/experiments and must not remain as production entrypoints after the behavior is integrated.

## Animation contract

- Kongjwi animation derivatives must preserve the corresponding source-quality original.
- `night-court` uses the `servant-pour` action mode; normal outfits use `self-pour`.
- Authored servant art must be distinct servant art.
- Runtime switches to a newly authored layer/sheet only after module-level validation; otherwise the canonical Korean-path source fallback is used.
