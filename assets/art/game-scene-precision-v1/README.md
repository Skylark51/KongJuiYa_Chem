# game-scene-precision-v1

Inactive, versioned animation candidates and deterministic QA artifacts.

Production remains on ../game-scene/manifest.json. Do not point the renderer at
animation-manifest.json until every promoted sequence passes strict audit and
the browser regression matrix in docs/ANIMATION_ASSET_PIPELINE.md.

Build:

    py scripts/build-precision-animation-assets.py

Audit:

    py scripts/audit-animation-assets.py --write-artifacts
    py scripts/audit-animation-assets.py --check-artifacts
