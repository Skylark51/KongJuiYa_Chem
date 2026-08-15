# Codex 1 Static Architecture / Data Integrity Audit

Audit target: `Skylark51/KongJuiYa_Chem` at `fd5eb30a2034513a1625a8f3851291f0e0bb116b` (`origin/main`, fetched and fast-forwarded on 2026-08-14). No production source, data, asset, or schema was changed. The pre-existing user edit to `assets/js/kongjwi-dashboard.js` was preserved.

## Method, scope, and inventory

- Static inventory: 253 HTML/CSS/JS/MJS/JSON files; 395 files under `assets`; 45 under `data`; 7 under `subjects`; 47 tests; 23 scripts.
- Traversed page entrypoints, registries, state/storage, shop/economy, scene and audio runtime, CSS ownership, static assets/manifests, workflow, test and browser-smoke scripts.
- Required baseline checks: `scripts/validate-questions.mjs` passed (637 Chemistry questions, 0 errors); metal-reactivity route passed; layered-scene validation found 31/32 authored PNGs present, one explicitly planned background and one explicitly disabled truncated overlay.
- Full Node suite did **not** pass: 156/165 passed; 9 failed. The failures are evidence, not inferred defects.
- Priority formula: `Severity + Reproducibility + Evidence quality + Reach + Fix confidence - Regression risk` (range normally 0–25).

The requested toolbar split is treated as the intended contract: parity CSS entrypoint only; `layout.css` geometry only; `controls.css` control visuals only; `responsive.css` breakpoints only; JS bootstrap/nodes/chemistry-contract/beans/mount separated as specified. Chemistry is the UX master, not a reason to reintroduce legacy ownership into the other subjects.

## Evidence index

- **E1** `node --test tests/*.mjs`: 9 failures: stale animation QA artifacts; missing `earth-science-fossil-quiz.js` in three tests; Earth registry expected planned but now live in two tests; stale game/scene cache-key assertions; stale shop artwork assertion.
- **E2** `subjects/earth-science/quiz.html:15` loads the deleted `assets/js/earth-science-fossil-quiz.js`; commit `f7f7bd5` deleted it.
- **E3** `subjects/chemistry/index.html:34` forces five mobile columns while its mobile nav at line 146 has six controls; shared shells use six in `subject-toolbar/responsive.css:17,31`.
- **E4** `assets/css/subject-shell.css:11-15,30-33` owns all toolbar selectors also owned by `subject-toolbar/{layout,controls,responsive}.css`.
- **E5** `assets/js/lobby-navigation.js:15-35` dynamically appends three CSS files; Chemistry already statically loads `mobile-fixed-shell.css` at `subjects/chemistry/index.html:31`, but without the data marker used for de-duplication.
- **E6** `assets/js/subject-toolbar/mount.js:27-33` retries forever via `requestAnimationFrame`; `bindSharedBeanUpdates` returns cleanup but mount discards it.
- **E7** `data/subject-game-content.js:129-138` validates only missing id/training/choice range; it does not reject duplicate ids, duplicate mode ids, empty choice text, assets, or registry-to-runtime drift.
- **E8** `scripts/audit-animation-assets.py --check-artifacts` reproduces stale `animation-audit.json` and `ANIMATION_AUDIT.md` without writing.
- **E9** `assets/js/shop-navigation.js:35-48` has new all-outfit sprite mapping, while `tests/shop-authored-kongjwi.test.mjs` still requires old static cutouts and a single sprite outfit.
- **E10** `assets/js/device-entry.js` and `assets/js/subject-shell.js:58-65` independently implement device-layout resolution; only the former emits `ui:device-mode` and viewport tokens.

## Raw candidate catalog (250)

Field order in every record: **ID; Category; Severity; File; Line / Symbol; Trigger; Observed defect or risk; Expected contract; Root-cause hypothesis; Evidence; User-visible impact; Blast radius; Reproducibility; Evidence quality; Reach; Fix confidence; Regression risk; Confidence; Priority; Minimal fix; Regression test; Related candidates.** `R/E/Q/F/Risk` is the ordered numeric tuple for Reproducibility/Evidence quality/Reach/Fix confidence/Regression risk. `LC` means low-confidence: a traceable static concern, not a confirmed production defect.

### Confirmed or high-evidence candidates

```text
C1-001; Cross-subject mobile UX; 5; subjects/chemistry/index.html; 34,146; mobile layout; six controls placed in five columns; all four subjects keep one shared hierarchy; legacy Chemistry nav grid was not updated; E3; portal item wraps/overlaps content; Chemistry mobile; 5/5/5/5/2; 98; 18; make Chemistry grid and bottom reserve six-item contract; Playwright 320/375/390 one-row nav; C1-002,C1-004,C1-016
C1-002; CSS ownership; 5; assets/css/subject-shell.css; 11-15,30-33; any subject shell; shell and toolbar modules own same selectors; toolbar modules are sole toolbar owners; refactor left prior rules in shell; E4; order-dependent toolbar rendering; physics/biology/earth; 5/5/5/4/3; 96; 16; remove/move only duplicate toolbar rules from shell; selector-ownership static test plus visual smoke; C1-001,C1-003,C1-004
C1-003; CSS architecture; 4; assets/css/subject-toolbar/*.css; layout/controls/responsive; import-order change; canonical modules override legacy shell values accidentally; each layer has exclusive responsibility; incomplete extraction; E4; future change can regress geometry/visuals; all shells; 4/5/5/4/3; 93; 15; assert selector/property ownership by file; stylesheet-order mutation test; C1-002,C1-005
C1-004; Cross-subject architecture; 4; subjects/chemistry/index.html; 28-34; Chemistry mobile; large inline forced-mobile stylesheet bypasses toolbar modules; Chemistry master should be reference through a canonical contract; legacy hotfix persisted; E3,E5; Chemistry drifts from three shells; Chemistry/mobile; 5/5/5/3/4; 92; 14; migrate only toolbar portions to canonical owners later; computed-style parity test; C1-001,C1-002,C1-005
C1-005; Toolbar contract coupling; 4; assets/js/subject-toolbar/chemistry-contract.js; applyChemistryToolbarClassContract; mount parity; other subjects receive legacy Chemistry class names; master contract should be semantic, not legacy cascade coupling; class-level compatibility bridge; E4; hidden dependencies on lobby CSS/class naming; all future subjects; 4/5/5/3/3; 90; 14; expose semantic tokens/classes and retire bridge after parity; forbid legacy classes in shell DOM test; C1-002,C1-003
C1-006; Runtime lifecycle; 4; assets/js/subject-toolbar/mount.js; startSubjectToolbarParity; missing root or failed shell; unbounded RAF retry has no timeout/cancel/error state; bootstrap must fail boundedly; polling used for module ordering; E6; CPU loop and opaque broken toolbar; three shell pages; 4/5/4/4/2; 91; 15; DOMContentLoaded/readiness event plus bounded diagnostic; unit fake RAF cancellation test; C1-007,C1-008
C1-007; Runtime lifecycle; 3; assets/js/subject-toolbar/mount.js; 21; repeat mount; storage cleanup function is discarded; mount must own teardown; lifecycle API incomplete; E6; duplicate storage listeners in remount/test shell; toolbar consumers; 3/5/3/4/2; 84; 13; retain disposer and export destroy; listener-count remount test; C1-006,C1-008
C1-008; DOM discovery; 3; assets/js/subject-toolbar/nodes.js; shopLink/mobilePortal; markup reorder; first desktop anchor and last mobile anchor are positional contracts; nodes must use explicit role/data selectors; expedient discovery; static source; wrong shop/portal association after nav changes; toolbar; 3/4/4/4/2; 82; 13; add data-toolbar-role attributes; reordered-markup test; C1-006,C1-005
C1-009; Device-state ownership; 4; assets/js/subject-shell.js; applyDeviceMode; subject settings; duplicate device resolver omits viewport tokens/event dispatch; one shared device service; parallel implementation during shell creation; E10; subjects behave differently after device preference changes; three shells; 4/5/4/4/3; 89; 14; use device-entry API from shell; cross-page device-mode event test; C1-010,C1-011
C1-010; CSS loading; 4; assets/js/lobby-navigation.js; appendStylesheet; Chemistry load; `mobile-fixed-shell.css` loads statically and dynamically with different query; one static entrypoint/load; data-marker de-dupe misses normal link; E5; duplicate request and late cascade winner; Chemistry lobby; 5/5/4/5/2; 96; 16; keep a single declared entrypoint or detect href; request-count browser test; C1-004,C1-012
C1-011; CSS loading; 3; assets/js/lobby-navigation.js; installMobileUi; desktop lobby; three mobile styles always append, irrespective of viewport; responsive policy should be declarative/lazy; runtime stylesheet pattern; E5; needless parse/request and order-dependent desktop CSS; Chemistry lobby; 5/5/3/4/2; 90; 15; static media links or lazy only on match; desktop network/CSS-link test; C1-010,C1-012
C1-012; CSS ownership; 4; assets/css/mobile-*.css,lobby-*.css; mobile-bottom-nav; mobile Chemistry; many stylesheets own same nav including inline override; one component owner; patch-stack evolution; E3,E5; cascade conflicts and fragile fixes; Chemistry mobile; 5/5/4/3/4; 91; 13; inventory rules and nominate one navigation stylesheet; computed CSS parity test; C1-001,C1-004,C1-010
C1-013; Broken legacy route; 5; subjects/earth-science/quiz.html; 15; direct quiz.html visit; deleted module is still requested, so redirect never executes; legacy route must redirect or be removed safely; f7 refactor deleted bridge without entry update; E1,E2; blank redirect page/module 404; Earth direct links/bookmarks; 5/5/4/5/1; 99; 18; point page at shared redirect or direct canonical URL; browser direct-route test; C1-014,C1-015
C1-014; Test integrity; 4; tests/cross-subject-parity.test.mjs; 24-28; CI; test reads deleted Earth bridge; test must represent canonical runtime; refactor did not update test; E1,E2; CI red though implementation changed; CI; 5/5/4/5/1; 99; 17; test subject redirect contract instead of deleted filename; targeted Node test; C1-013,C1-015
C1-015; Test integrity; 4; tests/shared-science-game-core.test.mjs,earth-science-fossil-quiz.test.mjs; Earth runner checks; CI; two more stale deleted-module assertions; all authoritative paths must be tested; transition incomplete; E1,E2; CI remains unusable; CI/content; 5/5/4/5/1; 99; 17; replace with generic game route and direct quiz legacy test; Node+browser test; C1-013,C1-014
C1-016; Registry/runtime drift; 4; data/subject-quizzes.js; earth geologic jar; CI; status changed planned→live but tests and smoke still cover only first two; live registry must have runner and coverage; feature addition not propagated; E1; third live jar lacks route-level confidence; Earth; 4/5/4/4/2; 93; 15; assert every live registry entry against game content and smoke it; generated registry coverage test; C1-013,C1-017
C1-017; Test coverage; 3; scripts/smoke-earth-science-fossil-quizzes.mjs; trainingIds; CI; live `earth-geologic-era-keywords` omitted; every live non-Chemistry quiz needs smoke; list is manually maintained; E1; regressions invisible until user opens third jar; Earth; 4/5/3/5/2; 91; 15; derive IDs from registry or add third ID; CI browser smoke; C1-016,C1-018
C1-018; Data validation; 4; data/subject-game-content.js; validateContent; content load; no duplicate ids/modes, empty labels, assets, status/registry or subject checks; all runtime data must validate as a graph; narrow adapter validator; E7; malformed new-subject content can ship; Biology/Earth/future Physics; 4/5/5/4/2; 93; 16; shared strict schema + registry graph validator; corruption fixture matrix; C1-016,C1-019
C1-019; Data integrity; 3; data/subject-game-content.js; createSubjectGameContent; duplicate IDs; duplicates can overwrite selection behavior without validation; global question-id uniqueness contract; Chemistry-only validator assumed; E7; wrong question/replay metrics; all subjects; 3/5/4/4/2; 87; 14; reject duplicate question and mode ids; duplicate fixture test; C1-018,C1-020
C1-020; Data integrity; 3; data/subject-game-content.js; validateContent; source-image content; no file/URL or nonblank choice validation for non-Chemistry; live question data must be renderable; adapter validates range only; E7; blank buttons/broken image can ship; Bio/Earth; 3/5/4/4/2; 86; 14; validate choice strings/presentation assets; invalid fixture test; C1-018,C1-019
C1-021; QA artifact integrity; 4; assets/art/game-scene-precision-v1/qa; generated audit; CI; committed deterministic JSON/MD stale; committed QA must equal current manifest/assets; asset change lacked generation step; E1,E8; CI permanently red, audit untrustworthy; asset pipeline; 5/5/4/5/2; 98; 17; regenerate reviewed QA artifacts in dedicated change; `--check-artifacts` gate; C1-022,C1-023
C1-022; CI design; 3; tests/animation-asset-pipeline.test.mjs; 95-103; asset update; check detects stale artifacts but workflow has no producer/documented precommit path; QA contract needs owned refresh workflow; generation/commit split is implicit; E1,E8; recurring CI breakage; asset contributors; 5/5/3/4/2; 91; 15; add explicit regeneration command/CI guidance; clean-tree regenerate/check test; C1-021,C1-023
C1-023; Asset provenance; 2; assets/art/game-scene/manifest.json; planned/disabled entries; release; one planned BG and disabled truncated expression overlay remain in active manifest; availability must distinguish production readiness; intentional fallback but debt is live; validation output; fallback may hide accidental activation; scene assets; 3/5/3/3/3; 78; 11; document release gate/explicit feature flag; manifest-state contract test; C1-021,C1-024
C1-024; Test fragility; 3; tests/kongjwi-sprite-sheet-sizing.test.mjs,mobile-scene-regression.test.mjs; exact cache values; legitimate cache bump; tests hard-code old dated query tokens; test semantic cache boundary, not date; assertion overfits releases; E1; two false-red CI failures; CI/game scene; 5/5/4/5/1; 98; 18; assert one versioned entry/current source consistency; cache-bump mutation test; C1-025,C1-021
C1-025; Shop contract drift; 4; tests/shop-authored-kongjwi.test.mjs; asset map; CI; test requires removed static paths/one sprite while renderer changed all sprites; test and renderer asset contract diverged; f16 change not propagated; E1,E9; CI red and renderer intent ambiguous; shop/assets; 5/5/4/4/2; 95; 15; update one canonical manifest-driven shop-art assertion; shop rendered-image smoke; C1-026,C1-024
```

### Evidence-backed medium-confidence candidates

```text
C1-026; Shop asset architecture; 3; assets/js/shop-navigation.js; OUTFIT_ART/OUTFIT_SPRITE_KEYS; preview changes; asset mapping duplicated in code and test, not manifest; canonical art source should be data-owned; E9; preview/runtime drift risk; shop/game scene; 4/5/4/3/3; 85; 13; derive mapping from manifest/catalog; mapping parity test; C1-025,C1-027
C1-027; Asset rendering; 3; assets/css/shop-navigation.css; shop-asset-outfit fallback; authored image mount; legacy SVG background remains under new PNG image; one visual source per card; compatibility background not retired; static CSS; possible double/incorrect transparent preview; shop outfits; 3/4/3/3/3; 72; 10; scope fallback to no-image state; screenshot transparency test; C1-025,C1-026
C1-028; Dead code; 2; assets/js/shop.js; module; repository inventory; second full shop implementation is not referenced by shop.html; one production shop owner; replacement left tracked; rg entrypoint search; maintenance edits can target dead implementation; shop; 5/4/3/4/2; 84; 14; document/remove only after migration review; entrypoint reachability test; C1-029,C1-030
C1-029; Dead code; 2; assets/js/action-effects.js; initActionEffects; repository inventory; exported effects controller has no production caller; reachable code should be intentional; abandoned runtime; rg import search; fixes/tests may target unused effects; game; 4/4/2/3/2; 74; 11; either wire through game entry or mark/remove after review; import-reachability test; C1-028,C1-031
C1-030; Dead code; 2; assets/js/shop-outfit-cutout.js; module bootstrap; shop load; obsolete canvas cutout observer remains tracked but tests say it must not load; obsolete compatibility code should be isolated; past fallback retained; test/source search; future accidental import is expensive; shop; 4/4/3/4/2; 80; 13; archive/delete only in separately approved change; forbidden-import test; C1-028,C1-027
C1-031; Runtime lifecycle; 2; assets/js/action-effects.js; initActionEffects.destroy; future wiring; global event listeners added with bare addEventListener but destroy removes only observer/DOM; destroy must undo all subscriptions; incomplete controller lifecycle; source inspection; duplicate effects if mounted twice; game future; 3/4/3/4/2; 78; 12; store/removal functions; listener-count unit test; C1-029,C1-032
C1-032; Runtime lifecycle; 2; assets/js/records-enhancements.js; installRecordObserver; lobby remount; MutationObserver is never returned/disconnected; mountable enhancement needs cleanup; side-effect module design; source inspection; duplicate observers in partial navigation/tests; Chemistry lobby; 3/4/3/3/2; 73; 11; export mount/destroy; remount observer test; C1-033,C1-034
C1-033; CSS ownership; 3; assets/js/records-enhancements.js; ensureStylesheet; lobby import; feature injects its CSS dynamically; CSS should use declared entrypoint; side-effect enhancement; source inspection; load-order/caching ambiguity; records lobby; 4/4/3/4/2; 83; 13; declare stylesheet in lobby entrypoint; CSS-link inventory test; C1-010,C1-034
C1-034; CSS ownership; 3; assets/js/theme-system.js; ensureJarPhotoStyle; lobby imports; theme library injects large style tag; presentation belongs in static CSS; historical patch; source inspection; theme behavior depends on import order; Chemistry jars; 4/4/3/3/3; 79; 11; move rules to stylesheet; no-style-tag production test; C1-033,C1-035
C1-035; CSS ownership; 3; assets/js/metal-reactivity-choice-ui.js; runtime style append; every game boot; normal production module injects CSS although only one mode needs it; static CSS owner bypassed; source inspection/main import; mode-specific cascade hard to audit; game; 4/4/3/3/3; 79; 11; static mode stylesheet or scoped lazy module; style-node ownership test; C1-034,C1-036
C1-036; Runtime CSS; 2; assets/js/scene-renderer.js; ensureRuntimeStylesheet; scene boot; runtime can append a stylesheet already statically linked by game HTML; one entrypoint should own link; defensive duplicate loader; source inspection; races/duplicate load if page contract changes; game scene; 3/4/3/3/2; 72; 11; make HTML or renderer sole owner; CSS-link count test; C1-035,C1-010
C1-037; State schema; 3; assets/js/subject-toolbar/beans.js; readSharedBeans; corrupt save; toolbar bypasses GameStorage migration/normalization and silently shows zero; shared economy must have one reader; convenience direct parse; E6; false zero bean balance; non-Chemistry toolbar; 4/5/4/3/3; 86; 13; expose safe economy selector from storage; corrupt-save toolbar test; C1-038,C1-039
C1-038; State integrity; 3; assets/js/subject-shell.js; settings close handler; storage unavailable; raw localStorage writes are not guarded while initial write is; settings must degrade safely; inconsistent error handling; source inspection; saving settings can throw/leave dialog flow; three shells; 3/4/3/4/2; 77; 12; wrap and notify/fallback; throwing-storage test; C1-037,C1-040
C1-039; Shared economy; 3; assets/js/storage.js,subject-game-storage.js; GameStorage delegation; subject play; global beans use Chemistry-named save while records are subject-local; explicit shared-economy contract needed; legacy compatibility design; E7; migration/account boundaries hard to evolve; all subjects/shop; 3/5/5/2/4; 79; 9; document adapter facade before any migration; cross-subject purchase/run test; C1-037,C1-040
C1-040; Settings state; 3; assets/js/game-bgm.js,storage.js,subject-shell.js; audio keys; change volume; GameStorage `settings.volume` and `kongjuiya-audio-settings` coexist; one authoritative audio schema expected; incremental audio refactor; source inspection; lobby/game volumes can disagree; all pages; 3/4/4/3/3; 80; 11; define source-of-truth/read-through migration; cross-page audio persistence test; C1-038,C1-039
C1-041; Storage migration; 2; assets/js/subject-storage.js; SubjectStorage; future schema change; new subject JSON namespaces have no version/migration path; durable records need versioning; first-pass implementation; source inspection; corrupt/old records silently fallback; Bio/Earth/Physics; 2/4/3/3/3; 68; 9; version envelope/migrator design; old-schema fixture test; C1-042,C1-043
C1-042; Storage validation; 2; assets/js/subject-storage.js; read; corrupt values; accepts any parsed shape as records/current-run; read boundary should validate shape; JSON-only guard; source inspection; NaN/invalid UI records possible; subject records; 3/4/3/3/2; 72; 11; schema normalize record arrays; corrupt-shape test; C1-041,C1-043
C1-043; State synchronization; 2; assets/js/subject-shell.js; renderRecords; cross-tab changes; shell does not subscribe to storage events for per-subject records; live records should refresh or state explicit; one-tab assumption; source inspection; stale record dashboard in second tab; three shells; 3/4/3/3/2; 72; 11; storage listener or refresh lifecycle; two-context test; C1-007,C1-042
C1-044; Subject status integrity; 2; data/subjects.js,data/subject-quizzes.js; physics; portal open; Physics advertises `ready` while registry/content are empty; status semantics must match playable offering; shell completion ahead of content; source inspection/tests confirm empty; confusing empty hall; Physics; 5/5/2/4/1; 86; 15; distinguish shell-ready/content-planned; portal copy test; C1-045,C1-046
C1-045; Registry integrity; 2; data/subject-quizzes.js; categoriesForSubject; Biology; declared category can contain only planned jars; category should state planned explicitly; categories merged blindly; source inspection; user filters to empty state; Biology; 4/4/2/3/1; 74; 12; annotate planned categories/counts; category status test; C1-044,C1-046
C1-046; Navigation parity; 3; assets/js/subject-shell.js; setView/renderQuizzes; subject switching; Chemistry has bespoke lobby/dashboard while shells use simplified cards; functional hierarchy should match master; deliberate legacy split; E3,E4; feature/state behavior drift; four subjects; 4/5/5/2/4; 80; 12; specify parity matrix before convergence; cross-subject interaction test; C1-001,C1-004
C1-047; A11y focus; 3; assets/js/mobile-keypad.js; hideNativeForm; mobile switch; hides focused answer input without moving focus to keypad; controls must retain usable focus; layout transition omits focus handoff; source inspection; keyboard/SR focus lost; game mobile; 3/4/4/4/2; 82; 13; focus first keypad control when hiding form; keyboard mode-switch Playwright test; C1-048,C1-049
C1-048; A11y dialog; 2; 콩쥐야_줘때써.html; resultPanel role=dialog; result render; custom dialog lacks native modal/focus restoration ownership; dialogs need focus contract; mixed dialog implementations; static markup; keyboard can continue behind results; game; 2/3/4/3/3; 66; 9; use dialog/focus trap/restore; keyboard result test; C1-047,C1-049
C1-049; A11y motion; 2; assets/js/lobby-navigation.js; SVG icon rewrite; mobile mount; replaces icon span innerHTML but has no title/text fallback beyond labels; icon decoration should not alter accessible name; positional injection; source inspection; low risk since text remains; Chemistry mobile; 3/3/2/4/1; 65; 11; use DOM SVG or keep labelled semantics; accessibility tree test; C1-008,C1-047
C1-050; Runtime ownership; 2; assets/js/lobby-navigation.js; installMainCtaFallback; click; fallback and lobby-actions both attach main CTA handlers; one owner should choose training; defensive duplicate routing; source inspection; race/default atomic selection if primary breaks; Chemistry; 3/4/3/3/2; 72; 11; explicit callback/one router; handler-count and failure-path test; C1-051,C1-052
```

### Low-confidence bucket (traceable, not confirmed defects)

```text
C1-051; Runtime lifecycle; 2; assets/js/lobby-navigation.js; media change listener; remount; no disposer for matchMedia/storage/popstate; mount should be disposable; LC side-effect entry; source; duplicate routing in embedded use; lobby; 2/3/3/3/2; 60; 9; expose destroy; remount test; C1-032,C1-050
C1-052; State race; 2; assets/js/lobby-navigation.js; queueMicrotask fallback; slow/throwing primary CTA; fallback may route atomic number after another handler partially acts; single launch transaction; LC dual handler; source; wrong training navigation; lobby; 2/3/3/3/2; 60; 9; centralize launch; simulated primary failure test; C1-050
C1-053; Runtime lifecycle; 2; assets/js/device-entry.js; module side effect; test/embedded mount; permanent resize/orientation/visualViewport listeners lack destroy; global service needs teardown; LC page-lifetime assumption; source; duplicated updates in remount; lobby/game; 2/4/3/3/2; 67; 10; mount singleton API; listener test; C1-009
C1-054; Performance; 2; assets/js/device-entry.js; scheduleViewportRefresh; rapid resize; viewport writes on multiple event sources can thrash style; one RAF limits but all sources fire; LC; source; mobile jank; all pages using it; 2/3/4/3/2; 65; 10; measure/debounce policy; resize perf test; C1-053
C1-055; State consistency; 2; assets/js/subject-shell.js; applyDeviceMode; saved desktop/mobile; resolver does not toggle body layout classes used elsewhere; shared device API expected; E10; subject CSS deviations; shells; 3/4/3/3/2; 73; 11; reuse shared resolver; parity test; C1-009
C1-056; CSS responsive; 2; assets/css/subject-shell.css; @media max700; forced-mobile desktop; width and dataset policies duplicate with different values; breakpoint contract must be one owner; E4; edge width drift; shells; 3/4/3/3/3; 72; 10; retain responsive module only; viewport matrix; C1-002
C1-057; CSS responsive; 2; assets/css/subject-toolbar/responsive.css; max700+dataset copies; forced mobile; same rules duplicated in media and dataset block; shared declarations should compose; LC deliberate support; source; future edits diverge; shells; 4/4/3/3/2; 76; 12; use shared selector grouping; selector parity test; C1-056
C1-058; CSS specificity; 2; subjects/chemistry/index.html; forcedMobileLayout; mobile; html[data-device-layout] inline rules outrank normal maintenance CSS; component owner should not need specificity escalation; E3; fixes require more overrides; Chemistry; 5/5/4/3/3; 88; 14; retire inline component rules; computed-style test; C1-004
C1-059; CSS specificity; 2; subjects/chemistry/index.html; homeCleanup; any viewport; inline `!important` hides two components; hidden UI should be removed/owned by view state; patch cleanup; source; stale DOM/accessibility debt; Chemistry; 4/4/3/3/2; 76; 12; remove unused DOM or static owner; visibility test; C1-004
C1-060; CSS maintainability; 2; assets/css/quiz-mobile-polish.css; !important count 136; feature change; large override density indicates cascade debt; component rules should win normally; inventory; regression-prone mobile fixes; quiz mobile; 3/4/4/2/4; 73; 9; map owners before edits; specificity budget test; C1-061
C1-061; CSS maintainability; 2; assets/css/shop-outfit-layout.css; !important count 130; shop responsive; overrides encode image geometry in cascade; visual contract needs component scope; inventory; shop visual regressions; shop; 3/4/3/2/4; 70; 8; reduce after canonical asset decision; screenshot suite; C1-025
C1-062; CSS maintainability; 2; assets/css/shop-jar-card-layout.css; !important count 129; shop responsive; duplicate high-priority layout ownership; one card layout source; inventory; future asset fixes fragile; shop; 3/4/3/2/4; 70; 8; consolidate after visual baseline; screenshot suite; C1-061
C1-063; CSS maintainability; 2; assets/css/jar-mouth-hole-polish.css; !important count 54; scene; patch stylesheet likely overrides base geometry; authored scene needs manifest/CSS boundary; inventory; scene drift; game; 2/3/3/2/4; 60; 6; classify temporary rules; visual regression; C1-064
C1-064; CSS maintainability; 2; assets/css/jar-water-surface-fix.css; !important count 44; scene; layered patches share water ownership; one scene water contract; inventory; z/order regressions; game; 2/3/3/2/4; 60; 6; consolidate only with scene tests; C1-063
C1-065; CSS stacking; 2; assets/css/subject-shell.css; topbar z20/nav z50; toolbar overrides z60/90; import order; conflicting z-index source of truth; toolbar owns stack; E4; overlays may render under nav; shells; 3/4/3/3/3; 74; 10; centralize toolbar stack tokens; modal/nav screenshot; C1-002
C1-066; CSS stacking; 2; assets/css/lobby-scene.css; nav z90/topbar z60; Chemistry mobile; nav second row worsens bottom overlay; one-row nav invariant broken; E3; obstructed UI; Chemistry; 5/5/4/4/2; 91; 16; fix six-column layout first; 320 viewport screenshot; C1-001
C1-067; CSS loading; 2; subjects/chemistry/index.html; stylesheet versions; cache updates; static mobile-fixed query differs dynamic query; stale cache policy duplicated; E5; two cache identities; Chemistry; 5/5/3/4/1; 90; 16; one manifest/version source; request URL test; C1-010
C1-068; CSS loading; 2; assets/js/lobby-navigation.js; mobile settings CSS; desktop; always downloads dialog CSS though settings exists all modes; LC optimization; source; small startup cost; lobby; 5/4/2/4/1; 78; 14; media/lazy load; resource test; C1-011
C1-069; CSS ownership; 2; assets/css/subject-navigation.css; mobile-bottom-nav; Chemistry; generic subject nav styles coexist with lobby styles; component selector too broad; inventory; future collision; Chemistry; 3/4/3/3/3; 72; 10; namespace or remove duplicate; selector audit; C1-012
C1-070; CSS ownership; 2; assets/css/mobile-shadcn.css; lobby toolbar/nav; mobile; another stylesheet owns lobby-topbar/desktop-tabs/wallet/nav; master hierarchy has no single stylesheet; inventory; conflict on device mode; Chemistry; 4/4/3/3/3; 76; 11; assign ownership map; style order test; C1-012
C1-071; CSS ownership; 2; assets/css/mobile-unified-shell.css; mobile-bottom-nav; mobile; runtime-loaded shell redefines same nav; duplicate shell concept; E5; cascade dependence; Chemistry; 4/4/3/3/3; 76; 11; merge role or isolate route; computed style test; C1-010
C1-072; CSS ownership; 2; assets/css/mobile-fixed-shell.css; lobby-topbar/mobile-nav; mobile; static and dynamic duplicate path plus selector owner; entrypoint ambiguity; E5; duplicated parse/cascade; Chemistry; 5/5/3/4/2; 90; 15; select one delivery path; CSS request test; C1-010
C1-073; CSS ownership; 2; assets/css/lobby-navigation.css; mobile-bottom-nav; mobile; navigation feature stylesheet owns shell geometry; feature should not own infrastructure; inventory; selector drift; Chemistry; 3/4/3/3/3; 72; 10; move shell rules to owner; ownership test; C1-012
C1-074; CSS compatibility; 2; assets/css/shop-jar-authored-desktop.css; comment/legacy atlas; shop; authored PNG override deliberately coexists with legacy atlas; dual renderer remains; source comment; accidental fallback possible; shop; 3/4/3/2/4; 69; 8; define/retire fallback later; asset-state screenshot; C1-027
C1-075; Runtime style; 2; assets/js/asset-debug-viewer.js; document.head.append; debug=assets; debug style injected dynamically; debug isolation is intentional but untested cleanup; LC; source; debug residue in SPA tests; debug only; 2/3/1/3/2; 52; 7; return disposer; debug mount test; C1-036
C1-076; Data validation; 2; data/subject-game-content.js; validateContent; question type; validator does not validate difficulty/inputMode/presentation kind; shared runtime schema needs full contract; E7; invalid new content can render wrong keypad; non-Chemistry; 3/5/4/4/2; 85; 14; use shared schema validator; invalid type fixture; C1-018
C1-077; Data validation; 2; data/subject-game-content.js; validateContent; training modes; validator does not require mode metadata/rules/difficulty levels; live mode should be complete; E7; undefined game copy/rules; non-Chemistry; 3/5/4/4/2; 85; 14; validate mode schema; malformed mode fixture; C1-018
C1-078; Data validation; 2; data/subject-quizzes.js; implementation; live entry; no programmatic check that implementation training matches id; registry must route exactly; LC source lists manual URLs; wrong route can ship; all subjects; 3/4/4/4/2; 80; 13; parse implementation/search params; registry graph test; C1-016
C1-079; Data validation; 2; data/subject-quizzes.js; status; live/planned; status can be live without implementation, as recent change risk shows; live must be executable; LC; E1; user dead button possible; subjects; 3/4/4/4/2; 80; 13; enforce live implementation/content; fixture test; C1-016
C1-080; Data validation; 2; data/subject-quizzes.js; chemistry adapter; Chemistry modes map to legacy URL while others direct game URL; route semantics vary by subject; canonical game route expected; source; testing/migration complexity; four subjects; 4/5/4/2/4; 76; 11; document adapter or normalize later; route matrix test; C1-046
C1-081; Data integrity; 2; data/questions/index.js vs subject-game-content.js; validators; content additions; Chemistry uses rich validator, others weak validator; same quiz quality contract expected; E7; quality gap grows; all future subjects; 4/5/5/3/3; 87; 14; parameterize shared validator; subject parity fixtures; C1-018
C1-082; Data integrity; 2; data/questions/earth-science-geologic-era-keywords.js; 138 entries; new bank; no explicit UI/browser smoke for bank; live data must test representative answers; E1; third jar may have presentation issue; Earth; 3/5/3/4/2; 82; 13; add answer/presentation smoke; C1-017
C1-083; Data integrity; 2; data/subject-game-content.js; binaryRuntimeQuestion; binary questions; correct choice index convention differs from multiple choice; shared adapter should normalize one convention; source; off-by-one risk for future bank; Earth; 2/4/3/3/3; 66; 9; normalize choice value API; adapter unit matrix; C1-018
C1-084; Data integrity; 1; data/subject-game-content.js; normalizeSubjectId; unknown URL; unknown subject silently becomes Chemistry; invalid subject should be observable; LC fallback intentional; source; wrong content hides link error; game routes; 3/4/3/3/2; 69; 11; log/redirect explicit invalid state; invalid URL test; C1-085
C1-085; Routing; 2; assets/js/main.js; selectedTrainingId; unknown training; runtime shows feedback rather than canonical return; route error contract inconsistent with subject redirect; LC; source; confusing blank game shell; all game links; 2/3/4/3/2; 64; 10; error screen/redirect policy; invalid route browser test; C1-084
C1-086; Storage parsing; 2; assets/js/lobby-actions.js; selection/category parse; corrupt session/local storage; multiple direct parsers use different fallbacks; shared storage gateway expected; inventory; silent category/selection reset; Chemistry; 3/4/3/3/2; 70; 11; centralize safe JSON parser; corrupt storage test; C1-037
C1-087; Storage parsing; 2; assets/js/game-bgm.js/game-sfx.js; readSettings; corrupt audio; duplicate normalize/read implementation; one audio settings module expected; inventory; configuration drift; game; 3/4/3/3/2; 70; 11; shared audio settings service; malformed settings test; C1-040
C1-088; Storage parsing; 2; assets/js/theme-system.js; readEquippedJarSkin; cosmetics; direct cosmetic parsing duplicates CosmeticSystem; one cosmetics selector expected; inventory; preview/game mismatch after schema change; lobby/game; 3/4/3/3/2; 70; 11; expose safe selector; cosmetics schema test; C1-039
C1-089; Storage state; 2; assets/js/subject-toolbar/beans.js; storage event; same tab purchase; browser storage event does not fire in same tab; wallet needs explicit local update event; LC; source; header bean amount can remain stale until render/navigation; shells; 3/4/3/3/2; 70; 11; subscribe to economy event; same-tab purchase test; C1-007,C1-037
C1-090; Storage state; 2; assets/js/shop-navigation.js; storage listener; same tab; shop rerenders actions locally but external wallet consumers need separate events; shared economy event missing; LC; source; stale multi-widget balance; shop/lobby; 2/3/3/3/2; 60; 9; domain event on purchase; purchase propagation test; C1-089
C1-091; Storage state; 2; assets/js/subject-game-storage.js; finishRun; bad state; records can contain `status`/counts from arbitrary snapshot without normalization; storage boundary should validate; LC; source; malformed analytics; non-Chemistry; 2/3/3/3/2; 60; 9; normalize state schema; malformed finish test; C1-042
C1-092; Storage state; 2; assets/js/subject-game-storage.js; currentRun; resume; `data` shallow-spreads global state each read, not immutable deep snapshot; callers can mutate nested global data; LC; source; accidental state mutation; non-Chemistry; 2/3/3/2/3; 58; 7; expose read-only snapshot; mutation test; C1-039
C1-093; State ownership; 2; assets/js/main.js; globalThis.KongJuiYaGame; boot; global singleton is process-wide and never cleared; one page expected but tests/embeds may reuse stale API; LC; source; stale subject runtime in soft navigation; game; 2/4/3/3/2; 65; 10; explicit destroy/reset API; two-subject boot test; C1-094
C1-094; Runtime lifecycle; 2; assets/js/main.js; window listeners; teardown; beforeunload cleanup only, no programmatic destroy; bootstrap API should be lifecycle-aware; source; test/embedded listener leaks; game; 2/4/3/3/2; 65; 10; expose destroy; listener-count test; C1-093
C1-095; Runtime lifecycle; 2; assets/js/game-bgm.js; global listeners; page unload; BGM has no destroy/unload cleanup although it owns context/listeners; hard unload hides it; source; test/embed audio leak; game; 2/3/3/2/3; 55; 7; export teardown; audio controller test; C1-094
C1-096; Runtime lifecycle; 2; assets/js/game-sfx.js; global listeners; page unload; SFX context/listeners have no cleanup; hard unload assumption; source; test/embed audio leak; game; 2/3/3/2/3; 55; 7; export teardown; audio controller test; C1-095
C1-097; Audio startup; 2; assets/js/ui-effects.js,game-bgm.js; initialize; game boot; historical BGM mounts then game BGM destroys it; intentional but churn/order-sensitive; source comment; potential unlock/listener race; game; 3/4/3/3/3; 72; 10; select BGM before mounting UI; audio single-controller test; C1-040,C1-095
C1-098; Performance; 2; assets/js/game-bgm.js; scheduler; play; WebAudio scheduler allocates oscillators continually; expected but no low-power policy; LC; source; low-end battery use; game; 2/3/3/2/3; 55; 7; performance profile/quality option; CPU trace test; C1-054
C1-099; Runtime lifecycle; 2; assets/js/lobby-hero-scene.js; optional import; lobby revisit; optional scene mount ownership not audited by CI shell test; LC; entrypoint source; possible duplicate portrait; Chemistry; 2/3/3/2/3; 55; 7; mount idempotence test; C1-051
C1-100; Runtime lifecycle; 2; assets/js/kongjwi-dashboard.js; global storage listener; dashboard; no teardown and currently user-modified file; excluded from fix scope but ownership is latent; LC; source; duplicate dashboard updates; dashboard; 2/3/2/2/3; 48; 6; audit after user change settles; listener test; C1-094
```

```text
C1-101; Test coverage; 3; .github/workflows/ci.yml; browser-smoke; CI; scripts/smoke-subject-shells.mjs exists but is not invoked; toolbar/shell changes lack browser gate; E1/workflow; regressions reach pages; three shells; 5/5/4/5/2; 97; 17; run shell smoke in CI; workflow invocation check; C1-102
C1-102; Test coverage; 3; .github/workflows/ci.yml; browser-smoke; CI; no Chemistry-vs-shell toolbar computed hierarchy smoke; static regex tests cannot catch C1-001; intended parity needs visual/DOM gate; E3; mobile drift ships; all subjects; 5/5/5/4/2; 97; 17; add parity browser matrix; 320/390/desktop screenshots; C1-001,C1-002
C1-103; Test quality; 3; tests/subject-toolbar-layout.test.mjs; all tests; refactor; verifies entrypoint contents but not that subject-shell stops owning selectors; boundary test misses core violation; E4; false confidence after modularization; toolbar; 5/5/4/5/1; 98; 18; add negative shell-selector assertions; static ownership test; C1-002
C1-104; Test quality; 2; tests/subject-toolbar-layout.test.mjs; Chemistry master; test only checks legacy classes, not control count/roles; master hierarchy contract untested; E3; parity mismatch survives; toolbar; 4/5/4/4/1; 94; 16; assert six controls/data roles; DOM fixture test; C1-001,C1-008
C1-105; Test quality; 2; tests/multiscience-architecture.test.mjs; static href scan; assets; checks authored HTML href/src only, not CSS/dynamic URLs; asset link integrity incomplete; source; runtime 404 can evade tests; all pages; 3/4/4/3/2; 75; 12; URL extraction/response smoke; broken CSS asset fixture; C1-106
C1-106; Test coverage; 2; scripts/smoke-subject-shells.mjs; viewports; CI omission; comprehensive shell smoke exists but is not CI-gated; test value stranded; workflow omission; E1; regression blind spot; subjects; 5/5/4/5/1; 98; 18; invoke it; CI command assertion; C1-101
C1-107; Test fragility; 2; tests/*regression*.mjs; cache tokens; release; multiple tests pin dated cache strings rather than source relation; changes repeatedly create false failures; E1; CI noise; game assets; 5/5/4/5/1; 98; 18; semantic version assertions; version bump test; C1-024
C1-108; Test integrity; 3; tests/shared-science-game-core.test.mjs; schema adapters; Earth change; expects only fossil sources, excludes new geologic bank; test uses stale fixed cardinality; E1; CI red/coverage false; Earth; 5/5/3/5/1; 98; 17; derive expected banks from content registry; new-bank test; C1-016
C1-109; Test integrity; 2; tests/earth-science-fossil-quiz.test.mjs; status list; feature addition; hard-coded planned third jar conflicts with live registry; status contract manual; E1; CI red; Earth; 5/5/3/5/1; 98; 17; test named statuses/registry graph; status fixture; C1-016
C1-110; Test integrity; 2; tests/shop-authored-kongjwi.test.mjs; static path literals; shop update; visual test inspects source text rather than loaded image frame; wrong contract can pass/fail; E9; preview integrity not proven; shop; 4/5/3/3/2; 84; 13; browser image/natural-size/frame test; screenshot test; C1-025
C1-111; Test integrity; 2; tests/animation-asset-pipeline.test.mjs; generated QA; asset change; test correctly detects stale files but doesn’t show semantic diff/source cause; maintenance recovery costly; E8; repeated fix churn; asset QA; 5/5/3/3/2; 88; 14; add generated-diff summary/command; check fixture; C1-021
C1-112; CI observability; 2; .github/workflows/ci.yml; Node tests; CI; no upload for Node failure artifacts/QA diff, only browser diagnostics; failed static diagnosis limited; source; slower repair; CI; 4/4/3/3/1; 78; 13; upload QA/check logs; workflow smoke test; C1-021
C1-113; Tooling; 2; repository root; package.json absent; Node imports; Node 22 warns each JS ESM import as typeless; module type should be explicit; E1 command warnings; parse overhead/noise; tests/dev; 5/5/3/5/1; 94; 17; add minimal package type module after compatibility review; clean Node run; C1-114
C1-114; Tooling; 1; .github/workflows/ci.yml; node --check; ESM files; syntax gate differs from actual module resolution/type behavior; build contract incomplete; LC; source/warnings; false security; CI; 3/4/3/3/2; 69; 11; explicit module config; import smoke; C1-113
C1-115; Performance; 2; assets/js/main.js; content import; game start; imports entire 637-question Chemistry bank for any selected mode; per-mode loading may reduce startup parse; LC; validation needs full bank; source; slower low-end start; Chemistry; 4/4/3/2/4; 67; 9; measure/split only if budget fails; startup timing test; C1-116
C1-116; Performance; 2; data/questions/index.js; aggregate bank; game start; all bank construction runs before selected training; content registry lacks lazy boundary; LC; source; main-thread work; Chemistry; 4/4/3/2/4; 67; 9; lazy registry proposal; bundle profile; C1-115
C1-117; Performance; 2; assets/js/shop-navigation.js; createImage; category render; images are `loading=eager`, high priority; item grids can compete with UI; LC; source; store startup bandwidth; shop; 3/4/3/3/2; 70; 11; eager only above-fold/equipped; network test; C1-118
C1-118; Asset duplication; 2; assets/art/source-locked and game-scene; duplicate PNG copies; repository; source-locked and legacy copies intentionally byte-identical; disk/repo bloat versus provenance benefit; LC; asset contract test; clone/update cost; repo; 5/5/2/1/5; 70; 5; keep unless storage budget mandates dedupe; size budget report; C1-119
C1-119; Asset delivery; 2; assets/art/game-scene/manifest.json; fallback paths; runtime; manifest retains legacy fallback plus authored assets; canonicalization incomplete; E8 validation; fallback can mask missing authored art; scene; 3/4/3/2/4; 63; 8; classify fallback policy; manifest smoke; C1-023
C1-120; Asset integrity; 2; assets/art/game-scene/manifest.json; availability; release; availability booleans can permit fallback silently rather than fail; release should distinguish optional/planned; LC; validation output; wrong production art risk; scene; 2/4/3/2/4; 58; 7; required asset tiers; manifest fixture; C1-023
C1-121; Security/local integrity; 2; assets/js/record-detail.js; renderRuns; corrupted localStorage; template innerHTML interpolates run fields; local persistence can inject markup; rendering should use text nodes; inventory; local XSS/visual corruption via tampered save; records; 3/4/3/4/2; 76; 12; textContent construction/sanitize; malicious-save test; C1-122
C1-122; Security/local integrity; 2; assets/js/shop-navigation.js; innerHTML labels; catalog change; catalog values interpolate HTML; trusted now, unsafe future feed; rendering should use text nodes; inventory; catalog injection risk; shop; 2/3/3/3/2; 58; 9; DOM node construction; malicious catalog fixture; C1-121
C1-123; Security/local integrity; 2; assets/js/subject-portal.js; card innerHTML; registry change; registry metadata interpolates markup; static now, externalization risk; inventory; portal injection if data changes; portal; 2/3/3/3/2; 58; 9; safe DOM rendering; malicious registry test; C1-122
C1-124; Security/local integrity; 2; assets/js/ui-adapter.js; promptHtml; question render; trusted question HTML inserted directly; schema needs allowed markup policy; Chemistry validator permits promptHtml; inventory; data typo/XSS if content pipeline changes; game; 2/4/4/2/4; 62; 8; sanitizer/strict whitelist; hostile question fixture; C1-121
C1-125; A11y; 2; assets/js/records-enhancements.js; role=link cards; card enhancement; div/article becomes link but mouse/keyboard implementation has no visible focus styling proof; interactive contract should be CSS-tested; LC; source; keyboard discoverability risk; Chemistry records; 3/3/3/3/2; 62; 10; add focus style/role test; keyboard Playwright; C1-047
```

```text
C1-126; A11y; 2; assets/js/subject-shell.js; setView focus; route popstate; focus moves only click path, not history navigation; navigation should announce/focus consistently; source; keyboard back behavior ambiguity; shells; 2/3/3/3/2; 58; 9; focus policy for popstate; browser back test; C1-127
C1-127; A11y; 2; assets/js/lobby-navigation.js; setLobbyScreen; history; similarly suppresses focus on popstate intentionally; needs documented contract; LC; source; SR location ambiguity; Chemistry; 2/3/3/3/2; 58; 9; test/document focus behavior; browser back test; C1-126
C1-128; A11y; 2; assets/js/subject-toolbar/chemistry-contract.js; wallet; mount; inserts anchor with innerHTML and no explicit visible amount label relation; accessible name fixed but amount context limited; LC; source; wallet state less clear to SR; shells; 2/3/3/3/1; 57; 10; aria-live/value label; accessibility tree test; C1-089
C1-129; A11y; 1; subjects/chemistry/index.html; mobile nav; 320px; six labels at 8px and five-column wrap reduce scanability; hit target height exists but hierarchy fails; E3; touch navigation confusion; Chemistry; 5/5/3/4/1; 91; 16; fix C1-001 then test labels; mobile accessibility test; C1-001
C1-130; A11y; 2; assets/js/game-bgm.js; settings dialog; button; dynamically added dialog has no duplicate-id guard; repeated module import could duplicate `audioSettingsButton/dialog`; LC module cache normally prevents; source; duplicate controls in embeds; game; 2/3/2/3/2; 50; 8; idempotent mount; double-import test; C1-094
C1-131; A11y; 2; assets/js/device-entry.js; device gate; requireChoice; dialog close; close with Escape returns empty mode normalized auto but user intent not explained; LC; source; unexpected layout change; entry pages using gate; 2/3/2/2/2; 45; 7; explicit cancel/default; dialog keyboard test; C1-009
C1-132; A11y; 1; assets/js/mobile-keypad.js; panel; mobile choice; custom keypad does not set roving tab order/initial focus; native tab sequence may be long; LC; source; keyboard efficiency; game mobile; 2/3/3/2/2; 53; 8; focus management evaluation; keyboard test; C1-047
C1-133; A11y; 2; 콩쥐야_줘때써.html; external ad dialog; ad open; focus/consent/disclosure behavior delegated to remote script; game should tolerate blocked/slow third party; static source; dialog may be empty/unfocused; game; 2/3/3/2/3; 53; 7; explicit ad fallback/accessibility; blocked-script browser test; C1-134
C1-134; Performance/resilience; 2; 콩쥐야_줘때써.html; Google ads script; game result; third-party request is in dialog markup every page load; game startup should not require ad parser; source; startup/privacy performance; all game runs; 4/4/4/3/3; 78; 12; lazy-load on dialog open with consent; request timing test; C1-133
C1-135; Runtime lifecycle; 2; assets/js/scene-renderer.js; preload; cosmetics changes; each load creates Image objects without cancellation/cache policy; rapid equip changes can enqueue obsolete preloads; revision guards DOM but not fetches; source; bandwidth spikes; scene/shop cosmetics; 2/4/3/3/2; 64; 10; cache/abort policy; rapid-change network test; C1-136
C1-136; Runtime lifecycle; 2; assets/js/scene-renderer.js; ensureRuntimeStylesheet; load failure; rejected promise leaves a link with listeners/state; retry behavior not explicit; LC; source; scene can remain failed after transient CSS error; game; 2/3/3/3/2; 58; 9; error cleanup/retry state; failed-link test; C1-036
C1-137; Runtime state; 2; assets/js/scene-renderer.js; root.__layeredSceneRenderer; mount; DOM expando is hidden global ownership; explicit lifecycle registry preferable; LC; source; stale renderer after root replacement; game; 2/3/3/2/3; 53; 7; WeakMap/controller owner; remount test; C1-094
C1-138; Runtime state; 2; assets/js/game-cosmetics-entry.js; root.__mountedGameScene; mount; second hidden expando duplicates ownership style; LC; source; remount coupling; game; 2/3/3/2/3; 53; 7; common lifecycle host; remount test; C1-137
C1-139; Runtime lifecycle; 2; assets/js/ui-effects.js; beforeunload cleanup; initialization failure; if an error occurs after scene mount but before beforeunload handler, resources stay mounted; LC async path; source; partial boot leak; game; 2/3/2/3/2; 50; 8; try/finally/disposer; induced failure test; C1-094
C1-140; Runtime timing; 2; assets/js/ui-effects.js; fever interval; visibility/pause; UI interval follows wall time separate from core fever cadence; core is authoritative but visual can drift; LC; source; timer label mismatch; game; 2/3/3/2/3; 50; 7; derive display from state/tick; pause/visibility test; C1-141
C1-141; Runtime timing; 2; assets/js/main.js; RAF tick; display resume; lastFrameTime reset occurs on scheduling, but visibility callback also pauses/resumes; race needs browser coverage; LC; source; rare elapsed-time jump; game; 2/3/3/2/3; 50; 7; visibility lifecycle test; C1-140
C1-142; Runtime input; 2; assets/js/mobile-keypad.js; 900ms lock; slow submit; fixed lock duration may unlock before answer feedback/cadence completes; game state eventually gates UI but keys update independently; LC; source; duplicate input chance; game mobile; 2/3/3/3/2; 58; 9; bind lock to game events; rapid-tap test; C1-143
C1-143; Runtime input; 2; assets/js/mobile-keypad.js; api.submit; choice; invokes API directly while form path uses requestSubmit; two submission paths may diverge; one command contract expected; source; input analytics mismatch risk; game mobile; 2/3/3/3/2; 58; 9; one submit adapter; numeric/choice parity test; C1-142
C1-144; Runtime input; 1; assets/js/mobile-keypad.js; formulaSymbols; formula mode; derives symbols from prompt plus defaults, not question allowed keys; UI can offer invalid symbols; LC; source; unnecessary input errors; chemistry formula; 2/3/2/3/2; 45; 8; derive from descriptor; formula keypad fixture; C1-143
C1-145; Runtime state; 2; assets/js/question-presentation.js; image; source image; no image error fallback/alt failure signaling; live image needs resilience; LC; source; blank question image; Bio/Earth; 2/3/3/3/2; 58; 9; error UI; broken-image browser test; C1-018
C1-146; Runtime state; 2; assets/js/subject-quiz-redirect.js; location.replace; direct legacy route; drops non-subject query parameters/hash; redirect policy should preserve intentional context; LC; source; lost diagnostics/referrals; Bio/Earth legacy; 2/3/2/3/1; 48; 9; define preservation allowlist; redirect URL test; C1-013
C1-147; Routing; 2; index.html; legacy view redirect; root query; root redirects legacy `view` to Chemistry; no invalid view notice; backward compatibility hides typos; LC; source; wrong route quietly opens Chemistry; portal; 2/3/3/2/2; 48; 8; explicit legacy route contract; invalid query test; C1-084
C1-148; Routing; 2; assets/js/shop-context.js; last subject; new subject; fallback priority uses URL/storage/fallback but stale lastSubject semantics need expiry/version; LC; tests cover current; source; shop opens unintended subject; shop; 2/3/3/2/2; 48; 8; document or validate timestamp; stale-key test; C1-044
C1-149; Routing; 2; assets/js/lobby-navigation.js; lastSubject; Chemistry load; Chemistry overwrites last subject immediately; visiting Chemistry via a generic link changes future shop context even without interaction; source; unexpected return subject; shop; 3/4/3/3/1; 67; 12; set on intentional subject selection; route context test; C1-148
C1-150; Routing; 1; assets/js/subject-shell.js; lastSubject; initial load; all shell page loads set last subject before user action; same ambiguity as Chemistry; LC; source; shop context mutable by navigation; subjects; 3/4/3/3/1; 67; 12; define desired semantics; route context test; C1-149
```

```text
C1-151; Asset path; 2; assets/js/lobby-hero-scene.js; HERO_ART_PATH; deep route; relative/site URL conversion must stay correct across root and subject paths; LC current smoke covers lobby; source; missing hero asset if routing changes; Chemistry; 2/3/3/2/2; 48; 8; use manifest/siteUrl consistently; deep-path asset test; C1-105
C1-152; Asset path; 2; assets/js/theme-system.js; JAR_PREVIEW_PNGS; deep route; image path is code constant separate from asset manifest; canonical asset lookup missing; source; preview asset drift; lobby/shop/scene; 3/4/3/3/2; 67; 11; manifest/catalog asset resolver; asset parity test; C1-026
C1-153; Asset path; 2; assets/js/shop-navigation.js; JAR_ART/TOAD_ART; catalog change; multiple hand-maintained asset maps; single manifest unavailable; source; preview differs runtime; shop/game; 3/4/4/3/3; 72; 10; shared asset registry; map parity test; C1-026,C1-152
C1-154; Asset path; 2; assets/js/scene-renderer.js; ALIAS; cosmetics; aliases duplicate item identity mapping; data contract should own aliases; LC; source; new cosmetic fails to display; scene; 2/3/3/2/3; 48; 7; centralize catalog aliases; all cosmetics test; C1-153
C1-155; Asset integrity; 2; assets/art/source-locked/manifest.json; legacyPath; asset refresh; byte-identical source contract is tested but runtime does not consume source manifest; provenance and runtime can drift; LC; source; review blind spot; assets; 2/4/3/2/4; 58; 7; use manifest in validation/build; manifest/runtime test; C1-119
C1-156; Asset integrity; 2; assets/art/game-scene-v2; activeRuntime false; asset work; parallel V2 remains tracked and tested but inactive; inactive assets add maintenance/CI load; LC intentional; tests; repository bloat/confusion; assets; 4/4/2/1/5; 65; 6; explicit lifecycle/retirement plan; inactive asset inventory; C1-118
C1-157; Asset integrity; 1; .asset-jobs; job metadata; asset updates; generated/job artifacts may outlive runtime decisions; LC inventory; source; contributor confusion; repo; 2/2/1/1/4; 35; 2; document ownership; tree audit; C1-156
C1-158; Asset performance; 2; assets/art game PNG sheets; 4096x768; mobile game; runtime loads high-res sprite sheets even on small viewport; quality policy may lack responsive assets; validation shows dimensions; source; bandwidth/memory; game mobile; 3/4/4/2/4; 67; 9; measure and add responsive variants only if needed; network memory profile; C1-159
C1-159; Asset performance; 2; assets/js/scene-renderer.js; preload; game start; preloads selected assets without viewport/connection policy; LC; source; low-end startup cost; game; 3/3/4/2/3; 60; 9; respect save-data/connection; network test; C1-158
C1-160; Asset fallback; 2; manifest toad expression; disabled overlay; expression event; fallback full image behavior may differ from overlay composition; known planned technical debt; validation output; visual expression changes by asset availability; game; 3/5/3/2/4; 67; 9; retain explicit fallback test; expression screenshot; C1-023
C1-161; Architecture; 3; assets/js/game-core.js; 1069 lines; feature growth; core combines state machine, scoring, timers, events and persistence-facing detail; domain core should have bounded collaborators; inventory; change risk; all games; 3/3/5/2/4; 72; 9; characterize before split; event/state contract suite; C1-162
C1-162; Architecture; 3; assets/js/shop-navigation.js; 604 lines; shop; route, rendering, wardrobe, assets, state and audio share one module; feature boundaries mixed; inventory; shop regressions broad; shop; 3/4/4/3/3; 78; 11; split only behind tests; shop behavior suite; C1-028
C1-163; Architecture; 3; assets/js/lobby-actions.js; 414 lines; lobby; cards, settings, upgrades, mission and launch in one module; mixed concerns; inventory; Chemistry-only changes collide; lobby; 3/4/4/3/3; 78; 11; extract services gradually; lobby contract tests; C1-050
C1-164; Architecture; 3; assets/js/scene-renderer.js; 426 lines; scene; asset resolution, DOM creation, animation and resize share module; boundaries mixed; inventory; scene changes risky; game; 3/4/4/2/4; 70; 9; preserve controller API then split; renderer unit tests; C1-135
C1-165; Architecture; 2; assets/js/storage.js; 355 lines; storage; schema migration, economy, analytics and missions share store; one schema root but large responsibility; LC; tests strong; change blast radius; Chemistry/shared; 3/4/5/2/4; 70; 10; document subdomains before split; migration matrix; C1-039
C1-166; Architecture; 2; assets/js/ui-effects.js; 307 lines; game UI; gameplay UI, routing, scene/audio/keypad and result own one initialization; orchestration overloaded; inventory; error cleanup complexity; game; 3/4/4/2/4; 67; 9; compose explicit mounts; lifecycle test; C1-139
C1-167; Architecture; 2; assets/js/kongjwi-part-composer.js; 362 lines; legacy character; DOM composition uses observers/listeners separate from scene renderer; two character render paths; inventory; cosmetic visual drift; shop/dashboard/game; 3/3/3/2/4; 58; 7; map active consumers; character parity test; C1-028
C1-168; Architecture; 2; assets/js/historical-bgm.js; 441 lines; audio; procedural score service is shared across lobby/shop/game then replaced in game; cross-page service semantics unclear; source; audio lifecycle drift; lobby/shop/game; 3/4/4/2/4; 67; 9; formal audio service contract; single-controller test; C1-097
C1-169; Architecture; 2; assets/js/site-routing.js; routing; route helpers coexist with hard-coded URLs in data/HTML; single routing registry bypassed; inventory; deep-path break risk; all pages; 3/4/4/3/3; 74; 11; inventory hard-coded route exceptions; route graph test; C1-170
C1-170; Routing; 2; data/subject-quizzes.js; implementation URLs; subject content; string URLs encode Korean game filename and params; route helper not used; registry should provide route builder; source; URL drift; subject quizzes; 4/5/4/3/2; 82; 14; generate URLs via routing function/data; route parse test; C1-013,C1-169
C1-171; Architecture; 2; subjects/chemistry/index.html; full bespoke lobby; cross-subject; Chemistry master is not a shared shell implementation, so parity uses adapters rather than reuse; master reference should be executable contract; E3,E4; duplicate UI evolution; all subjects; 4/5/5/2/4; 80; 12; write parity spec before any convergence; cross-shell DOM contract; C1-046
C1-172; Architecture; 2; assets/js/subject-toolbar/chemistry-contract.js; copy normalization; toolbar; copy content is hard-coded in compatibility module; theme/content should not couple to behavior; source; localization/content edits touch JS contract; shells; 3/4/3/3/2; 70; 11; move copy to registry/data; localization test; C1-005
C1-173; Architecture; 2; assets/js/subject-toolbar/beans.js; chemistry key; toolbar; shared-economy implementation is named Chemistry-specific in a cross-subject module; global economy abstraction absent; E6; refactor pressure/misuse; all subjects; 4/5/4/3/3; 82; 13; expose neutral economy interface without migration now; interface test; C1-037
C1-174; Architecture; 2; assets/js/subject-shell.js; root.innerHTML; shell; one huge HTML string mixes content, a11y and controller; template boundary absent; inventory; review/testing difficult; shells; 3/4/4/2/4; 67; 9; incremental DOM/template extraction; DOM structure test; C1-008
C1-175; Architecture; 2; assets/js/subject-portal.js; portal cards; portal; portal directly renders subject metadata and routes rather than a shared shell component; LC; source; portal/shell status drift; portal; 2/3/3/2/3; 48; 7; shared subject card contract; registry render test; C1-044
```

```text
C1-176; Responsive; 2; assets/css/subject-toolbar/layout.css; desktop nav min-content; narrow desktop; fixed min-content can force topbar pressure between 701-940px; responsive rules attempt wrap but no rendered matrix; LC; source; overflow at translated labels; shells; 2/3/4/3/2; 60; 10; browser width matrix; 701-940 screenshot; C1-177
C1-177; Responsive; 2; assets/css/subject-toolbar/controls.css; nav white-space nowrap; localized labels; forced no-wrap guards labels but magnifies overflow; contract needs overflow test; source; clipped nav; shells; 2/3/4/3/2; 60; 10; visual width tests; C1-176
C1-178; Responsive; 2; assets/css/subject-toolbar/responsive.css; max390; 320px; six controls get very narrow, only gap reduction at 390; no 320 visual test in CI; E3; touch label clipping risk; shells; 3/4/4/3/2; 70; 12; 320 test/hide labels policy; mobile screenshot; C1-102
C1-179; Responsive; 2; subjects/chemistry/index.html; body padding-bottom 82; wrapped nav; two-row nav needs more than 82px; direct C1-001 consequence; E3; content obscured; Chemistry; 5/5/4/4/1; 95; 17; six-column fix; viewport overlap test; C1-001
C1-180; Responsive; 2; assets/css/mobile-shadcn.css; device modes; uses data-mobile-ui alongside data-device-layout; two state flags can disagree; single layout state expected; E5/source; breakpoint drift; Chemistry/shop; 3/4/4/3/3; 74; 11; derive one from other; forced-mode test; C1-009
C1-181; Responsive; 2; assets/js/lobby-navigation.js; MOBILE_UI_BREAKPOINT 760; device-entry 820/coarse; 761-820 has conflicting mobile layout versus shadcn mode; state thresholds differ; E10; hybrid layout; Chemistry; 4/5/4/4/2; 88; 15; shared breakpoint policy; 760/761/820 tests; C1-009,C1-180
C1-182; Responsive; 1; assets/css/subject-shell.css; html min-width 320; sub-320; hard minimum may cause horizontal overflow on embedded/small devices; LC; source; rare overflow; shells; 2/3/2/2/2; 43; 7; decide support floor; 280 viewport test; C1-178
C1-183; Responsive; 2; assets/css/shop-navigation.css; mobile overflow hidden; shop mobile; fixed workspace may suppress page scroll when content exceeds height; LC; CSS; inaccessible lower content risk; shop; 2/3/3/2/3; 50; 7; browser short-height test; C1-184
C1-184; Responsive; 2; assets/css/shop-navigation.css; max-height700; shop; compact rules exist but no browser CI smoke short mobile store; coverage gap; source; clipped cards/actions; shop; 2/3/3/3/2; 53; 9; add 390x667 shop smoke; Playwright; C1-183
C1-185; Responsive; 2; assets/css/game-mobile-integrated.css; !important stack; game mobile; broad overrides interact with mobile-keypad dynamic styles; source; layout race risk; game; 2/3/4/2/4; 55; 7; snapshot computed properties; C1-047
C1-186; Responsive; 2; assets/js/mobile-keypad.js; applyPanelLayout; resize; inline styles write multiple layout properties every resize; potential layout thrash; LC; source; low-end jank; game mobile; 3/3/3/2/3; 55; 8; RAF batch/style classes; resize perf test; C1-054
C1-187; Responsive; 1; assets/css/lobby-scene.css; hero fixed min-height; compact device; hero rules may reserve too much on short landscape; LC existing smoke only 390x844; source; CTA offscreen; Chemistry; 2/3/3/2/3; 50; 7; short landscape smoke; C1-184
C1-188; Responsive; 1; assets/css/subject-shell.css; hero min-height455; short mobile; similar no shell smoke in CI; source; content pushed below nav; shells; 2/3/3/2/3; 50; 7; CI shell smoke short landscape; C1-101
C1-189; Responsive; 2; assets/css/game-asset-animation.css; high-res scene; aspect; scene uses contain but result/layout collision under ultra-wide not browser tested; LC; source; letterbox/overlay mismatch; game; 2/3/3/2/3; 50; 7; ultra-wide screenshot; C1-190
C1-190; Responsive; 1; scripts/smoke-layered-scene.mjs; viewport list; scene; unknown whether ultra-wide/small landscape covered; static review only; LC; test source; visual blind spot; game; 1/2/3/2/2; 35; 6; expand viewport matrix; C1-189
C1-191; Runtime events; 2; assets/js/main.js; document keydown; game; global keyboard shortcut listener can act while native dialog/ad is open if target not input/button; focus context should gate; source; pause/choice shortcut behind dialog; game; 2/3/3/3/2; 55; 9; check dialog/open overlays; keyboard dialog test; C1-048
C1-192; Runtime events; 2; assets/js/main.js; visibilitychange; visibility; else scheduleFrame executes even ended/cleared, guarded later but needless call; LC; source; minor work; game; 4/4/2/4/1; 70; 13; gate before schedule; lifecycle unit; C1-141
C1-193; Runtime events; 2; assets/js/main.js; upgrade:purchased; global event; no disposer except unload; global game events may duplicate in multiple boots; LC; source; duplicate speech; game; 2/3/3/2/3; 50; 7; lifecycle API; C1-094
C1-194; Runtime events; 1; assets/js/game-cosmetics-entry.js; storage event; storage event key null; clears/reloads cosmetics on storage.clear from any scope; broad handler; LC; source; unnecessary render; game; 2/3/2/2/2; 43; 7; key-specific policy; event fixture; C1-090
C1-195; Runtime events; 2; assets/js/subject-toolbar/beans.js; storage event; clear; only exact chemistry key triggers, so storage.clear does not refresh displayed beans; state contract inconsistent; source; stale wallet after clear; shells; 2/3/3/3/1; 52; 10; handle null safely; storage-clear test; C1-089
C1-196; Runtime state; 2; assets/js/subject-shell.js; activeCategory; bad stored string; category fallback works, but selection state has no version and labels are keys; localization changes reset; LC; source; filter loss; shells; 2/3/2/2/2; 43; 7; stable category IDs; migration test; C1-041
C1-197; Runtime state; 2; assets/js/lobby-actions.js; CATEGORY_SELECTION_KEY; category labels; Chemistry stores localized label string; catalog label rename loses selection; source; UX reset; Chemistry; 3/4/2/3/1; 62; 11; store stable ID; rename fixture; C1-196
C1-198; Runtime state; 2; assets/js/lobby-actions.js; training selection session; stale session; selection may outlive updated/deleted mode and main falls back partially; route/session precedence needs explicit expiry; LC; source; unexpected resume; game; 2/3/3/2/2; 48; 8; validate/clear stale selection; stale mode test; C1-085
C1-199; Quiz runtime; 2; assets/js/main.js; selectedTrainingId; empty Physics; direct Physics game URL has content validation pass but no mode, producing feedback shell; should route to shell planned state; source/tests; confusing empty game; Physics; 3/4/2/3/1; 62; 11; explicit no-content route behavior; Physics browser test; C1-044
C1-200; Quiz runtime; 2; assets/js/subject-shell.js; planned action; planned jar; disabled button communicates planned but no detail or expected availability; LC UX; source; limited impact; Biology; 4/4/2/2/1; 66; 11; add status text/roadmap if desired; accessibility copy test; C1-045
```

```text
C1-201; Economy; 2; assets/js/cosmetic-system.js; purchase; multi-tab; read-modify-write GameStorage purchase has no conflict detection; simultaneous tabs can overwrite bean balance; localStorage lacks transaction; source; lost/double purchases; shop; 2/4/4/2/4; 58; 8; reload-before-write/version stamp; two-tab race test; C1-202
C1-202; Economy; 2; assets/js/storage.js; persist; multi-tab; generic save writes whole document and can overwrite another tab's updates; one storage owner but no concurrency guard; source; lost records/economy edits; Chemistry/all shared; 2/4/5/2/4; 62; 9; revision/merge policy; two-context test; C1-201
C1-203; Economy; 2; assets/js/upgrade-system.js,cosmetic-system.js; bean spend; purchase; separate systems mutate same GameStorage with distinct events; domain transaction boundary absent; LC; source; event/UI consistency risk; shop/lobby/game; 2/3/4/2/4; 53; 7; central transaction service; spend invariants test; C1-039
C1-204; Economy; 2; assets/js/subject-toolbar/beans.js; formatSharedBeans; negative/corrupt; UI clamps but storage may retain invalid balance; display hides data corruption; LC; source; silent integrity loss; shared economy; 2/3/4/2/3; 50; 8; normalization/write repair policy; corrupt balance test; C1-037
C1-205; Economy; 1; assets/js/lobby-navigation.js; syncBeans; amount; header wallet reads only on load/storage/mission timer, not a domain event; LC; source; stale displayed currency; Chemistry; 3/3/3/2/2; 53; 9; emit currency change; purchase/upgrade test; C1-089
C1-206; Records; 2; assets/js/subject-game-storage.js; finishRun; questionCount; uses `correctAnswersPerStage` rather than actual answers; record semantics differ from Chemistry storage; shared records contract should align; source; inaccurate subject analytics; Bio/Earth; 3/4/3/3/2; 67; 11; define fields consistently; result record test; C1-207
C1-207; Records; 2; assets/js/subject-shell.js; renderRecords; records; displays only title/correct/wrong, ignores score/time/difficulty unlike Chemistry dashboard; functional hierarchy drift; source; uneven user record UX; subjects; 4/4/4/2/4; 70; 10; parity requirements; records comparison test; C1-046
C1-208; Records; 2; assets/js/records-enhancements.js; modeByTitle; display names; identifies mode by rendered localized title rather than id; title changes/duplicate titles break record links; source; wrong detail route; Chemistry; 3/4/3/4/2; 72; 12; carry data-training-id from renderer; duplicate-title test; C1-209
C1-209; Records; 2; assets/js/lobby-actions.js; record cards; render; rendered cards apparently lack stable mode id requiring title lookup; data contract absent; source; brittle enhancement; Chemistry; 3/4/3/3/2; 67; 11; emit IDs; record DOM test; C1-208
C1-210; Records; 1; assets/js/record-detail.js; date parsing; corrupt dates; invalid Date becomes sorting/format ambiguity; LC; source; malformed record presentation; Chemistry; 2/3/2/3/2; 43; 8; validate dates; corrupt record test; C1-042
C1-211; Shop; 2; assets/js/shop-navigation.js; sourceCandidates; asset error; fallback strips query only, cannot recover wrong path/case; one error UI but no telemetry; LC; source; broken images opaque to QA; shop; 2/3/3/2/2; 48; 8; manifest validation/telemetry; missing image smoke; C1-105
C1-212; Shop; 2; assets/js/shop-navigation.js; statusTimer; repeated status; timer reset good but not cleared on teardown; LC; source; detached node mutation in remount; shop; 2/3/2/3/2; 48; 8; destroy timer; remount test; C1-094
C1-213; Shop; 2; assets/js/shop-navigation.js; wardrobe image; rapid selection; onload/onerror handlers overwritten but prior image fetch continues; no revision token; LC; source; stale load can briefly show wrong garment; shop; 2/3/3/3/2; 52; 9; token/cancel check; rapid selection test; C1-135
C1-214; Shop; 2; assets/js/shop-navigation.js; OUTFIT_SPRITE_FRAME_COUNT=8; asset change; frame count hard-coded separate from manifest; sheet refresh can crop previews; E9; outfit preview drift; shop; 3/4/3/3/3; 67; 10; read manifest metadata; frame-count test; C1-026
C1-215; Shop; 1; assets/css/shop-navigation.css; legacy sprite background; assets; old SVG path remains regardless of authored image state; LC; source; visual fallback ambiguity; shop; 2/3/2/2/3; 43; 6; state-scoped CSS; screenshot; C1-027
C1-216; Scene; 2; assets/js/scene-renderer.js; manifest fetch; offline; no user-facing retry/error presentation beyond rejected initializer; scene load failure should have recovery; LC; source; game boot error generic; game; 2/3/3/3/2; 52; 9; error state/retry; failed fetch browser test; C1-136
C1-217; Scene; 2; assets/js/scene-renderer.js; load revision; cosmetic update; revision prevents stale DOM only after manifest; multiple loads can rearrange DOM repeatedly; LC; source; flicker/perf; scene; 2/3/3/2/3; 48; 7; debounce cosmetics updates; rapid update test; C1-135
C1-218; Scene; 1; assets/js/scene-state-machine.js; timers; destroy; controller tested but no inspected cross-module lifecycle integration; LC; test gap; source; stale animation timer risk; game; 1/2/3/2/3; 35; 5; integration destroy test; C1-139
C1-219; Scene; 2; assets/js/scene-renderer.js; zIndex manifest; layer creation; arbitrary manifest z-index directly applied inline; manifest mistakes can create inaccessible overlay; LC; source; scene ordering bug; game; 2/3/3/2/3; 48; 7; layer-order schema bounds; manifest test; C1-220
C1-220; Scene; 1; assets/art/game-scene/manifest.json; layer order; changes; no formal monotonic/semantic z-index validator observed; LC; source; visual order regression; assets; 2/3/3/2/3; 48; 7; validate required partial order; bad-order fixture; C1-219
C1-221; Sound; 2; assets/js/action-effects.js; AudioContext; future use; own sound context duplicates game-sfx context; one SFX service expected; dormant code now; source; future double audio; game; 2/3/3/3/2; 52; 9; reuse game-sfx; action effect integration test; C1-029,C1-096
C1-222; Sound; 2; assets/js/historical-bgm.js; volumeSetting; lobby/shop; listens to old `volumeSetting` but game uses new audio settings; control IDs/schema diverge; source; volume not synchronized; cross-page audio; 3/4/3/3/3; 67; 10; shared audio settings; audio page parity test; C1-040
C1-223; Sound; 1; assets/js/game-sfx.js; activeSources; high event rate; stops all prior sounds on each answer, potentially truncates expected feedback; LC design; source; sound quality issue; game; 2/2/2/2/2; 33; 6; product decision/audio test; C1-098
C1-224; Documentation; 2; docs/PROJECT_STRUCTURE.md; architecture; refactor; docs may state older toolbar/runtime paths after fd5 split; documentation needs CI freshness; LC partially tested only scene doc; source; contributor misrouting; repo; 3/3/3/3/1; 62; 11; update/validate toolbar section; doc contract test; C1-225
C1-225; Documentation; 2; docs/DATA_SCHEMA.md; global IDs; new subject data; doc claims global question IDs but new validator does not enforce it; docs/runtime mismatch; E7; false assurance; data contributors; 4/5/4/4/1; 87; 16; enforce or narrow doc; documentation test; C1-018,C1-019
```

```text
C1-226; Documentation; 1; README.md; project layout; current paths; README likely lags modular toolbar and Earth runtime refactor; LC; inventory; onboarding confusion; repo; 2/2/2/2/1; 40; 7; verify during fix batch; doc check; C1-224
C1-227; GitHub Pages; 2; .nojekyll,index.html; deployment; pages use encoded Korean filename plus deep static routes; no deployment smoke against actual Pages base URL; local base paths can differ; LC; source; deployment-only 404 risk; site; 2/3/4/3/2; 58; 10; Pages preview smoke; deployed-link check; C1-105
C1-228; GitHub Pages; 1; ads.txt; deployment; no static policy test that Pages serves root assets/mime; LC; inventory; low reach; site; 1/2/2/1/2; 23; 4; deployment probe; C1-227
C1-229; Legacy compatibility; 2; index.html; legacy view redirect; root; Chemistry-only redirect is hidden compatibility layer without tests for all query/hash combinations; source; lost navigation state risk; portal; 2/3/3/3/2; 48; 9; route matrix test; C1-147
C1-230; Legacy compatibility; 2; subjects/*/quiz.html; quiz redirects; legacy pages vary: Biology bridge exists, Earth bridge broken; compatibility policy inconsistent; E2; bookmark behavior inconsistent; Bio/Earth; 5/5/3/4/1; 93; 16; uniform redirect entry/retire policy; direct-route browser suite; C1-013
C1-231; Legacy compatibility; 2; assets/js/subject-storage.js; CHEMISTRY_STORAGE_POLICY; new features; Chemistry exempt from namespaced policy, forcing conditionals in toolbar/game; intentional but long-term debt; source; state evolution risk; all subjects; 3/4/5/2/4; 70; 10; adapter facade/migration plan; storage parity tests; C1-039
C1-232; Legacy compatibility; 2; assets/js/subject-toolbar/chemistry-contract.js; legacy classes; refactor; contract adds lobby class aliases although shells do not load lobby CSS; compatibility value unclear; E4; stale conceptual coupling; toolbar; 4/5/4/3/3; 82; 13; document/remove after parity proof; class consumer search test; C1-005
C1-233; Dead asset; 1; assets/art/sprites/kongjwi-outfits.svg; shop; CSS references legacy SVG beneath new image renderer; active dependency unclear; LC; source; repository/bandwidth debt; shop; 2/3/2/1/4; 38; 4; reachability audit before removal; asset request test; C1-027
C1-234; Dead asset; 1; assets/css/shop.css; shop; current shop.html loads navigation-specific stack, legacy shop.css reachability unclear; LC; source search; accidental maintenance target; shop; 3/3/2/2/3; 50; 7; entrypoint inventory; unused CSS test; C1-028
C1-235; Dead asset; 1; assets/css/mobile-dashboard-v4.css; mobile; selector overlap but load reachability unclear; LC; inventory; cascade/dead-code risk; Chemistry; 2/3/2/2/3; 43; 6; CSS reachability map; C1-012
C1-236; Dead asset; 1; assets/css/lobby-navigation.css; mobile; same nav selector may be legacy or current unknown; LC; inventory; ownership ambiguity; Chemistry; 3/4/2/2/3; 53; 8; document entrypoint use; C1-012
C1-237; State ownership; 2; assets/js/subject-shell.js; document.title; subject boot; page sets title in JS after initial generic HTML title; bots/no-JS see separate static titles but runtime title depends registry encoding; LC; source; metadata drift; shells; 2/3/2/2/2; 43; 7; registry build/static parity; C1-238
C1-238; SEO metadata; 2; subjects/physics|biology|earth/index.html; descriptions; registry edits; static title/description duplicate data/subjects metadata; one source expected; source; stale SEO/copy; subjects; 3/4/3/2/3; 58; 9; generation or test parity; metadata test; C1-237
C1-239; State ownership; 1; assets/js/subject-shell.js; root.innerHTML; boot; replacing root eliminates pre-rendered fallback/SSR possibility; static Pages acceptable but a11y loading state absent; LC; source; blank before JS; shells; 2/3/2/1/3; 38; 5; static loading/fallback content; no-JS test; C1-230
C1-240; No-JS resilience; 2; subjects/physics|biology|earth/index.html; #subjectShell empty; JS disabled/fails; no useful navigation/content exists; static site should at least link portal; source; blank pages on module failure; shells; 3/4/3/3/2; 67; 11; add minimal fallback; no-JS smoke; C1-006
C1-241; No-JS resilience; 1; subjects/chemistry/index.html; dialogs/actions; core DOM exists but actions depend JS; more resilient than shells, increasing parity difference; LC; source; inconsistent degradation; subjects; 2/3/2/2/2; 43; 7; decide product policy; C1-240
C1-242; Accessibility; 1; subjects/earth-science/quiz.html; broken script; direct page; progress content is visible but cannot complete redirect; E2; dead-end for no-JS/direct visit; Earth; 5/5/2/4/1; 91; 16; C1-013 fixes; direct visit test; C1-013
C1-243; Error handling; 2; assets/js/game-page.js; initialize catch; boot failure; catch writes feedback but does not reset loading/offer route recovery; game failure needs recovery action; source; user stuck; game; 2/3/3/3/2; 52; 9; error UI/retry/back link; forced-failure test; C1-216
C1-244; Error handling; 2; assets/js/subject-toolbar/mount.js; mount false; missing nodes; infinite retry conceals structural error; diagnostic contract absent; E6; hard debugging/user invisible toolbar; shells; 4/5/3/4/2; 84; 14; bounded error dataset/log; missing-node test; C1-006
C1-245; Error handling; 1; assets/js/lobby-navigation.js; optional enhancement catches; BGM/hero; errors only console.warn, no feature state; LC; source; hard support diagnosis; Chemistry; 2/3/2/2/2; 43; 7; data-status/telemetry; import failure test; C1-099
C1-246; Performance; 1; assets/js/lobby-navigation.js; dynamic imports; lobby; optional BGM and hero imports run unconditionally even desktop/hidden state; LC; source; extra parse/fetch; Chemistry; 4/4/2/3/2; 65; 11; condition/defer by visibility; network test; C1-011
C1-247; Performance; 1; assets/js/records-enhancements.js; MutationObserver; cards; observer refreshes full summary on any grid mutation; could repeat storage parse/render; LC; source; minor UI work; Chemistry records; 3/3/2/2/2; 48; 8; batch/filter records; mutation perf test; C1-032
C1-248; Performance; 1; assets/js/theme-system.js; refreshJarPreviews; cosmetics storage; likely rewrites all preview backgrounds on each event; LC; source; card repaint; Chemistry; 2/3/2/2/2; 43; 7; diff equipped skin; repaint test; C1-088
C1-249; Test coverage; 1; tests/runtime-cleanup-regression.test.mjs; scope; lifecycle; current cleanup test only checks selected scene assets, not toolbar/lobby/style injector listeners; E6; false broad cleanup confidence; repo; 3/4/3/3/1; 67; 12; add component lifecycle harness; C1-007,C1-032
C1-250; Audit process; 1; repository; ownership metadata; future refactors; no machine-readable component-to-CSS/JS owner map beyond convention; contracts remain regex comments; LC; E4/E5; recurrence of duplicate ownership; all UI; 4/4/5/2/3; 76; 12; add ownership manifest/tests after fixes; C1-002,C1-103
```

## Root-cause clustering and reduction

| Cluster | Raw candidates | Evidence status | Finalist | Why it survives compression |
|---|---:|---|---:|---|
| Mobile toolbar hierarchy / Chemistry master drift | 001,004,012,058,066,129,179 | confirmed | 1 | Direct six-controls/five-columns defect and master-reference violation. |
| Toolbar CSS ownership | 002,003,056,065,103,232,250 | confirmed | 2 | Refactor entrypoints exist but prior owner still writes the same selectors. |
| Toolbar JS lifecycle/DOM contract | 005–008,244 | high | 3 | Infinite retry, no teardown and positional discovery undermine the split. |
| Device/mobile shell state | 009,010–012,053–057,180–181 | high | 4 | Two resolvers plus dynamic styles create mismatched thresholds/order. |
| Earth refactor completion | 013–017,108–109,230,242 | confirmed | 5 | Direct legacy Earth page is broken and CI has stale contract references. |
| Subject data graph validation | 018–020,076–083,225 | high | 6 | New data lacks Chemistry-level schema/registry validation. |
| QA generated artifacts | 021–023,111–112 | confirmed | 7 | Deterministic artifact check fails on main. |
| Brittle/obsolete test contracts | 024–025,107,110,113–114 | confirmed | 8 | CI is red for legitimate cache/asset evolution. |
| CSS dynamic injection and patch stack | 010–012,033–036,060–075 | high | 9 | Multiple late stylesheet/style owners conceal visual regressions. |
| Shared storage/economy/audio | 037–043,086–092,201–205,222,231 | medium | 10 | Compatibility is intentional, but boundaries are not uniformly normalized. |
| Subject hierarchy/content parity | 044–046,171–175,207 | medium | 11 | Shells share mechanics but not the visible functional hierarchy of Chemistry. |
| Runtime lifecycle/global ownership | 028–032,093–100,135–143,191–195,249 | medium | 12 | Most are page-lifetime safe today; fix only high-value lifecycle holes first. |
| Shop rendering canonicalization | 025–030,153–154,211–215 | high | 13 | Renderer, CSS fallback and tests disagree about canonical art. |
| A11y/navigation focus | 047–049,125–134,239–242 | medium | 14 | Mobile keypad focus and no-JS shell failure have user-visible paths. |
| Assets/scene readiness | 023,118–120,151–160,216–220 | medium | 15 | No invalid required PNG found, but planned/fallback policy and delivery are debt. |
| Oversized/mixed modules | 161–168 | medium | 16 | Valuable only after contracts are repaired; not an immediate rewrite target. |
| Responsive coverage | 176–190 | medium | 17 | Add targeted viewport gates before CSS changes. |
| Routing/legacy ownership | 084–085,146–150,169–170,227–230 | medium | 18 | Manual URLs and implicit fallbacks are recurrence risks. |
| Local data rendering safety | 121–124 | medium | 19 | Treat as defense-in-depth, below user-visible breakages. |
| Dead/compatibility residue | 028–030,074–075,156–157,233–236 | low | 20 | Do not delete during stabilization; first establish reachability. |

Reduction: 250 raw candidates → 61 evidence-eligible items → 30 root-cause clusters/subclusters → 20 cross-review candidates. Low-confidence candidates are deliberately not promoted merely to hit a number.

# TOP 20 CANDIDATES FOR CROSS REVIEW

## P0 — T01: Chemistry mobile toolbar has six controls in a five-column grid

- Root cause: legacy Chemistry inline/mobile CSS retained the old five-item navigation contract after the portal item made the hierarchy six items.
- Exact evidence: `subjects/chemistry/index.html:34` sets `.mobile-bottom-nav{grid-template-columns:repeat(5,minmax(0,1fr))}`; line 146 nav contains Home, Jars, Records, Shop, Settings, Portal (six children). `assets/css/subject-toolbar/responsive.css:17,31` correctly specifies six columns for the three subject shells.
- Affected files: `subjects/chemistry/index.html`, `assets/css/lobby-scene.css`, `assets/css/mobile-*.css`, relevant toolbar parity tests.
- Exact patch scope: establish the six-item Chemistry mobile navigation geometry and bottom-safe-area reservation in the canonical Chemistry navigation owner; delete only superseded duplicate rule(s) once visual parity is proven.
- Files that MUST NOT be touched: `data/subject-game-content.js`, `assets/js/storage.js`, question banks, scene manifests, user-edited `assets/js/kongjwi-dashboard.js`.
- Regression test: Playwright at 320×568, 375×667, 390×844: exactly one nav row, six reachable controls, no main-content overlap, correct `aria-current`.
- Rollback condition: any loss of Chemistry desktop nav behavior or device-mode forcing parity.
- Dependencies: T02, T04, T17.
- Confidence: 98%.

## P0 — T02: `subject-shell.css` still owns toolbar selectors after modular extraction

- Root cause: the fd5 toolbar extraction added modular owners but did not remove the prior shell declarations.
- Exact evidence: `assets/css/subject-shell.css:11-15,30-33` declares `.subject-shell`, `.subject-topbar`, `.subject-brand`, `.subject-desktop-nav`, `.subject-top-actions`, `.subject-mobile-nav`; same selectors are declared in `assets/css/subject-toolbar/layout.css`, `controls.css`, and `responsive.css`. Current apparent correctness depends on link order.
- Affected files: `assets/css/subject-shell.css`, all three `assets/css/subject-toolbar/*.css`, subject-shell pages, `tests/subject-toolbar-layout.test.mjs`.
- Exact patch scope: leave entrypoint/import architecture intact; remove or relocate only toolbar geometry/visual/breakpoint declarations from `subject-shell.css` according to the stated owner contract.
- Files that MUST NOT be touched: `assets/css/subject-toolbar-parity.css` except cache/version metadata; Chemistry lobby styles; runtime JS/state/data.
- Regression test: static selector/property ownership test plus browser subject shell matrix (Physics/Biology/Earth at 320, 760, 940, 1366px).
- Rollback condition: computed toolbar geometry differs from baseline at any matrix width.
- Dependencies: T01, T03, T17.
- Confidence: 96%.

## P0 — T03: toolbar mount can spin forever and cannot clean up

- Root cause: readiness is polled with recursive RAF and mount returns no lifecycle controller despite adding a storage listener.
- Exact evidence: `assets/js/subject-toolbar/mount.js:27-33` recursively schedules RAF until mount succeeds; `mountSubjectToolbarParity` calls `bindSharedBeanUpdates` at line 21 but discards its returned listener cleanup.
- Affected files: `assets/js/subject-toolbar/mount.js`, `beans.js`, parity bootstrap/tests.
- Exact patch scope: replace polling with a bounded/readiness-event start; retain a disposer; preserve current five-module split and Chemistry contract semantics.
- Files that MUST NOT be touched: `assets/js/subject-toolbar-parity.js` responsibilities, storage schema/key names, Chemistry lobby boot.
- Regression test: fake document missing a required node; assert finite attempts/diagnostic and zero lingering listeners after destroy/remount.
- Rollback condition: toolbar fails to initialize after normal subject shell boot.
- Dependencies: T02, T10.
- Confidence: 91%.

## P0 — T04: duplicate and late-injected Chemistry mobile styles

- Root cause: `lobby-navigation.js` loads mobile styles at runtime while Chemistry has overlapping static links and broad inline rules.
- Exact evidence: `subjects/chemistry/index.html:31` statically links `mobile-fixed-shell.css?v=20260805-fixed-shell5`; `assets/js/lobby-navigation.js:15-35` unconditionally appends the same path with a different query because only dynamically created links have `data-site-stylesheet`.
- Affected files: `subjects/chemistry/index.html`, `assets/js/lobby-navigation.js`, `assets/css/mobile-fixed-shell.css`, `mobile-unified-shell.css`, `mobile-settings-dialog.css`.
- Exact patch scope: choose a single loading owner/delivery mechanism; preserve the existing mobile visual rules until request and computed-style baselines pass.
- Files that MUST NOT be touched: subject toolbar module directory, storage/economy code, asset files.
- Regression test: desktop and mobile browser test asserts unique CSS path requests and expected document link count/order.
- Rollback condition: forced-mobile setting no longer produces the intended Chemistry shell.
- Dependencies: T01, T17.
- Confidence: 96%.

## P0 — T05: Earth legacy quiz route references a deleted module

- Root cause: `f7f7bd5` modularized Earth data and deleted `earth-science-fossil-quiz.js` without completing legacy redirect page migration.
- Exact evidence: `subjects/earth-science/quiz.html:15` imports the nonexistent module; `git show --stat f7f7bd5` records deletion; three Node tests fail ENOENT for the same file.
- Affected files: `subjects/earth-science/quiz.html`, `assets/js/subject-quiz-redirect.js` or a replacement bridge, three stale tests.
- Exact patch scope: point the legacy page to a maintained generic redirect or canonical game URL, then update tests to assert behavior rather than deleted filename.
- Files that MUST NOT be touched: Earth question data, `GameCore`, storage schemas, production scene assets.
- Regression test: load `/subjects/earth-science/quiz.html` and assert canonical Earth training URL; no 404/module error.
- Rollback condition: existing Earth direct/bookmark URLs stop redirecting.
- Dependencies: T06, T07.
- Confidence: 99%.

## P1 — T06: live Earth registry and tests/smokes are out of sync

- Root cause: the geologic-era jar became live but fixed test lists and browser smoke list were not updated.
- Exact evidence: `data/subject-quizzes.js` marks three Earth entries live; `tests/earth-science-fossil-quiz.test.mjs` and `tests/multiscience-architecture.test.mjs` expect third planned; `scripts/smoke-earth-science-fossil-quizzes.mjs` only exercises the first two.
- Affected files: registry, two tests, shared science core test, Earth smoke script.
- Exact patch scope: derive expectations from registry/content or update all explicit lists; add third live training smoke.
- Files that MUST NOT be touched: question wording/images unless a separate content review finds an issue.
- Regression test: graph test that every `status:live` non-Chemistry registry entry maps to mode/questions and is exercised by smoke.
- Rollback condition: deliberately planned jars become launchable.
- Dependencies: T05, T08.
- Confidence: 93%.

## P1 — T07: non-Chemistry content validation is materially weaker than Chemistry

- Root cause: `createSubjectGameContent` implements only a minimal adapter validator while Chemistry retains the full question validator.
- Exact evidence: `data/subject-game-content.js:129-138` checks missing id/training/choice range only; it omits duplicate question/mode IDs, blank choice labels, mode metadata, presentation asset existence, and registry/live route consistency. `docs/DATA_SCHEMA.md` claims globally unique question IDs.
- Affected files: `data/subject-game-content.js`, `data/subject-quizzes.js`, validation script/tests.
- Exact patch scope: add a shared schema/graph validator without changing any question data or storage; run it for every subject content object.
- Files that MUST NOT be touched: existing Chemistry question IDs/answers, localStorage keys, scene renderer.
- Regression test: malformed fixtures for duplicate IDs, empty choices, missing source image, live registry missing implementation/mode.
- Rollback condition: valid existing Chemistry/Biology/Earth banks fail validation.
- Dependencies: T06, T15.
- Confidence: 93%.

## P1 — T08: deterministic animation QA artifacts are stale on main

- Root cause: source/manifest changes were committed without refreshing checked-in generated QA JSON/Markdown.
- Exact evidence: `python scripts/audit-animation-assets.py --check-artifacts` and `tests/animation-asset-pipeline.test.mjs` both report stale `assets/art/game-scene-precision-v1/qa/animation-audit.json` and `ANIMATION_AUDIT.md`.
- Affected files: animation manifest/source assets, the two generated QA files, pipeline test/workflow documentation.
- Exact patch scope: run the existing generator in a dedicated reviewed artifact-refresh change; do not alter source assets merely to make the check pass.
- Files that MUST NOT be touched: runtime scene code, toolbar files, storage/data.
- Regression test: existing `--check-artifacts` command in clean checkout.
- Rollback condition: regenerated audit changes strict-failure/warning semantics unexpectedly.
- Dependencies: T09.
- Confidence: 98%.

## P1 — T09: literal cache-key tests turn valid asset bumps into CI failures

- Root cause: tests assert historical date/version strings instead of semantic cache-busting relationship.
- Exact evidence: `tests/kongjwi-sprite-sheet-sizing.test.mjs:26` expects `20260812-rhythm-cadence2`; `tests/mobile-scene-regression.test.mjs:24` expects `20260808-motion-polish1`; runtime HTML/renderer use `20260814-kongjwi-outfits1`.
- Affected files: two tests, possibly similar cache-key tests, current HTML/renderer only as test inputs.
- Exact patch scope: make tests assert a single versioned outer entry/current cross-file consistency, not a frozen date string.
- Files that MUST NOT be touched: current cache version values unless an actual cache release is needed.
- Regression test: mutate only a cache suffix in a fixture and assert semantic test still passes while missing version fails.
- Rollback condition: test stops detecting absent/duplicate cache boundary.
- Dependencies: T08.
- Confidence: 98%.

## P1 — T10: shop preview asset contract has diverged across renderer, CSS fallback, and test

- Root cause: `f16a9a8` changed outfit previews to refreshed pour sheets/all-sprite previews but static test remained on old cutout/single-sprite assumptions.
- Exact evidence: `assets/js/shop-navigation.js` maps classic-red/blue-scholar/field-work/night-court to pour sheets and declares four sprite keys; `tests/shop-authored-kongjwi.test.mjs` requires three old source-locked cutouts and only `royal-night` sprite. Node suite fails.
- Affected files: `assets/js/shop-navigation.js`, `assets/css/shop-navigation.css`, `tests/shop-authored-kongjwi.test.mjs`, possibly asset manifest/catalog.
- Exact patch scope: select and document one canonical preview source, then update renderer/test/CSS fallback together; no asset deletion.
- Files that MUST NOT be touched: source-locked originals, shop economy/price data, storage schema.
- Regression test: browser check actual loaded image path, first-frame clipping and transparent background per outfit.
- Rollback condition: shop no longer shows the currently intended authored preview.
- Dependencies: T16.
- Confidence: 95%.

## P1 — T11: CI omits the existing cross-subject shell smoke

- Root cause: workflow invokes several browser smokes but not `scripts/smoke-subject-shells.mjs`, which exercises all subject shells, settings, routes and isolation.
- Exact evidence: `.github/workflows/ci.yml` browser job lists lobby, portal, shop, Earth fossil, quiz and layered-scene smokes; it omits the existing shell script. The toolbar refactor therefore has no browser gate.
- Affected files: `.github/workflows/ci.yml`, `scripts/smoke-subject-shells.mjs`.
- Exact patch scope: add the existing smoke to browser CI; no test rewrite initially.
- Files that MUST NOT be touched: production UI, data, assets.
- Regression test: workflow static test or CI run proves command executed.
- Rollback condition: job exceeds timeout; then split/parallelize rather than remove coverage.
- Dependencies: T01, T02, T06.
- Confidence: 97%.

## P1 — T12: current toolbar tests prove file splitting but not exclusive ownership or visual parity

- Root cause: tests inspect strings in the new entrypoint/modules, while the old shell CSS remains unexamined and Chemistry mobile count is untested.
- Exact evidence: `tests/subject-toolbar-layout.test.mjs` asserts entry has no `.subject-topbar` rule, but never asserts `subject-shell.css` lacks it; all its Chemistry assertions are legacy class presence.
- Affected files: toolbar test, `subject-shell.css`, browser smoke suite.
- Exact patch scope: add negative ownership assertions and a DOM/computed-style parity matrix after T01/T02 decisions.
- Files that MUST NOT be touched: toolbar production split structure or Chemistry content text solely to satisfy tests.
- Regression test: duplicate selector fixture fails; Chemistry and three shells compare six control roles at mobile/desktop.
- Rollback condition: tests over-constrain intentional subject theme tokens.
- Dependencies: T01, T02, T11.
- Confidence: 98%.

## P1 — T13: device mode has two competing resolvers and conflicting thresholds

- Root cause: subject shell reimplements device detection while lobby/game import `device-entry`; lobby mobile UI also uses 760px while device entry uses 820px/coarse input.
- Exact evidence: `assets/js/subject-shell.js:58-65` duplicate resolver; `assets/js/device-entry.js` owns viewport CSS variables/event; `assets/js/lobby-navigation.js` sets `MOBILE_UI_BREAKPOINT=760`.
- Affected files: subject shell, device entry, lobby navigation, responsive CSS/tests.
- Exact patch scope: choose `device-entry` as service; make shell consume it; define one threshold contract without changing stored key.
- Files that MUST NOT be touched: existing `kongjuiya-device-mode` value schema, toolbar module boundaries.
- Regression test: forced/auto modes at 760, 761, 820 and coarse pointer across Chemistry and shells.
- Rollback condition: existing user device preference no longer applies on first paint.
- Dependencies: T04, T17.
- Confidence: 89%.

## P1 — T14: shared bean display bypasses storage normalization and same-tab events

- Root cause: toolbar directly parses `kongjuiya-chem-save` and listens only to browser `storage`, which does not fire in the mutating tab.
- Exact evidence: `assets/js/subject-toolbar/beans.js:7-29` parses legacy JSON itself, returns zero on parse failure, and only reacts to exact-key storage events; `GameStorage` is the actual migration/normalization owner.
- Affected files: toolbar beans/mount, storage adapter, shop/game economy event surface, tests.
- Exact patch scope: introduce a neutral read-only economy selector/event facade; retain legacy key/schema unchanged.
- Files that MUST NOT be touched: `STORAGE_KEY`, migration versions, economy balances, cosmetic data.
- Regression test: corrupt save, same-tab purchase, cross-tab update and storage.clear behavior.
- Rollback condition: toolbar shows a balance different from shop/game baseline.
- Dependencies: T03, T18.
- Confidence: 86%.

## P2 — T15: Chemistry and subject shells still have materially different functional hierarchy

- Root cause: Chemistry remains a bespoke lobby with dashboard, mission, upgrade and legacy CSS; non-Chemistry is a simplified generated shell. Class injection emulates visual naming, not shared structure/state.
- Exact evidence: Chemistry page loads `lobby-actions.js/lobby-navigation.js` and its own markup; three shell pages load `subject-shell.js` plus toolbar parity. Mobile grid defect and selector duplication demonstrate drift.
- Affected files: Chemistry lobby, subject shell, registries, toolbar parity, parity tests.
- Exact patch scope: write a behavior/role parity matrix first; migrate only a chosen shared slice later, not a wholesale rewrite.
- Files that MUST NOT be touched: Chemistry storage/migration and game core until a compatibility plan is approved.
- Regression test: cross-subject role/action matrix for home/jars/records/shop/settings/portal.
- Rollback condition: Chemistry-specific progression features disappear or per-subject content/theme is flattened.
- Dependencies: T01, T02, T12.
- Confidence: 80%.

## P2 — T16: dead/dual shop implementations and legacy visual fallback obscure the active renderer

- Root cause: `shop.js`, obsolete cutout code, legacy SVG background CSS, and `shop-navigation.js` coexist; only navigation is loaded by `shop.html`.
- Exact evidence: `shop.html:132` loads `shop-navigation.js`; repository search finds no production `shop.js` import; `shop-outfit-cutout.test.mjs` asserts obsolete cutout pass must not load; CSS retains old outfit sprite background.
- Affected files: shop JS/CSS/tests and asset mappings.
- Exact patch scope: create a reachability map; then retire or quarantine one unused component at a time after T10. No deletion in this audit.
- Files that MUST NOT be touched: active shop purchase/equip code, catalog prices, cosmetics storage.
- Regression test: production entrypoint graph plus screenshot for every category.
- Rollback condition: legacy fallback is still needed for a supported browser/path.
- Dependencies: T10.
- Confidence: 84%.

## P2 — T17: responsive shell behavior lacks the viewport matrix needed for safe CSS consolidation

- Root cause: high-specificity patch stack and duplicated breakpoint policies evolved without CI coverage for 320px, threshold edges, compact landscape and Chemistry-vs-shell comparison.
- Exact evidence: `subject-toolbar/responsive.css` has 700/940/390 rules; device/lobby use 760/820; CI omits shell smoke; Chemistry has inline forced mobile rules.
- Affected files: responsive CSS, device entry/lobby nav, browser scripts/workflow.
- Exact patch scope: add viewport tests before changing visual CSS; use results to drive T01/T02/T04/T13.
- Files that MUST NOT be touched: unrelated game scene geometry or assets.
- Regression test: 320×568, 375×667, 390×844, 760×800, 761×800, 820×800, 1366×768 and compact landscape.
- Rollback condition: baseline accepted rendering changes without an intentional visual decision.
- Dependencies: T01, T02, T04, T11, T13.
- Confidence: 88%.

## P2 — T18: shared state has no clear concurrency/normalization boundary

- Root cause: whole-document localStorage persistence, direct parsers, global Chemistry economy and subject-local records evolved independently.
- Exact evidence: `storage.js` persists shared save; `SubjectGameStorage` composes global and namespaced state; toolbar/theme/audio/lobby read keys directly; no revision/merge mechanism is visible.
- Affected files: storage, subject-storage, subject-game-storage, toolbar beans, cosmetic/audio/theme/lobby modules.
- Exact patch scope: document and test a state ownership matrix; add safe selectors/transaction boundary before considering migration.
- Files that MUST NOT be touched: existing save key/version/data in first pass.
- Regression test: corrupt shapes, same-tab/cross-tab update and two-tab purchase/run race fixtures.
- Rollback condition: any existing save fails to load or loses values.
- Dependencies: T14.
- Confidence: 79%.

## P2 — T19: mobile keypad focus handoff is incomplete

- Root cause: device/layout transition hides the native form and input but never shifts focus to the visible keypad.
- Exact evidence: `assets/js/mobile-keypad.js` sets form/input `hidden` and `aria-hidden` in `hideNativeForm`; no `.focus()` follows. The controller otherwise owns keyboard input.
- Affected files: mobile keypad and mobile game tests.
- Exact patch scope: move focus to first meaningful keypad control only when the hidden input was focused; retain desktop/native fallback behavior.
- Files that MUST NOT be touched: answer evaluation, question data, cadence timing.
- Regression test: keyboard user focused in answer input → force mobile → focus is visible/operable; reverse transition restores valid focus.
- Rollback condition: auto-focus disrupts pointer users or opening countdown.
- Dependencies: T13, T17.
- Confidence: 82%.

## P2 — T20: ESM module type is implicit and CI emits typeless-module warnings

- Root cause: repository lacks local `package.json` declaring module type although many `.js` files use ESM.
- Exact evidence: Node 22 full suite emits repeated `[MODULE_TYPELESS_PACKAGE_JSON]` warnings and reparses `.js` as ESM; CI relies on Node 22 `--check`/tests.
- Affected files: root package/tooling configuration and CI documentation only.
- Exact patch scope: evaluate adding minimal `{ "type": "module" }` in a standalone tooling change after checking Pages has no conflicting CommonJS scripts.
- Files that MUST NOT be touched: browser module imports, runtime source, assets/data.
- Regression test: clean Node 22 syntax/test run has no typeless warnings and same pass/fail results.
- Rollback condition: a Node utility or workflow depends on CommonJS resolution.
- Dependencies: T09.
- Confidence: 94%.
