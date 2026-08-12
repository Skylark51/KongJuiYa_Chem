# game-scene-precision-v1

Versioned animation candidates and deterministic QA artifacts. The audited
Dolsoe C sequence and water-droplets sequence are promoted only for the
night-court correct-answer effect in assets/js/court-servant-effect.js.

The shared production renderer remains on ../game-scene/manifest.json; the
precision package is not a replacement scene manifest.

Build:

    py scripts/build-precision-animation-assets.py

Audit:

    py scripts/audit-animation-assets.py --write-artifacts
    py scripts/audit-animation-assets.py --check-artifacts
