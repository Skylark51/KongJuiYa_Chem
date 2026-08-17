# 콘텐츠 대시보드

게임의 원본 퀴즈 데이터를 변경하지 않고 물리학·화학·생명과학·지구과학 콘텐츠 현황과 데이터 품질을 분석하는 개발자 도구입니다. Production 화면에는 링크를 추가하지 않습니다.

## 실행

```powershell
npm run content:analyze
py -3.12 -m http.server 4176 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:4176/tools/content-dashboard/`를 엽니다. 원본 데이터가 바뀌면 `content:analyze`를 다시 실행합니다.

## 검사 기준

- ERROR: 중복 ID, 누락된 본문·category·선택지·정답, 잘못된 정답 index/key 또는 데이터 타입, 존재하지 않는 asset 참조
- WARNING: 해설 누락, 중복 선택지, 3문제 이하 category, 비정상적으로 짧은 본문, 선택지 길이 편차, asset 없는 이미지형 문제, asset 과다 반복, 문제 없는 과목

임계값은 `content-analyzer.js`의 `DASHBOARD_THRESHOLDS`에서 조정할 수 있습니다.

## Export와 테스트

대시보드 상단에서 현재 전체 inventory를 JSON 또는 CSV로 내려받을 수 있습니다. CLI 분석 결과도 `generated/content-report.json`과 `generated/content-inventory.csv`에 생성됩니다.

```powershell
npm run content:test
npm run content:smoke
```

`content:smoke`는 저장소 루트가 `http://127.0.0.1:4176`에서 제공 중일 때 검색, 필터, 상세 패널, export와 반응형 화면을 검사합니다.
