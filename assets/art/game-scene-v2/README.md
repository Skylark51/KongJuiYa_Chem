# Game Scene V2 Asset Modules

`game-scene-v2` is a parallel, non-runtime migration area for the next animation asset contract.

The production renderer still reads `assets/그림/게임-장면/manifest.json`. V2 is intentionally staged without switching runtime behavior so asset work can be validated module-by-module.

## Module boundaries

- `kongjwi/`: current animation derivatives, keyed by outfit.
- `tools/`: bucket/tool masters and pour sheets.
- `jars/`: jar composition layers.
- `toad/`: toad skins and expression assets.
- `water/`: pour, splash, leak, and surface effects.
- `background/`: scene background/foreground assets.
- `servants/`: reserved for authored Dolsoe/servant actors used by `night-court`.

All Kongjwi animation work must trace back to `assets/art/source-locked/kongjwi/`.
No newly generated replacement Kongjwi original is accepted by this contract.
