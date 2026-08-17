# 콩쥐야 줘때써 - 화학편 구조

이 문서는 현재 `main`에서 실제 배포에 사용되는 구조와 책임 경계를 기록한다.
과거 photoreal 단일 합성 장면이나 `scene-art-loader.js` 기반 시도는 현재 아키텍처가 아니다.
세부 구현이 이 문서와 충돌하면 `docs/ARCHITECTURE.md`, `assets/그림/게임-장면/manifest.json`, 현재 런타임 코드를 우선한다.

## 화면 진입점

- `index.html`: 홈, 장독대 선택, 기록 화면
- `shop.html`: 콩 상점
- `콩쥐야_줘때써.html`: 문제풀이 게임
- `assets/js/game-page.js`: 게임 페이지의 최상위 bootstrap 및 페이지 전용 side effect

## 게임 코어와 데이터

- `data/training-modes.js`: 26개 훈련 모드, 카테고리, 모드별 규칙
- `data/questions/**`: 모드별 문제 원본
- `data/questions/index.js`: 문제 bank registry와 schema validation
- `assets/js/question-engine.js`: 출제, 재출제, 정답 정규화·판정
- `assets/js/game-core.js`: 물, 시간, 점수, 콤보, 피버, 종료 상태
- `assets/js/storage.js`: schema v5 저장·migration·기록·경제·일일 미션
- `assets/js/main.js`: 게임 엔진 조립과 실행 루프

문항 내용, 지정 화학 값, 점수·물·콤보 규칙은 장면/UI 리팩터링과 분리한다.

## 로비와 상점

- `assets/js/lobby-actions.js`: 장독대 카드, 카테고리 유지, 미션, 강화
- `assets/js/lobby-navigation.js`: 로비 view routing
- `assets/js/shop.js`: 상점 목록, 구매, 장착, 미리보기
- `assets/js/cosmetic-system.js`: 구매·장착 영속성과 visual key 변환
- `data/shop-catalog.js`: 상점 품목과 가격의 원본

## 퀴즈 장면 아키텍처

현재 production 장면은 **한 장의 합성 원화가 아니라 manifest 기반 독립 PNG 레이어**다.

- `assets/그림/게임-장면/manifest.json`: 논리 해상도, layer 순서, asset 경로, 기본 placement, anchor, frame sequence의 기준
- `assets/js/game-cosmetics-entry.js`: 저장된 코스메틱과 장면 렌더러 연결
- `assets/js/scene-renderer.js`: manifest를 읽어 한 개의 `#layeredScene`을 구성하고 PNG/sprite layer를 배치
- `assets/js/scene-state-machine.js`: 정답·오답·피버·경고·일시정지에 따른 장면 상태 전이
- `assets/js/scene-cosmetic-effects.js`: 장착 코스메틱의 제한된 부가 효과
- `assets/js/court-servant-effect.js`: 야화 궁중복의 특수 하인 동작 mount/trigger

논리 캔버스는 `2048 x 1152`이며 PC와 모바일 모두 같은 좌표계를 `uniform-contain`으로 축소·확대한다.
기본 actor 위치와 크기는 manifest가 소유한다. CSS는 원본 종횡비 보존, clipping, responsive layout delta, effect corridor 같은 표시 경계만 담당한다.

## 장면 PNG 계약

Production art는 원본 RGBA PNG를 사용하며 JPEG/WebP/Base64 변환으로 대체하지 않는다.

- 콩쥐: `assets/그림/게임-장면/콩쥐/<skin>/pour-sheet.png`, `4096 x 768`, 8개의 `512 x 768` cell
- 바가지: `assets/그림/게임-장면/바가지/<skin>/pour-sheet.png`, `4096 x 768`, 콩쥐와 co-registered
- 장독대: `assets/그림/게임-장면/장독대/<skin>/layers.png`, `2048 x 1024`, back/front 2 cell
- 물줄기·물보라·누수·수면: `assets/그림/게임-장면/효과/**`
- 전경: `assets/그림/게임-장면/배경/야간-장독대-마당-전경.png`

`manifest.json`의 `availability: true`는 production 필수 asset이고 `false`는 아직 authored asset이 준비되지 않아 fallback을 허용하는 상태다.
Fallback은 임시 호환 경로이지 최종 미술 방향을 대체하지 않는다.

PNG 검증은 signature/IHDR만 확인하지 않는다. `scripts/validate-layered-scene.mjs`가 각 chunk의 선언 길이, terminal `IEND`, trailing data 유무까지 검사하며 production asset에는 RGBA 8-bit 이상을 요구한다.

## 스타일 책임

게임 페이지는 개별 보정 CSS를 HTML에서 직접 나열하지 않고 세 개의 안정적인 stylesheet entrypoint만 노출한다.

- `assets/css/game-runtime-base.css`: 기본 UI, 반응형 shell, keypad, mode-specific base 스타일을 기존 cascade 순서대로 묶는 진입점
- `assets/css/game-asset-animation.css`: layer/sprite 기본 렌더링과 상태 애니메이션. `scene-renderer.js`의 readiness contract 때문에 직접 `<link>`로 유지
- `assets/css/game-runtime-features.css`: 두꺼비·장면 composition, 오디오, 결과 패널, countdown 같은 feature 스타일 진입점
- `assets/css/layered-scene-runtime.css`: layered scene의 최종 layout/cascade boundary
- `assets/css/scene-source-aspect-fix.css`: 원본 PNG 비율 보호와 공통 water corridor calibration
- `assets/css/scene-motion-polish.css`: 장착 도구·의상별 제한된 효과
- `assets/css/court-servant-effect.css`: 야화 궁중복 하인 효과의 정적 스타일
- 나머지 mode-specific CSS: 특정 문제 입력 형식 또는 좁은 responsive 보정만 담당

`assets/css/kongjwi-parts.css`는 파츠 합성기와 대시보드 미리보기용이며 현재 게임 scene renderer의 런타임 stylesheet가 아니다.

JavaScript가 임시 `<style>` 요소를 주입하여 최종 geometry를 덮어쓰지 않는다. 재발 방지를 위해 architecture boundary regression test를 유지한다.

## 특수 효과와 미완성 authored asset

야화 궁중복의 하인 동작은 현재 별도 효과 모듈로 격리되어 있다. 현재 하인 캐릭터 이미지는 별도 돌쇠 원화가 준비될 때까지 기존 작업복 캐릭터를 임시 fallback으로 사용한다. 최종 방향은 **독립 고품질 돌쇠 PNG/프레임을 추가하고 orchestration 코드는 그대로 유지한 채 source만 교체하는 것**이다.

공유 두꺼비 표정 overlay PNG는 현재 chunk가 손상된 authored source이므로 manifest에서 비활성 상태를 유지한다. 프리미엄 두꺼비는 안전한 `skin-motion` 경로를 계속 사용한다. 신형 야간 배경 역시 manifest에서 planned/fallback 상태이며 fallback을 최종 결과로 간주하지 않는다.

## 검증

- `node scripts/validate-questions.mjs`
- `node scripts/validate-layered-scene.mjs`
- `node --test tests/*.mjs`
- `node scripts/test-metal-reactivity-route.mjs`
- Playwright lobby/quiz/layered-scene smoke

CI가 green이라는 것은 현재 fallback을 포함한 production 경로가 깨지지 않았다는 뜻이며, 모든 planned 미술 asset이 완성됐다는 뜻은 아니다.

## 변경 금지 영역

UI·장면 구조 정리만을 목적으로 다음 의미를 임의 변경하지 않는다.

- `data/questions/**`의 문제와 정답
- 프로젝트 지정 화학 값
- `QuestionEngine` 판정 규칙
- 점수·물·콤보 핵심 규칙
- 기존 저장 데이터의 의미와 migration 계약
- 상점 가격과 기존 구매 기록
