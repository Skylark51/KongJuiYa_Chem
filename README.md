# 콩쥐야 줘때써 · 과학 통합관

화학·물리학·생명과학·지구과학을 한 구조에서 확장하는 과학 학습 플랫폼입니다. 운영 중인 화학편의 장독대 게임과 저장 데이터는 그대로 유지합니다.

## 실행 구조

- Master portal: `index.html`
- Chemistry lobby: `subjects/chemistry/index.html`
- Subject shells: `subjects/{physics,biology,earth-science}/index.html`
- Game page: `콩쥐야_줘때써.html?training=atomic_number`
- Game bootstrap: `assets/js/game-page.js`, `assets/js/main.js`

## 주요 디렉터리

- `data/subjects.js`: 과목 이름, route, theme, 상태의 단일 레지스트리
- `assets/js/subject-portal.js`, `subject-shell.js`: 통합관과 공통 과목 셸
- `assets/js/subject-storage.js`: 신규 과목의 namespaced 저장소
- `assets/js`, `assets/css`: 공통 런타임과 화면 스타일
- `assets/art`, `assets/images`: production 이미지
- `data/questions`: 모드별 문제 데이터
- `data/training-modes.js`: 장독대 모드와 카테고리
- `tests`: Node regression tests
- `scripts`: validator와 Playwright smoke scripts
- `.github/workflows`: CI와 asset build workflows

## 로컬 실행

저장소 루트에서 정적 서버를 실행합니다.

```powershell
python -m http.server 4173
```

브라우저에서 `http://127.0.0.1:4173/`을 엽니다. ES module과 storage 동작 때문에 HTML 파일을 직접 열지 않습니다.

## 과목과 퀴즈 추가

새 과목의 route와 표시 정보는 `data/subjects.js`에 한 번만 등록합니다. 공통 화면은 `subject-shell.js`를 재사용하고 accent는 theme 변수로 지정합니다. 신규 과목의 기록·진도·카테고리는 `kongjuiya:<subject>:<segment>` 형식으로 분리합니다.

화학은 기존 `GameStorage`, `kongjuiya-training-category`, session key를 그대로 사용하며 자동 migration하지 않습니다. 퀴즈를 추가할 때는 해당 과목의 별도 data 모듈을 만들고 셸에 연결합니다. 물리·생명·지구과학에는 임시 문제나 가짜 기록을 넣지 않습니다.

예전 `/?view=home|jars|records` 링크는 같은 query를 유지해 화학 로비로 전달됩니다. query 없는 루트는 항상 과학 통합관을 표시합니다.

## 핵심 검증

```powershell
node scripts/validate-questions.mjs
node scripts/validate-layered-scene.mjs
$tests = Get-ChildItem tests -Filter '*.mjs' | ForEach-Object { $_.FullName }
node --test $tests
node scripts/test-metal-reactivity-route.mjs
```

Browser smoke에는 Playwright Chromium이 필요합니다. 통합 CI는 lobby/장독대 선택, quiz interface, layered scene smoke를 실행합니다.

## 데이터와 asset 원칙

문제 원본은 `data/questions/*.js`에 있습니다. 문제 수와 schema는 `scripts/validate-questions.mjs`의 계산 결과를 기준으로 합니다.

Production art는 원본 고화질 PNG를 사용합니다. PNG를 임의 압축하거나 WebP 등으로 변환하지 않습니다. Layered scene manifest에서 `availability: true`인 asset은 CI 필수이고, `false`는 아직 제작되지 않은 planned asset입니다.

## CI

`.github/workflows/ci.yml`은 모든 pull request와 `main` push에서 syntax, question/chemistry, game/storage/shop/keypad/scene regression, required scene assets, Chromium smoke를 통합 검증합니다.
