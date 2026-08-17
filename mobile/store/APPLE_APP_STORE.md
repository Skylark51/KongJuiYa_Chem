# Apple App Store release checklist

기준일: 2026-08-17

## 프로젝트 기준

- Bundle ID: `com.skylark51.kongjuiya`
- Capacitor: 8.4.2
- iOS minimum supported by Capacitor 8: iOS 15+
- App Store Connect 업로드 빌드 환경: Xcode 26+ / iOS 26 SDK+

## 최초 네이티브 프로젝트 생성

macOS에서:

```bash
npm install
npm run mobile:bootstrap
npm run mobile:ios
```

Xcode에서 다음을 확정한다.

1. Signing & Capabilities에서 본인 Apple Developer Team 선택
2. Bundle Identifier가 `com.skylark51.kongjuiya`인지 확인
3. Version / Build 번호 설정
4. 최종 App Icon / launch 리소스 적용
5. 실제 iPhone과 최신 iOS Simulator에서 주요 퀴즈, 상점, 과목 이동, 저장 상태 점검

## App Store Connect 준비

- 새 앱 생성 후 Bundle ID 연결
- 앱 이름, 부제, 설명, 키워드, 카테고리 입력
- iPhone/iPad 대상 기기별 스크린샷 업로드
- App Privacy 문항을 실제 코드/외부 서비스 사용 기준으로 답변
- 최신 age rating 문항 답변
- 지원 URL 및 Privacy Policy URL 등록
- 심사용 연락처와 Review Notes 작성

## 업로드

Xcode에서 `Product > Archive` 후 Organizer의 `Distribute App > App Store Connect`를 사용한다. 업로드한 빌드를 App Store Connect에서 버전에 연결한 뒤 심사 제출한다.

## 주의

- 인증서, provisioning profile, API key는 GitHub에 커밋하지 않는다.
- 분석 SDK, 광고, 로그인, 결제, 서버 저장 기능을 추후 추가하면 App Privacy 답변과 개인정보처리방침을 다시 갱신한다.
- 단순 WebView 래퍼가 아니라 실제 게임 상호작용이 정상 동작하는지 실기기에서 확인한다.
