# Animation asset audit

- Manifest: assets/art/game-scene-precision-v1/animation-manifest.json
- Manifest SHA256: db5fd4ae3c5b85e18d324d3ece078159b67a5a76624779c93c7fc1f10004a799
- Scene logical canvas: 2048x1152
- Strict failures: 0
- Warnings: 5

| Sequence | Gate | Status | Frames | Anchor delta | Bbox delta |
| --- | --- | --- | ---: | ---: | ---: |
| production-kongjwi-underlayer-pour | report | WARN | 8 | 5.846px | 11.180px |

> WARN production-kongjwi-underlayer-pour: anchor jitter 5.846 > 4.000

| production-kongjwi-classic-red-pour | report | WARN | 8 | 5.995px | 11.630px |

> WARN production-kongjwi-classic-red-pour: anchor jitter 5.995 > 4.000

| production-kongjwi-blue-scholar-pour | report | WARN | 8 | 5.720px | 9.434px |

> WARN production-kongjwi-blue-scholar-pour: anchor jitter 5.720 > 4.000

| production-kongjwi-field-work-pour | report | WARN | 8 | 4.640px | 11.424px |

> WARN production-kongjwi-field-work-pour: anchor jitter 4.640 > 4.000

| production-kongjwi-ragged-pour | report | WARN | 8 | 5.601px | 7.071px |

> WARN production-kongjwi-ragged-pour: anchor jitter 5.601 > 4.000

| production-kongjwi-night-court-pour | report | PASS | 8 | 1.000px | 11.011px |
| production-tool-wood-pour | report | PASS | 8 | 80.658px | 22.638px |
| production-water-leak | report | PASS | 8 | 0.500px | 0.500px |
| precision-water-droplets | strict | PASS | 8 | 0.708px | 79.128px |
| precision-dolsoe-a | strict | PASS | 4 | 0.589px | 192.510px |
| precision-dolsoe-b | strict | PASS | 4 | 0.422px | 79.000px |
| precision-dolsoe-c | strict | PASS | 4 | 0.591px | 181.580px |

Production-reference warnings document existing behavior only.
Only strict PASS sequences are eligible for later runtime promotion.
