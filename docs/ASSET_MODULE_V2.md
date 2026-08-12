# Asset Module V2 Migration

The animation refactor starts with asset provenance, not with new character generation.

## Rules

1. `assets/art/source-locked/` stores immutable current-production originals.
2. Kongjwi animation derivatives must be based on those exact PNG originals.
3. `assets/art/game-scene-v2/` is a parallel derived-module tree and is not the production runtime yet.
4. `night-court` uses the `servant-pour` action mode; normal outfits use `self-pour`.
5. Authored servant art must be distinct servant art. The legacy temporary Kongjwi-as-servant fallback is outside the V2 contract.
6. Runtime switches to V2 only after module-level validation; current `game-scene` remains active during migration.

This keeps the current character identity intact while allowing frame, layer, mask, and effect assets to be rebuilt safely.
