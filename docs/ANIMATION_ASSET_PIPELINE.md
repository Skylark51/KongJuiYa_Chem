# Precision animation asset pipeline

The chemistry scene is the art and runtime gold master. Production currently
uses assets/art/game-scene/manifest.json and a 2048 x 1152 logical canvas.
The 1600 x 1000 size mentioned in an early brief is not used by the browser
runtime or its regression tests, so this pipeline does not replace it.

The precision-v1 package is deliberately inactive:

- production originals remain untouched;
- source-locked art remains untouched;
- alignment uses transparent padding and integer translation only;
- the builder never scales, rotates or resamples source pixels;
- runtime promotion is a separate manual review after a strict audit pass.

## Directory contract

    assets/art/game-scene-precision-v1/
      animation-manifest.json
      alignment-corrections.json
      masters/
        water-droplets-chroma.png
        water-droplets-rgba.png
      sequences/
        effects/water-droplets/
        servants/dolsoe-a/
        servants/dolsoe-b/
        servants/dolsoe-c/
      qa/
        animation-audit.json
        ANIMATION_AUDIT.md
        contact-sheets/

Individual runtime-candidate frames use zero-padded names such as f001.png.
Every frame in a sequence has the same canvas and RGBA mode. The horizontal
sheet beside those frames is a derived convenience artifact, not a new source
of truth.

## Canonical anchors

| Actor or prop | Anchor |
| --- | --- |
| Kongjwi | feet-center |
| Dolsoe | feet-center |
| Toad | body-bottom-center |
| Bucket | handle-grip |
| Bucket pour | bucket-lip |
| Jar | bottom-center |
| Water | declared origin and destination |

The current production scene anchor coordinates remain in
assets/art/game-scene/manifest.json. Precision-v1 records local sprite anchors
inside its own manifest and alignment-corrections.json.

## Reference-driven image generation

Character animation must start from a canonical source-locked master. Generate
keyframes before in-betweens, and feed both the canonical identity reference and
the previous approved frame into every incremental edit. Never prompt for
separate unrelated frames.

The new water-droplets asset was generated as one 4 x 2 sheet so all eight
states shared one generation context. A second incremental edit changed only
the background to a magenta key. The built-in image generator could not read
the existing local water reference because the host's Windows sandbox helper
was missing from its search path; this limitation is recorded in the manifest.
No character identity asset was generated under that limitation.

The chroma source is preserved at 1536 x 1024. Transparency was created with the
imagegen skill's remove_chroma_key.py utility. Each 384 x 512 cell is then
placed without scaling on a 512 x 512 RGBA canvas and translated by whole
pixels to the fixed (256, 480) effect anchor.

## Building

Run from the repository root:

    py scripts/build-precision-animation-assets.py

The builder reads:

- assets/art/game-scene-precision-v1/masters/water-droplets-rgba.png
- assets/art/game-scene-v2/servants/dolsoe-water-sheet.png

It writes only inside assets/art/game-scene-precision-v1. Every correction is
recorded, including the anchor before and after, integer dx/dy, target anchor
and resampled=false.

## Auditing

Generate deterministic reports and checkerboard contact sheets:

    py scripts/audit-animation-assets.py --write-artifacts

Verify that committed QA artifacts are current:

    py scripts/audit-animation-assets.py --check-artifacts

Checks include:

- PNG signature and full decode;
- exact frame canvas;
- transparent pixels;
- missing or empty frames;
- duplicate pixel frames;
- alpha bounding box and center;
- significant-alpha area;
- bottom-band anchor;
- canvas-edge contact;
- frame-to-frame anchor, bbox-center and area deltas.

Alpha greater than 16 defines the geometric silhouette. Lower-alpha antialias
fringe pixels remain in the PNG but cannot masquerade as a foot or effect
anchor.

Stationary clips use bbox and anchor thresholds. Declared movement clips keep a
strict ground anchor while bbox movement is measured and reported rather than
misclassified as jitter.

## Contact sheet reading

Each panel uses a checkerboard transparency background.

- yellow rectangle: significant-alpha bounding box;
- red crosshair: measured bottom-band anchor;
- label: frame number and measured anchor coordinates.

Contact sheets are QA files, never runtime assets.

## Runtime promotion checklist

Before changing assets/art/game-scene/manifest.json:

1. Strict audit result is PASS.
2. Contact sheet is visually approved at original resolution.
3. The sprite is tested with the existing layer order.
4. Grip, pour-origin and jar destination tracks are reviewed.
5. Desktop and mobile browser smoke tests pass with no 404 or console error.
6. Existing chemistry correct, wrong, timeout, fever, clear and over flows pass.
7. The promotion commit contains no source-locked or production overwrite.

## Known production findings

The audit currently documents 4.640 to 24.187 px maximum frame-to-frame
bottom-band anchor movement across the six production Kongjwi pour sheets.
These are warnings, not silent corrections, because the production character
and bucket sheets are co-registered and must be migrated together.

The production toad expression overlay remains corrupt and disabled. The
production 2048 x 1152 background asset is still missing, so the renderer uses
its existing fallback. The V2 Dolsoe art is now losslessly aligned and audited
as an inactive candidate, but its four semantic phases still need art-direction
approval before enter/carry/pour/exit labels or runtime activation.
