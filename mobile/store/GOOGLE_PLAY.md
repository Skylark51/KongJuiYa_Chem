# Google Play release checklist

기준일: 2026-08-17

## 프로젝트 기준

- Application ID: `com.skylark51.kongjuiya`
- Capacitor Android: 8.4.2
- Capacitor 8 target SDK: Android 16 / API 36
- Capacitor 8 minimum Android support: API 24+
- Privacy Policy URL: `https://skylark51.github.io/KongJuiYa_Chem/privacy.html`

Google Play은 2026-08-31부터 신규 앱과 앱 업데이트에 Android 16 / API 36 이상 타겟을 요구한다. 이 프로젝트는 Capacitor 8의 API 36 기준으로 맞춘다.

## 최초 네이티브 프로젝트 생성

```bash
npm install
npm run mobile:bootstrap
npm run mobile:android
```

Android Studio에서 다음을 확인한다.

1. Application ID가 `com.skylark51.kongjuiya`인지 확인
2. `targetSdkVersion`이 36인지 확인
3. `versionCode`와 `versionName` 설정
4. 최종 adaptive icon / splash 리소스 적용
5. API 24+ 실기기/에뮬레이터와 최신 Android에서 주요 퀴즈, 상점, 과목 이동, 저장 상태 점검

## Play Console 준비

- 앱 생성 및 기본 스토어 등록정보 입력
- 앱 아이콘, feature graphic, 휴대전화/태블릿 스크린샷 준비
- 앱 액세스, 광고 여부, 콘텐츠 등급, 타겟층, Data safety 문항 작성
- Privacy Policy URL 등록
- 앱 내부의 통합관 하단 `개인정보 처리방침` 링크 동작 확인
- Play App Signing 사용

## AAB 생성 및 업로드

Android Studio에서 `Build > Generate Signed App Bundle or APK > Android App Bundle`을 선택한다. release keystore로 서명한 `.aab`를 내부 테스트 트랙에 먼저 업로드하고 설치 검증 후 production 릴리스로 승격한다.

## 주의

- `.jks`, `.keystore`, 암호, service-account JSON은 GitHub에 커밋하지 않는다.
- 신규 keystore는 안전한 오프라인/비밀 저장소에 별도 백업한다.
- 분석 SDK, 광고, 로그인, 결제, 서버 저장 기능을 추후 추가하면 Data safety와 개인정보처리방침을 다시 갱신한다.
