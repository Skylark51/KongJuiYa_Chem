# Animation asset audit

- Manifest: assets/art/game-scene-precision-v1/animation-manifest.json
- Manifest SHA256: 2425cb9f0ba5402c4e076c14caa1af93e8b60b96e17c13b47f4ba97bb02a4e65
- Scene logical canvas: 2048x1152
- Strict failures: 0
- Warnings: 3

| Sequence | Gate | Status | Frames | Anchor delta | Bbox delta |
| --- | --- | --- | ---: | ---: | ---: |
| production-kongjwi-underlayer-pour | report | WARN | 8 | 5.846px | 11.180px |

> WARN production-kongjwi-underlayer-pour: anchor jitter 5.846 > 4.000

| production-kongjwi-classic-red-pour | report | PASS | 30 | 1.246px | 11.500px |
| production-kongjwi-blue-scholar-pour | report | PASS | 30 | 2.166px | 4.031px |
| production-kongjwi-field-work-pour | report | FAIL | 8 | 43.012px | 26.249px |

> FAIL production-kongjwi-field-work-pour: frame 5: alpha touches canvas edge


> WARN production-kongjwi-field-work-pour: anchor jitter 43.012 > 4.000

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
