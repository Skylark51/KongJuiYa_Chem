# Codex 2 Runtime / UI / Integration / Adversarial Audit

## 기준과 방법

- 대상: `origin/main` 최신 `fd5eb30a2034513a1625a8f3851291f0e0bb116b` (2026-08-14 fetch 확인).
- 프로덕션 코드는 수정하지 않았다. 기존 미커밋 변경 `assets/js/kongjwi-dashboard.js`도 건드리지 않았다.
- `audit/codex1-static-audit.md`는 감사 시작 및 종료 시점 모두 존재하지 않았다. 따라서 Codex 1 TOP 20 판정은 **N/A — 입력 파일 부재**이며, 추정으로 보완하거나 동의하지 않았다.
- 로컬 정적 서버 `127.0.0.1:4173`와 headless Chromium/Playwright로 실행했다. 증거 원본은 [runtime-probe-results.json](evidence/runtime-probe-results.json), [adversarial-probe-results.json](evidence/adversarial-probe-results.json)에 남겼다.

## 조사 범위와 raw candidate ledger

1,140개의 툴바 atomic scenario를 실행했다: 4과목 × 19개 물리 폭(320, 360, 375, 390, 412, 430, 480, 600, 700, 701, 768, 820, 900, 940, 941, 1024, 1280, 1440, 1920) × 5개 확대(100/125/150/175/200) × auto/mobile/desktop. 확대는 물리 폭에 따른 유효 CSS viewport로 재현했다. 추가로 direct view 16개, 저장소 손상/구 스키마 5개, 저장소 차단 7개, 메뉴·설정·history·portal 36개, 다중 탭 3개, 퀴즈·상점·과목 간 GameCore 스모크를 실행했다. 즉 raw 후보 공간은 1,200개 이상이며, 아래 7개 장애 후보로 증상/원인을 압축했다.

통과한 주요 흐름:

- 메인 ↔ 화학 로비, 메인 ↔ 물리/생명/지구 shell, home/jars/records direct URL, invalid view의 home fallback.
- 화학 로비의 history back/forward/reload, category 복원, quick-start, 404/console 검사.
- 화학/생명/지구 shared GameCore: 정답/오답/timeout/fever/pause/restart/game-over/record 저장/이미지 질문/반응형.
- 상점의 4 subject theme, invalid/remembered subject fallback, reload.
- 손상된 game save, subject record, 구 스키마, invalid category/device mode는 정상 fallback.

오탐으로 제거한 예:

- 기존 `scripts/smoke-subject-shells.mjs`는 375px에서 상단 `.portal-return`이 보여야 한다고 실패한다. 실제 모바일 계약은 하단 Portal이며, 실제 하단 Portal은 auto/mobile 모드에서 동작한다. 이 스모크 기대값은 모바일 계약과 모순되므로 사용자 버그 후보에서 제거했다.
- 초기 툴바 측정의 “row overlap”은 숨겨진 desktop nav의 0×0 rect를 행 교차로 잘못 판정한 측정 오탐이었다. 증거 JSON에서는 보존하되 순위화에서 제거했다.
- `atomic-number`는 유효 training ID가 아니다. 실제 정상 URL `training=atomic_number`는 `running`, page error 0으로 검증했다.

## 압축된 runtime issue 후보

### C2-001 — 화학 툴바의 compact-desktop navigation blackout 및 forced-desktop Portal 누락

ID: C2-001

Scenario: compact desktop / forced desktop toolbar contract

Subject: 화학

Viewport: 768, 820, 900, 940, 941px; 390px forced desktop

Device mode: auto 및 forced desktop

Zoom: 100%; 125–200%에서도 유효 CSS 폭 768–980 구간으로 재현

Route: `/subjects/chemistry/?view=home`

Steps to reproduce:

1. 941×900, auto 또는 desktop mode로 화학 홈을 연다.
2. Home/Jars/Records/Shop 중 아무 메뉴로 이동하려 한다.
3. 별도로 390×844에서 device mode를 `desktop`으로 강제한다.

Actual: 768–980px에서는 `.desktop-tabs`가 `display:none`이고 하단 nav도 없어서 네 핵심 메뉴가 전부 사라진다. 941px auto/desktop 스크린샷에서 brand/actions만 남는다. 390px forced desktop은 폭 안전 규칙 때문에 하단 nav가 보이지만 `mobile-portal-link`는 `display:none`; Portal이 없다.

Expected: compact desktop은 `[Brand/Actions]` 첫 행과 `Home/Jars/Records/Shop` 둘째 행을 유지해야 한다. 폭 700px 이하에서는 forced desktop도 mobile-safe bottom nav 6개(Home/Jars/Records/Shop/Settings/Portal)를 보여야 한다.

Evidence: [941px auto](evidence/TB-941-100-auto-chemistry.png), [941px forced desktop](evidence/TB-941-100-desktop-chemistry.png), raw matrix의 17개 “desktop layout + no desktop nav + no mobile nav” 행, 그리고 390px forced desktop의 `desktop:none`, `mobile:grid`, `portal:none` runtime 측정.

Affected component: Chemistry master toolbar / responsive navigation

Affected file/symbol: `assets/css/lobby-scene.css` `@media(max-width:980px){.desktop-tabs{display:none}}`; `assets/css/subject-navigation.css`의 `html[data-device-layout="mobile"] .mobile-portal-link`

Severity: 5

Reproducibility: 5

Evidence quality: 5

Reach: 5

Fix confidence: 5

Regression risk: 3

Confidence: 98

Root-cause hypothesis: Chemistry만 subject toolbar parity의 compact policy를 쓰지 않고, 980px에서 desktop tabs를 숨긴 뒤 700px 전까지 대체 nav를 제공하지 않는다. Portal 표시도 device dataset만 조건으로 하여 폭 강제 fallback과 분리돼 있다.

Minimal patch: 모듈을 합치지 말고 Chemistry CSS에 701–940px compact grid/second-row tabs 규칙을 추가하고, `max-width:700px` fallback에서도 `.mobile-portal-link`를 표시·6열화한다.

Regression test: Playwright로 701/768/820/900/940/941px × auto/mobile/desktop에서 정확히 하나의 navigation surface와 4 desktop 또는 6 mobile control을 assert한다.

Related candidate: C2-008 (forced-desktop mobile Portal 누락; 동일 원인으로 통합)

### C2-002 — 화학 모바일 설정 dialog가 viewport 아래로 잘림

ID: C2-002

Scenario: dialog open on mobile

Subject: 화학

Viewport: 390×844

Device mode: auto/mobile

Zoom: 100%

Route: `/subjects/chemistry/?view=home|jars|records`

Steps to reproduce:

1. 어느 화학 view에서든 설정(⚙)을 연다.
2. dialog rect를 확인한다.

Actual: 세 view 모두 dialog rect가 `top=399.59`, `bottom=862.48`, `innerHeight=844`였다. 하단 18.48px가 viewport 밖으로 나가 저장/취소 영역 접근이 불안정하다.

Expected: open dialog의 전체 rect가 safe viewport 안에 있어야 하고, 내용이 길면 dialog 내부만 scroll되어야 한다.

Evidence: 세 view 반복 측정(동일 rect), [adversarial-probe-results.json](evidence/adversarial-probe-results.json)의 `DIALOG-mobile-chemistry`.

Affected component: Chemistry settings modal

Affected file/symbol: `assets/css/lobby-scene.css` `.modal-card`, `.modal-card form`; `subjects/chemistry/index.html#settingsDialog`

Severity: 4

Reproducibility: 5

Evidence quality: 5

Reach: 3

Fix confidence: 4

Regression risk: 2

Confidence: 94

Root-cause hypothesis: modal은 max-height만 제한하고 top-layer positioning/inset을 명시하지 않아 browser static placement가 viewport 중앙 제약을 만족하지 않는다.

Minimal patch: open `.modal-card`에 viewport-relative inset/margin과 `max-block-size`를 명시하고 form overflow를 내부에 한정한다. dialog HTML 구조는 유지한다.

Regression test: 320×568, 390×844, 844×390에서 settings를 열고 `rect.top >= 0`, `rect.bottom <= innerHeight` 및 저장/취소 button visibility를 assert한다.

Related candidate: C2-014 (modal clipping; 동일 증상으로 통합)

### C2-003 — localStorage/sessionStorage 차단 시 subject boot가 중단됨

ID: C2-003

Scenario: storage disabled / privacy-restricted browser

Subject: 화학, 물리, 생명과학, 지구과학; shop/game도 영향

Viewport: 390×844

Device mode: auto

Zoom: 100%

Route: 각 `/subjects/<subject>/`

Steps to reproduce:

1. `localStorage`와 `sessionStorage` getter가 `SecurityError("blocked")`를 throw하도록 만든다.

Actual: 네 subject 모두 `page:blocked`를 낸 뒤 ready marker가 설정되지 않아 timeout된다. shop/game도 blocked page error를 낸다.

Expected: persistence가 불가능해도 memory fallback으로 navigation과 quiz entry가 동작하고, 저장 불가만 비차단 상태로 처리해야 한다.

Evidence: [four subject screenshots](evidence/NOSTORE-chemistry.png), [physics](evidence/NOSTORE-physics.png), [biology](evidence/NOSTORE-biology.png), [earth-science](evidence/NOSTORE-earth-science.png); raw JSON의 `NOSTORE-*` timeout/page error.

Affected component: device preference/storage bootstrap

Affected file/symbol: `assets/js/device-entry.js#getDeviceMode`, `subjects/chemistry/index.html` early bootstrap, `subject-shell.js`, `shop.html`/game bootstrap storage reads

Severity: 4

Reproducibility: 5

Evidence quality: 5

Reach: 5

Fix confidence: 4

Regression risk: 3

Confidence: 93

Root-cause hypothesis: early `localStorage.getItem` calls are not uniformly protected; one SecurityError aborts module/inline initialization before existing persistence fallbacks can operate.

Minimal patch: a small safe storage accessor with no-op in-memory fallback을 entry path에만 적용하고 existing saved schema/migration은 바꾸지 않는다.

Regression test: injected throwing Storage를 사용해 portal, 4 subject, shop, valid quiz가 ready되고 console/page error 0인지 assert한다.

Related candidate: C2-019 (shop/game partial boot; 동일 root cause로 통합)

### C2-004 — 다른 탭의 record/device preference 변경이 열린 subject shell에 반영되지 않음

ID: C2-004

Scenario: multiple tabs + storage event

Subject: 생명과학 records, 물리 shell

Viewport: 1440×900

Device mode: desktop → external mobile change

Zoom: 100%

Route: `/subjects/biology/?view=records`, `/subjects/physics/`

Steps to reproduce:

1. Tab A에서 biology records를 열어 총 플레이 `0`을 확인한다.
2. 같은 origin의 Tab B에서 `kongjuiya:biology:records`에 한 record를 저장한다.
3. Tab A를 reload 없이 본다. 다음으로 Tab B에서 `kongjuiya-device-mode=mobile`을 저장한다.

Actual: Tab A record는 `0` 그대로이고 reload 후 `1`이 된다. 물리 Tab A의 `data-device-layout`은 `desktop` 그대로이며 reload 후에만 `mobile`이 된다. Wallet은 같은 시험에서 즉시 321로 갱신되어 storage event 자체가 막힌 것은 아니다.

Expected: 열린 records와 global device mode는 다른 탭의 저장 뒤 즉시 일관된 UI를 보여야 한다.

Evidence: [adversarial-probe-results.json](evidence/adversarial-probe-results.json)의 `MULTITAB-records` (`0 → 0 → reload 1`), `MULTITAB-device-mode` (`desktop → desktop → reload mobile`), `MULTITAB-wallet` pass.

Affected component: subject-shell runtime synchronization

Affected file/symbol: `assets/js/subject-shell.js` (storage listener 부재); device refresh path `assets/js/device-entry.js`

Severity: 3

Reproducibility: 5

Evidence quality: 5

Reach: 4

Fix confidence: 5

Regression risk: 2

Confidence: 91

Root-cause hypothesis: toolbar wallet만 `storage` event를 subscribe하며 subject shell의 record renderer와 device mode applicator는 subscribe하지 않는다.

Minimal patch: subject-specific record key, global device/audio/preference key에 좁은 storage listener를 추가하고 active view만 rerender/apply한다.

Regression test: shared BrowserContext 두 page로 record, category, device change 뒤 reload 없이 counters/layout이 갱신되는지 assert한다.

Related candidate: C2-021 (record stale), C2-022 (device stale)

### C2-005 — invalid quiz direct URL가 회복 경로 없는 오류 화면으로 남음

ID: C2-005

Scenario: invalid quiz / stale deep link

Subject: 화학, 생명과학, 지구과학

Viewport: 390×844

Device mode: auto

Zoom: 100%

Route: `/콩쥐야_줘때써.html?subject=<subject>&training=not-a-real-quiz`

Steps to reproduce:

1. 존재하지 않는 `training` query로 게임을 연다.

Actual: console에 `알 수 없는 장독대 ID` exception이 나오고, 이전 template의 “원자 번호” chrome과 “게임을 시작하지 못했습니다. 페이지를 새로고침해 주세요.”만 남는다. 돌아가기/장독대 선택 action이 없다. 반대로 유효 `training=atomic_number` URL은 running/error 0으로 확인했다.

Expected: invalid/stale URL는 subject jars 또는 선택 화면으로 안전히 되돌리고 사용자가 즉시 회복할 action을 제공해야 한다.

Evidence: [adversarial-probe-results.json](evidence/adversarial-probe-results.json)의 `GAMEURL-invalid-training-*`; 정상 `atomic_number` running/error 0 재확인.

Affected component: shared game entry error boundary

Affected file/symbol: `assets/js/ui-effects.js#initializeGamePage`, `assets/js/game-page.js`, game page result/error surface

Severity: 3

Reproducibility: 5

Evidence quality: 5

Reach: 3

Fix confidence: 5

Regression risk: 2

Confidence: 90

Root-cause hypothesis: training lookup exception은 잡지만 caller가 console error와 static error copy만 남기며 subject-aware recovery route를 render하지 않는다.

Minimal patch: validation failure를 non-throwing error state로 바꾸고 `subjects/<subject>/?view=jars` return button을 render한다. valid training selection policy는 변경하지 않는다.

Regression test: invalid subject/training/empty query가 no pageerror, one visible recovery link, normalized subject route를 만족하는지 assert한다.

Related candidate: C2-025 (invalid subject; 동일 recovery boundary)

### C2-006 — 확대 시 `html min-width:320px`가 수평 overflow를 강제함

ID: C2-006

Scenario: browser zoom accessibility / horizontal overflow

Subject: 네 과목

Viewport: 물리 320/360/375/390px

Device mode: auto/mobile/desktop

Zoom: 125–200% (유효 CSS viewport 방식)

Route: 각 subject home

Steps to reproduce:

1. 320px physical viewport를 125% 확대(유효 CSS 256px)해 연다.

Actual: `scrollWidth - innerWidth = 64px`; 360px/125%=32px, 375px/125%=20px, 390px/125%=8px다. 네 subject와 세 device mode 모두 동일하다. 원인은 공통 `html{min-width:320px}`와 정확히 일치한다.

Expected: 사용자가 요구한 확대 범위에서 viewport 폭보다 넓은 문서가 생성되지 않아야 한다.

Evidence: [320px 200% chemistry](evidence/TB-320-200-auto-chemistry.png), raw matrix 300 overflow 행. 이 검사는 native Chrome UI zoom 대신 동등한 유효 CSS viewport로 수행했으므로 실제 Chrome zoom으로 한 번 더 확인해야 한다.

Affected component: global responsive floor

Affected file/symbol: `assets/css/lobby-scene.css` `html{min-width:320px}` 및 subject가 공유하는 global CSS

Severity: 3

Reproducibility: 5

Evidence quality: 4

Reach: 5

Fix confidence: 3

Regression risk: 4

Confidence: 82

Root-cause hypothesis: fixed document minimum width가 zoom으로 줄어든 layout viewport보다 우선해 overflow를 만든다.

Minimal patch: fixed html minimum을 제거/완화하고, 실제 overflow 원소가 있으면 개별 container에 `min-width:0`을 적용한다. 320px 기본 layout은 유지한다.

Regression test: CSS viewport 160/213/256/288/312/320px와 normal 320px에서 `scrollWidth <= innerWidth + 1`을 assert하고 mobile nav label rect도 검사한다.

Related candidate: C2-028 (zoom overflow; native zoom confirmation 필요)

## Finalist 판정

| Candidate | 판정 | 사유 |
| --- | --- | --- |
| C2-001 | CONFIRMED | 네비게이션 surface가 실제로 0개인 compact desktop 구간을 반복 재현. |
| C2-002 | CONFIRMED | dialog bottom이 viewport를 18.48px 넘음. |
| C2-003 | CONFIRMED | 네 subject ready timeout과 SecurityError page error. |
| C2-004 | CONFIRMED | storage event 후 값이 stale, reload 후만 갱신. |
| C2-005 | CONFIRMED | invalid training에서 recoverable route 없음; valid route와 비교 확인. |
| C2-006 | PARTIALLY CONFIRMED | CSS-effective viewport에서 반복됨. 실제 Chrome UI zoom smoke가 추가로 필요. |
| stale mobile portal smoke | REJECTED | 제품은 하단 Portal을 제공; test expectation이 계약과 충돌. |

Codex 1 TOP 20: **NEEDS MORE EVIDENCE / N/A**. `audit/codex1-static-audit.md`가 없으므로 각 항목을 확인/반박할 대상이 없었다. 파일이 제공되면 이 runtime evidence에 항목별 verdict를 추가해야 한다.
