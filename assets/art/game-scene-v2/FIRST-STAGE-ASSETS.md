# V2 First-Stage Authored Assets

This registry records the first authored animation rebuild candidates without activating them in production.

## Asset policy

- Preserve the generated PNGs at full resolution.
- Do not downscale or convert them to WebP.
- Kongjwi animation derivatives must remain grounded in the current project character art and the source-locked identity contract.
- `night-court` uses `servant-pour`; it must not fall back to a self-pour animation.
- Dolsoe is an independent servant actor module; temporary Kongjwi-as-servant art is not accepted for V2.
- Celadon authored-open body and lid are independent layers.

The exact expected paths, byte sizes, SHA-256 hashes, sprite grids, clips, and Dolsoe variants are recorded in `first-stage-assets.json`.

Production runtime remains on the validated V1 assets until the authored PNGs are present and pass asset-integrity validation.
