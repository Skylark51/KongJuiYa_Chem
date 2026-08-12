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
- `data/subject-quizzes.js`: 네 과목의 장독대 metadata registry. 화학은 기존 `training-modes.js` adapter를 사용합니다.
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

## 새 과목 퀴즈 추가

물리학·생명과학·지구과학은 `assets/js/subject-shell.js`와 `assets/css/subject-shell.css`를 공유합니다. 과목별 HTML이나 CSS를 복사하지 않습니다. 퀴즈 하나를 추가할 때는 다음 순서만 따르면 됩니다.

1. 해당 퀴즈의 구현 모듈 또는 게임 entry를 생성합니다.
2. `data/subject-quizzes.js`의 해당 과목 배열에 `id`, `title`, `category`, `description`, `implementation` metadata를 한 건 등록합니다.
3. 구현이 장독대 결과를 저장할 때 `new SubjectStorage("<subject-id>").write("records", records)` 형식을 사용합니다.
4. 해당 과목의 `?view=jars`를 열어 카드와 category filter 자동 노출을 확인합니다.
5. 장독대 실행, 결과 저장, `?view=records` 표시와 다른 과목 기록 미노출을 확인합니다.

과목 ID는 `chemistry`, `physics`, `biology`, `earth-science`입니다. 물리학은 `SUBJECT_QUIZZES.physics`, 생명과학은 `SUBJECT_QUIZZES.biology`, 지구과학은 `SUBJECT_QUIZZES["earth-science"]`에 등록합니다. 현재 세 배열은 의도적으로 비어 있으며 임시 문제를 포함하지 않습니다.

새 과목의 route와 표시 정보는 `data/subjects.js`에 한 번만 등록합니다. 공통 화면은 `subject-shell.js`를 재사용하고 accent는 theme CSS variable로 지정합니다. 신규 과목의 기록·진도·카테고리는 `kongjuiya:<subject>:<segment>` 형식으로 분리합니다.

화학은 기존 `GameStorage`, `kongjuiya-training-category`, session key를 그대로 사용하며 자동 migration하지 않습니다. `kongjuiya-device-mode`, `kongjuiya-audio-settings`, `kongjuiya-ui-preferences`, `kongjuiya-cosmetics-v1`은 공용입니다. records, progress, selected-category는 과목별 namespace입니다. 물리·생명·지구과학에는 임시 문제나 가짜 기록을 넣지 않습니다.

콩 상점은 전역 하나만 사용합니다. 신규 과목에서는 `shop.html?from=<subject-id>`로 진입하며, 상점의 홈·장독대·기록 링크가 출발 과목으로 돌아갑니다.

예전 `/?view=home|jars|records` 링크는 같은 query를 유지해 화학 로비로 전달됩니다. query 없는 루트는 항상 과학 통합관을 표시합니다.

## 핵심 검증

```powershell
node scripts/validate-questions.mjs
node scripts/validate-layered-scene.mjs
$tests = Get-ChildItem tests -Filter '*.mjs' | ForEach-Object { $_.FullName }
node --test $tests
node scripts/test-metal-reactivity-route.mjs
node scripts/smoke-subject-shells.mjs
```

Browser smoke에는 Playwright Chromium이 필요합니다. `smoke-subject-shells.mjs`는 통합관, 세 신규 과목, 빈 상태, 과목별 기록 격리, 상점 복귀와 지정된 모바일·태블릿·데스크톱 6개 viewport를 검사합니다.

## 데이터와 asset 원칙

문제 원본은 `data/questions/*.js`에 있습니다. 문제 수와 schema는 `scripts/validate-questions.mjs`의 계산 결과를 기준으로 합니다.

Production art는 원본 고화질 PNG를 사용합니다. PNG를 임의 압축하거나 WebP 등으로 변환하지 않습니다. Layered scene manifest에서 `availability: true`인 asset은 CI 필수이고, `false`는 아직 제작되지 않은 planned asset입니다.

## Global bean shop

The four subjects share the single shop at shop.html?subject=<subject-id>. Beans remain in the existing kongjuiya-chem-save store, while purchased and equipped cosmetics remain in kongjuiya-cosmetics-v1; no subject-specific inventory is created.

The URL subject has priority. If it is absent, the shop uses kongjuiya:last-subject, then safely falls back to chemistry. Only CSS variables and return navigation vary by subject; catalog data, prices, purchase logic, and equipment state stay global.

## CI

`.github/workflows/ci.yml`은 모든 pull request와 `main` push에서 syntax, question/chemistry, game/storage/shop/keypad/scene regression, required scene assets, Chromium smoke를 통합 검증합니다.
