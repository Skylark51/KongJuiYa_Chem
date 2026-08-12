# Source-Locked Art

This directory is the immutable source-of-truth for animation and scene derivatives.

## Kongjwi rule

The Kongjwi files in `source-locked/kongjwi/*/base-cutout.png` are byte-identical copies of the PNG artwork currently used by the project at the time this contract was introduced.

- Do not replace them with newly generated characters.
- Do not redraw the face, body proportions, hair, or outfit identity as a new original.
- Animation frames must be derived from these source-locked originals.
- A pose/edit pipeline may transform posture for animation, but it must preserve the currently used character identity and art style.
- `night-court` uses `servant-pour`; it must not be converted into a self-pour animation.

`manifest.json` records the legacy production path and Git blob for every locked source.
