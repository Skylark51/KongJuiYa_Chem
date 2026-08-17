# Quiz Maker

기존 게임의 runtime question schema와 실제 `UIAdapter` 미리보기를 사용하는 개발 전용 도구입니다. 게임 navigation에는 노출되지 않습니다.

## 실행

```bash
node tools/quiz-maker/generate-asset-manifest.mjs
node tools/quiz-maker/server.mjs
```

브라우저에서 `http://127.0.0.1:4177/tools/quiz-maker/`를 엽니다.

## 사용

- 과목 → category → 기존 문제를 선택하면 원본 필드를 손실 없이 불러옵니다.
- `새 문제`로 작성하거나 `복제`로 새 ID를 제안받습니다.
- asset은 과목/폴더/파일명으로 검색하고 thumbnail을 눌러 연결합니다. 한글 경로를 그대로 사용합니다.
- 저장 전 ID, 선택지, 정답, 해설, asset 존재 여부와 renderer 호환성을 검사합니다.
- 기존 문제 수정은 원본 파일을 덮지 않고 안전한 runtime override로 저장합니다.
- `JSON 보기`에는 Quiz Maker wrapper가 아닌 게임이 받는 production question 객체가 표시됩니다.
- `Ctrl+S` 저장, `Ctrl+Shift+D` 복제입니다.

저장 대상은 `data/questions/quiz-maker-authored.js` 하나이며 임시 파일 검증 후 atomic rename합니다. 새 category를 만들면 같은 파일에 기존 training mode schema로 함께 기록됩니다.

## 테스트

```bash
node --test tools/quiz-maker/quiz-maker.test.mjs
node --test tests/*.test.mjs
```
