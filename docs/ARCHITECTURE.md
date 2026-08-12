# Architecture

## Runtime flow

`index.html` is the production lobby. It renders home, jar selection, and records views without redirecting to the game.

Selecting a mode opens `콩쥐야_줘때써.html?training=<id>`. The game page loads `assets/js/game-page.js`, which initializes the UI around the API assembled by `assets/js/main.js`. The layered PNG scene is mounted through `game-cosmetics-entry.js` and `scene-renderer.js`.

The game page exposes three stylesheet entrypoints instead of loading the historical patch stack directly:

- `assets/css/game-runtime-base.css`: base layout, responsive quiz shell, keypad, and training-specific base styles.
- `assets/css/game-asset-animation.css`: the direct scene animation stylesheet. It remains a separate `<link>` because `scene-renderer.js` uses its element id as the runtime readiness contract.
- `assets/css/game-runtime-features.css`: layered-scene composition, cosmetic composition, audio, result, and countdown feature styles.

The bundle files preserve the previous cascade order while keeping dashboard-only composer styles such as `kongjwi-parts.css` out of the game runtime.

## Module ownership

- `data/training-modes.js`: 26-mode public catalog and per-mode rules.
- `data/questions/index.js`: question-bank registry, flattened export, and schema validation.
- `assets/js/question-engine.js`: mode/difficulty filtering and answer normalization.
- `assets/js/game-core.js`: water, timing, scoring, combo, fever, pause, and terminal state.
- `assets/js/storage.js`: schema v5 migration, settings, economy, and per-mode records.
- `assets/js/main.js`: one shared game API and engine composition.
- `assets/js/game-page.js`: the single game-page entry and bootstrap.
- `assets/js/ui-effects.js`: game-page DOM wiring, selection, keypad, and navigation.
- `assets/js/scene-renderer.js`: manifest-backed layered PNG scene.
- `assets/js/scene-state-machine.js`: scene reactions to game events.
- `assets/js/lobby-actions.js`: lobby cards, category persistence, missions, and upgrades.
- `assets/js/lobby-navigation.js`: lobby view routing.

The core clamps frame delta, locks answer submission during evaluation, stops ticks after terminal states, and restricts each run to the selected `trainingId`.

## Public browser API

`globalThis.KongJuiYaGame` exposes the game, question engine, storage, training modes, and start/submit/select operations used by the page layer and smoke tests.

## Scene assets

`assets/art/game-scene/manifest.json` defines one 2048 x 1152 logical scene. An `availability` value of `true` marks a production-required PNG; `false` marks a planned asset that may use its declared fallback.

`scripts/validate-layered-scene.mjs` validates required dimensions, RGBA 8-bit-or-higher format, PNG chunk boundaries, and a complete terminal `IEND` chunk. Optional assets are only promoted into the required validation set when their manifest feature flag is enabled. This prevents an incomplete authored asset from silently becoming a runtime dependency.

The water-pour and water-leak sheets are reproducibly authored by `scripts/rebuild-water-effects.py` at their final `4096 x 512` RGBA resolution. `.github/workflows/rebuild-water-effects.yml` regenerates both files, runs the layered-scene validator, and commits them only after the production asset contract passes. This path exists because the historical copies of those two PNGs were already chunk-corrupted and had no earlier valid repository revision to restore.

The current shared toad expression overlay remains disabled until a complete RGBA PNG replaces the damaged source. Premium toad skins therefore continue to use the safe skin-motion path rather than loading that overlay.

## Events

Game: `training:start`, `training:clear`, `game:start`, `game:pause`, `game:resume`, `game:over`, `game:clear`.

Answers: `answer:correct`, `answer:wrong`, `answer:timeout`.

Water and fever: `water:warning`, `water:critical`, `fever:charge`, `fever:start`, `fever:extend`, `fever:end`.

Dialogue: `toad:speak`.
