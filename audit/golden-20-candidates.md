# Golden candidates

이 문서는 Codex 2의 런타임 재현 6건과 Codex 1의 정적 감사 20건을 교차 검토해 확정한 우선순위 후보 20건이다. Codex 1 보고서는 이후 확인됐으며, 원문 경로는 audit/codex1-static-audit.md다.

선정 기준은 런타임 재현·실패하는 회귀 테스트·현재 소스의 직접 참조 근거 중 하나가 있고, 원인과 최소 수정 경계를 특정할 수 있는 항목이다. 같은 근본 원인인 후보는 하나로 합쳤다.

GOLD-01~06은 런타임 재현으로 확정됐다. GOLD-07~20은 현재 소스와 회귀 테스트로 확인된 정적 후보이며, UI 변경 전에는 각 항목에 적힌 브라우저 회귀를 추가해야 한다.

## GOLD-01

Priority: P0

Title: 화학 compact desktop에서 navigation surface가 사라지는 breakpoint 공백을 제거한다

Root cause: `assets/css/lobby-scene.css`가 `max-width:980px`에서 `.desktop-tabs`를 숨기지만 mobile nav는 700px 이하 또는 mobile dataset에서만 보인다. Chemistry의 forced-desktop narrow fallback은 Portal selector도 놓친다.

Confirmed symptoms: 768/820 forced desktop과 900/940/941 auto/desktop에서 Home/Jars/Records/Shop surface 0개; 390 forced desktop에서는 하단 nav가 5개여서 Portal 없음.

Evidence: [941px auto](evidence/TB-941-100-auto-chemistry.png), [941px desktop](evidence/TB-941-100-desktop-chemistry.png), [runtime matrix](evidence/runtime-probe-results.json), 390px forced-desktop runtime measurement (`desktop:none`, `mobile:grid`, `portal:none`).

Affected files: `assets/css/lobby-scene.css`, `assets/css/subject-navigation.css`

Exact patch scope: 701–940px Chemistry topbar에 compact 2행 grid와 visible `.desktop-tabs`를 추가하고, `max-width:700px` mobile fallback도 `.mobile-portal-link`를 display/grid 6열로 만든다.

DO NOT TOUCH: `subject-toolbar-parity.css`와 그 modular JS/CSS ownership; Chemistry/subject storage schema; nav URL contract.

Verification: 701, 768, 820, 900, 940, 941px × auto/mobile/desktop에서 exactly one navigation surface와 desktop 4개 또는 mobile 6개 control을 확인.

Regression test: Playwright toolbar breakpoint test를 추가한다.

Rollback condition: 941px 이상 wide desktop의 existing 3-column geometry 또는 700px 이하 mobile nav label geometry가 깨지면 rollback.

Depends on: 없음

Expected user impact: 중간 폭 노트북/분할 화면/확대 환경에서 핵심 화면 이동 불능을 제거한다.

Confidence: 98

## GOLD-02

Priority: P1

Title: 화학 모바일 settings dialog를 safe viewport 안에 고정한다

Root cause: `.modal-card`는 max-height만 갖고 top-layer inset/placement가 보장되지 않는다.

Confirmed symptoms: 390×844 home/jars/records에서 settings dialog가 `bottom=862.48 > innerHeight=844`로 18.48px 잘린다.

Evidence: `DIALOG-mobile-chemistry` in [adversarial probe](evidence/adversarial-probe-results.json).

Affected files: `assets/css/lobby-scene.css`, `subjects/chemistry/index.html`

Exact patch scope: `.modal-card[open]`의 viewport-relative inset/margin 및 max-block-size를 지정하고 form overflow를 내부로 제한한다.

DO NOT TOUCH: settings field names, saved audio/device preference keys, dialog semantic/form structure.

Verification: 320×568, 390×844, 844×390에서 dialog rect 전체와 Save/Cancel visibility 확인.

Regression test: dialog bounding-box assertions.

Rollback condition: desktop modal width, Escape close, form submit behavior가 바뀌면 rollback.

Depends on: 없음

Expected user impact: 설정 저장/취소 control이 모바일에서 가려지지 않는다.

Confidence: 94

## GOLD-03

Priority: P1

Title: storage가 차단된 브라우저에서도 entry를 계속 실행한다

Root cause: boot path에 unguarded `localStorage.getItem`이 있어 SecurityError가 module/inline initialization을 중단한다.

Confirmed symptoms: throw-on-access storage에서 4 subject ready marker timeout; shop/game도 blocked page error.

Evidence: [four-subject no-storage screenshots](evidence/NOSTORE-chemistry.png), [runtime probe](evidence/runtime-probe-results.json), [adversarial probe](evidence/adversarial-probe-results.json).

Affected files: `assets/js/device-entry.js`, `subjects/chemistry/index.html`, `assets/js/subject-shell.js`, `shop.html`, relevant game entry bootstrap

Exact patch scope: reusable safe storage accessor/no-op in-memory fallback을 bootstrap read/write에만 적용한다.

DO NOT TOUCH: existing `GameStorage` migration, key names, persistence format, normal-storage behavior.

Verification: blocked local/session storage injection으로 portal, 4 subject, shop, valid quiz가 console/page error 없이 usable인지 확인.

Regression test: Playwright storage getter SecurityError fixture.

Rollback condition: ordinary storage persistence/migration test가 실패하거나 storage errors가 사용자에게 노출되면 rollback.

Depends on: 없음

Expected user impact: privacy-restricted/webview 환경에서도 앱이 빈 화면이 되지 않는다.

Confidence: 93

## GOLD-04

Priority: P2

Title: subject shell의 cross-tab records와 device mode를 storage event로 동기화한다

Root cause: wallet만 storage event를 구독하며 `subject-shell.js`의 records render와 device application은 구독하지 않는다.

Confirmed symptoms: biology records는 Tab B write 뒤 `0`, reload 뒤 `1`; physics device layout은 Tab B의 mobile 변경 뒤 desktop, reload 뒤 mobile. wallet은 즉시 갱신돼 event transport 정상임을 확인했다.

Evidence: `MULTITAB-records`, `MULTITAB-device-mode`, `MULTITAB-wallet` in [adversarial probe](evidence/adversarial-probe-results.json).

Affected files: `assets/js/subject-shell.js`, `assets/js/device-entry.js`

Exact patch scope: subject records/category key와 global device/audio/preference key에 좁은 `storage` listener를 추가하고, active view만 rerender/apply한다.

DO NOT TOUCH: record aggregation formula, SubjectStorage key namespace, wallet ownership in `subject-toolbar/beans.js`.

Verification: same BrowserContext의 두 tab에서 record/category/device write 뒤 reload 없이 counter/filter/layout 반영 확인.

Regression test: multi-page storage-event integration test.

Rollback condition: local interaction의 history/focus reset, duplicate listener, wallet double render가 나타나면 rollback.

Depends on: GOLD-03과 독립

Expected user impact: 여러 탭을 쓰는 사용자가 stale record와 잘못된 device layout을 보지 않는다.

Confidence: 91

## GOLD-05

Priority: P2

Title: invalid quiz direct URL에 subject-aware recovery path를 제공한다

Root cause: invalid training lookup exception이 static error copy만 남기며 recovery action을 render하지 않는다.

Confirmed symptoms: chemistry/biology/earth invalid training URL은 console exception, stale “원자 번호” chrome, “새로고침” 안내만 남고 jars/return link가 없다. `training=atomic_number`는 정상 running/error 0이다.

Evidence: `GAMEURL-invalid-training-*` in [adversarial probe](evidence/adversarial-probe-results.json); valid URL A/B verification.

Affected files: `assets/js/ui-effects.js`, `assets/js/game-page.js`, game error surface

Exact patch scope: training validation error를 non-throwing recoverable state로 전환하고 `subjects/<subject>/?view=jars` action을 하나 제공한다.

DO NOT TOUCH: valid training ID resolution, GameCore scoring/timing, subject content registry.

Verification: invalid subject/training/no-query URL에서 no pageerror, one visible recovery link, correct subject fallback 확인.

Regression test: direct URL error-boundary Playwright suite.

Rollback condition: valid deep-link resume/query behavior가 바뀌면 rollback.

Depends on: 없음

Expected user impact: 오래된 북마크/잘못 붙여넣은 URL에서 사용자가 막히지 않는다.

Confidence: 90

## GOLD-06

Priority: P2

Title: 확대된 유효 viewport에서 global 320px minimum이 만드는 horizontal overflow를 제거한다

Root cause: shared `html{min-width:320px}`가 확대 후 320px보다 작은 layout viewport를 강제로 넓힌다.

Confirmed symptoms: 320px/125% equivalent에서 전 subject/mode가 64px horizontal overflow; 360/375/390px에서도 각각 32/20/8px overflow.

Evidence: [320px 200% equivalent chemistry](evidence/TB-320-200-auto-chemistry.png), 300 raw overflow rows in [runtime matrix](evidence/runtime-probe-results.json).

Affected files: `assets/css/lobby-scene.css` and any shared global style that repeats the floor

Exact patch scope: document-level fixed minimum을 제거/완화하고, necessary child layout floors를 `min-width:0`로 국소화한다.

DO NOT TOUCH: 320px normal-mode visual hierarchy, toolbar modularization, desktop breakpoints.

Verification: CSS viewport 160/213/256/288/312/320 and base 320 at each device mode has `scrollWidth <= innerWidth + 1`; native Chrome UI zoom smoke로 최종 확인.

Regression test: responsive/zoom overflow matrix test.

Rollback condition: 320px base layout의 content collision, label splitting, or bottom-nav hit target regression.

Depends on: GOLD-01 breakpoint test should run in the same matrix

Expected user impact: 확대 사용자가 좌우로 스크롤하지 않고 핵심 조작을 볼 수 있다.

Confidence: 82

## GOLD-07

Priority: P0

Title: subject toolbar CSS의 소유권을 단일 모듈로 확정한다

Evidence status: STATIC-CONFIRMED

Root cause: subject-shell.css와 subject-toolbar의 layout/controls/responsive 모듈이 같은 toolbar selector를 함께 선언한다. 현재 표현은 stylesheet link 순서에 의존한다.

Evidence: audit/codex1-static-audit.md의 T02; subject-toolbar-layout.test.mjs는 새 entrypoint만 검사하고 기존 subject-shell.css의 중복 소유권은 막지 못한다.

Affected files: assets/css/subject-shell.css, assets/css/subject-toolbar/*.css, tests/subject-toolbar-layout.test.mjs

Exact patch scope: toolbar geometry·control·breakpoint 선언을 modular owner로 옮기고 shell 고유 layout만 남긴다. link/import 순서는 바꾸지 않는다.

Verification: Physics, Biology, Earth Science에서 320, 760, 940, 1366px computed-style matrix와 negative ownership test를 통과한다.

Rollback condition: 어떤 viewport에서든 기존 toolbar geometry가 달라지면 되돌린다.

Confidence: 96

## GOLD-08

Priority: P0

Title: toolbar mount의 무한 RAF polling과 listener 누수를 제거한다

Evidence status: STATIC-CONFIRMED

Root cause: subject-toolbar/mount.js는 필수 DOM이 없을 때 재귀 requestAnimationFrame을 계속 예약하고, bean update binding이 반환하는 cleanup을 보관하지 않는다.

Evidence: audit/codex1-static-audit.md의 T03; mount lifecycle source inspection.

Affected files: assets/js/subject-toolbar/mount.js, assets/js/subject-toolbar/beans.js, toolbar lifecycle tests

Exact patch scope: readiness 대기를 유한 횟수 또는 DOM-ready event로 바꾸고, destroy/dispose에서 listener를 해제한다.

Verification: 필수 node가 없는 fixture에서 finite failure, listener 0개, destroy 후 remount 성공을 확인한다.

Rollback condition: 정상 subject boot에서 toolbar가 mount되지 않으면 되돌린다.

Confidence: 91

## GOLD-09

Priority: P0

Title: Earth legacy quiz entry가 삭제된 module을 참조하지 않게 한다

Evidence status: TEST-CONFIRMED

Root cause: subjects/earth-science/quiz.html이 존재하지 않는 assets/js/earth-science-fossil-quiz.js를 import한다.

Evidence: Test-Path가 false를 반환했고 shared-science-game-core.test.mjs가 ENOENT로 실패한다. quiz.html의 legacy import도 직접 확인했다.

Affected files: subjects/earth-science/quiz.html, assets/js/subject-quiz-redirect.js, shared-science-game-core.test.mjs

Exact patch scope: legacy URL을 유지 관리되는 generic redirect 또는 canonical Earth game URL로 연결하고 테스트를 파일명이 아닌 실제 redirect 계약으로 갱신한다.

Verification: /subjects/earth-science/quiz.html이 module error 없이 canonical Earth training URL로 이동한다.

Rollback condition: 기존 Earth bookmark가 더 이상 정상 진입하지 않으면 되돌린다.

Confidence: 99

## GOLD-10

Priority: P1

Title: live Earth quiz registry와 테스트·smoke 목록을 동기화한다

Evidence status: TEST-CONFIRMED

Root cause: geologic-era jar가 live가 됐지만 두 Node test와 Earth smoke가 이전의 planned 상태/두 개 quiz만 가정한다.

Evidence: earth-science-fossil-quiz.test.mjs와 multiscience-architecture.test.mjs 모두 actual live/live/live와 expected live/live/planned의 불일치로 실패한다.

Affected files: data/subject-quizzes.js, tests/earth-science-fossil-quiz.test.mjs, tests/multiscience-architecture.test.mjs, scripts/smoke-earth-science-fossil-quizzes.mjs

Exact patch scope: registry를 기준으로 expectation을 도출하거나 모든 명시 목록을 세 번째 live training까지 갱신한다.

Verification: 모든 live non-Chemistry registry entry가 training mode·question source·browser smoke에 하나씩 연결되는 graph test를 통과한다.

Rollback condition: planned jar가 의도치 않게 launchable해지면 되돌린다.

Confidence: 98

## GOLD-11

Priority: P1

Title: non-Chemistry 문제 데이터도 Chemistry 수준의 schema/graph validation을 적용한다

Evidence status: STATIC-CONFIRMED

Root cause: createSubjectGameContent의 adapter validation은 필수값과 choice range만 확인하며 duplicate ID, blank choice, asset existence, live registry route consistency를 놓친다.

Evidence: audit/codex1-static-audit.md의 T07; docs/DATA_SCHEMA.md의 global uniqueness 계약과 현재 adapter 검사를 대조했다.

Affected files: data/subject-game-content.js, data/subject-quizzes.js, validation script, tests

Exact patch scope: 기존 question bank를 바꾸지 않고 공통 schema/graph validator와 malformed fixture를 추가한다.

Verification: duplicate IDs, empty labels, missing image, live entry missing implementation fixture가 각각 실패한다.

Rollback condition: 현재 유효한 Chemistry/Biology/Earth data가 validation에서 실패하면 되돌린다.

Confidence: 93

## GOLD-12

Priority: P1

Title: committed animation QA artifact를 source/manifest와 다시 동기화한다

Evidence status: TEST-CONFIRMED

Root cause: animation source 또는 manifest 변경 뒤 생성된 QA JSON/Markdown이 refresh되지 않았다.

Evidence: py scripts/audit-animation-assets.py --check-artifacts 및 animation-asset-pipeline.test.mjs가 animation-audit.json과 ANIMATION_AUDIT.md를 stale로 보고하며 실패한다.

Affected files: assets/art/game-scene-precision-v1/qa/animation-audit.json, assets/art/game-scene-precision-v1/qa/ANIMATION_AUDIT.md

Exact patch scope: 기존 generator를 실행해 reviewed artifact만 갱신한다. source asset이나 runtime scene code를 우회 수정하지 않는다.

Verification: audit script의 --check-artifacts와 animation asset pipeline test가 clean checkout에서 통과한다.

Rollback condition: 갱신물이 strict failure/warning 의미를 바꾸면 되돌린다.

Confidence: 99

## GOLD-13

Priority: P1

Title: asset cache-version test를 날짜 문자열 대신 cache boundary 계약으로 바꾼다

Evidence status: TEST-CONFIRMED

Root cause: tests/kongjwi-sprite-sheet-sizing.test.mjs와 tests/mobile-scene-regression.test.mjs가 예전 version literal을 hard-code한다.

Evidence: 현재 renderer는 20260814-kongjwi-outfits1을 사용하지만 두 테스트는 각각 20260812-rhythm-cadence2와 20260808-motion-polish1을 요구해 실패한다.

Affected files: tests/kongjwi-sprite-sheet-sizing.test.mjs, tests/mobile-scene-regression.test.mjs

Exact patch scope: versioned outer entry와 cross-file consistency를 검증하되 특정 날짜 suffix에는 의존하지 않도록 테스트만 변경한다.

Verification: valid version suffix 교체 fixture는 통과하고, version boundary가 없는 fixture는 실패한다.

Rollback condition: missing/duplicate cache boundary를 더 이상 탐지하지 못하면 되돌린다.

Confidence: 99

## GOLD-14

Priority: P1

Title: shop preview test를 현재 authored renderer 계약과 맞춘다

Evidence status: TEST-CONFIRMED

Root cause: shop renderer는 refreshed pour sheet/all-sprite preview를 사용하지만 shop-authored-kongjwi.test.mjs는 제거된 source-locked cutout mapping을 요구한다.

Evidence: shop-authored-kongjwi.test.mjs가 classic-red base-cutout mapping assertion에서 실패한다. audit/codex1-static-audit.md의 T10과 일치한다.

Affected files: tests/shop-authored-kongjwi.test.mjs, assets/js/shop-navigation.js, assets/css/shop-navigation.css

Exact patch scope: 현재 production renderer의 preview source를 canonical contract로 문서화하고 renderer/test/CSS fallback을 같은 source 기준으로 맞춘다. asset deletion과 price/storage 변경은 제외한다.

Verification: outfit별 실제 loaded image path, first-frame clipping, transparent background browser check를 통과한다.

Rollback condition: 현재 의도한 shop preview가 바뀌거나 보이지 않으면 되돌린다.

Confidence: 96

## GOLD-15

Priority: P1

Title: CI browser job에 cross-subject shell smoke를 포함한다

Evidence status: STATIC-CONFIRMED

Root cause: CI는 portal, lobby, shop, Earth quiz smoke를 실행하지만 모든 subject shell·settings·record isolation을 검사하는 existing smoke-subject-shells.mjs를 호출하지 않는다.

Evidence: .github/workflows/ci.yml command list와 scripts/smoke-subject-shells.mjs를 대조했다.

Affected files: .github/workflows/ci.yml

Exact patch scope: 기존 smoke command를 browser job에 추가한다. 초기 변경에서 production UI나 smoke의 assertion 자체는 바꾸지 않는다.

Verification: CI workflow가 해당 command를 실행하고 Chromium report가 생성된다.

Rollback condition: job timeout이면 coverage를 제거하지 않고 separate job으로 분리한다.

Confidence: 97

## GOLD-16

Priority: P1

Title: toolbar test에 exclusive ownership과 visual parity 계약을 추가한다

Evidence status: STATIC-CONFIRMED

Root cause: 기존 test는 새 entrypoint에 selector가 없는지만 보고, subject-shell.css의 중복 declaration과 Chemistry의 6-control mobile parity를 검증하지 않는다.

Evidence: audit/codex1-static-audit.md의 T12; 현재 subject-toolbar-layout.test.mjs 실행 결과는 통과하지만 T02의 selector duplication을 발견하지 못한다.

Affected files: tests/subject-toolbar-layout.test.mjs, browser toolbar smoke

Exact patch scope: intentional theme token은 허용하는 negative ownership assertion과 DOM/computed-style parity matrix를 추가한다.

Verification: duplicate selector fixture가 실패하고 Chemistry와 세 subject shell에서 mobile/desktop role count가 일치한다.

Rollback condition: subject theme customization까지 금지하는 과도한 assertion이면 되돌린다.

Confidence: 98

## GOLD-17

Priority: P1

Title: device-mode resolver와 breakpoint contract를 하나로 수렴한다

Evidence status: STATIC-CONFIRMED

Root cause: subject-shell.js가 device resolver를 재구현하고, device-entry·lobby-navigation·responsive CSS가 700/760/820/940의 서로 다른 threshold를 사용한다.

Evidence: audit/codex1-static-audit.md의 T13; GOLD-01에서 compact desktop navigation blackout도 재현됐다.

Affected files: assets/js/subject-shell.js, assets/js/device-entry.js, assets/js/lobby-navigation.js, responsive CSS/tests

Exact patch scope: device-entry를 single resolver로 정하고 기존 kongjuiya-device-mode value schema는 보존한다.

Verification: auto/forced modes를 760, 761, 820px 및 coarse pointer에서 Chemistry와 subject shell 모두 비교한다.

Rollback condition: 저장된 사용자 device preference가 first paint에 적용되지 않으면 되돌린다.

Confidence: 92

## GOLD-18

Priority: P1

Title: shared bean display를 GameStorage normalization과 same-tab update에 연결한다

Evidence status: STATIC-CONFIRMED

Root cause: subject toolbar가 legacy save JSON을 직접 parse하고 browser storage event만 구독해, corrupt save와 같은 탭의 구매 후 stale balance를 남길 수 있다.

Evidence: audit/codex1-static-audit.md의 T14; GameStorage가 migration/normalization owner인 반면 beans.js가 별도 parser를 갖는다.

Affected files: assets/js/subject-toolbar/beans.js, storage adapter, shop/game economy event surface, tests

Exact patch scope: read-only economy selector/event facade를 두고 existing STORAGE_KEY, migration version, balance semantics은 변경하지 않는다.

Verification: corrupt save, same-tab purchase, cross-tab update, storage.clear fixture가 shop/game/toolbar에서 같은 balance를 보인다.

Rollback condition: toolbar와 shop/game balance가 달라지면 되돌린다.

Confidence: 86

## GOLD-19

Priority: P2

Title: responsive shell 변경 전 viewport regression matrix를 CI에 고정한다

Evidence status: STATIC-CONFIRMED

Root cause: toolbar CSS, lobby CSS, device resolver의 breakpoint가 누적됐지만 320px, threshold edge, compact landscape, Chemistry-vs-shell을 함께 검사하는 matrix가 없다.

Evidence: audit/codex1-static-audit.md의 T17; GOLD-01과 GOLD-06이 각각 breakpoint blackout과 zoom overflow를 재현했다.

Affected files: browser smoke scripts, CI workflow, responsive CSS tests

Exact patch scope: 320x568, 375x667, 390x844, 760x800, 761x800, 820x800, 1366x768, compact landscape matrix를 먼저 추가한다.

Verification: navigation surface count, overflow, dialog bounds, focusable control visibility를 matrix assertion으로 기록한다.

Rollback condition: baseline visual decision 없이 screenshot/geometry가 바뀌면 되돌린다.

Confidence: 94

## GOLD-20

Priority: P2

Title: mobile transition 때 숨겨지는 native answer input의 focus를 visible keypad로 넘긴다

Evidence status: STATIC-CONFIRMED

Root cause: mobile-keypad.js가 native form/input을 hidden과 aria-hidden으로 전환하지만, 해당 input이 focused였을 때 visible keypad로 focus를 이동하지 않는다.

Evidence: audit/codex1-static-audit.md의 T19; hideNativeForm path에 focus handoff가 없다.

Affected files: assets/js/mobile-keypad.js, mobile game tests

Exact patch scope: 전환 직전에 native input이 focused인 경우에만 첫 의미 있는 keypad control로 focus를 옮기고 desktop reverse transition을 보존한다.

Verification: keyboard user input focus → forced mobile → visible/operable keypad focus와 reverse transition test를 통과한다.

Rollback condition: pointer user에게 불필요한 auto-focus가 발생하거나 countdown focus가 깨지면 되돌린다.

Confidence: 82

## 합산에서 제외하거나 병합한 후보

- T01은 GOLD-01과 같은 Chemistry navigation breakpoint 결함이므로 중복 집계하지 않았다.
- T04는 GOLD-01/GOLD-17의 CSS delivery·breakpoint 정리와 함께 다룬다.
- T15, T16, T18은 구조 개선 방향은 분명하지만 단일 최소 patch와 사용자 영향 검증이 부족해 Golden 20에서 보류한다.
- T20은 Node typeless-module warning을 재현했지만 repository 상위 package.json resolution까지 포함하는 tooling 결정이 필요해 별도 변경으로 분리한다.
