# iOS + Android mobile packaging

이 디렉터리는 기존 웹게임을 복제해서 별도 관리하지 않고, 현재 저장소의 웹 자산을 Capacitor 네이티브 셸에 동기화하기 위한 배포 계층이다.

## 고정 식별자

- App name: `콩쥐야 줘때써`
- Bundle / package ID: `com.skylark51.kongjuiya`
- Web bundle directory: `www/`

스토어에서 앱 레코드를 만든 뒤에는 bundle/package ID를 바꾸지 않는 것을 원칙으로 한다. 첫 등록 전에 다른 ID를 사용할 계획이라면 `capacitor.config.json`에서 먼저 변경한다.

## 최초 1회 준비

필수 환경:

- Node.js 22+
- Android: Android Studio + Android SDK
- iOS: macOS + Xcode 26+

명령:

```bash
npm install
npm run mobile:bootstrap
```

- macOS에서는 Android와 iOS 프로젝트를 모두 생성/동기화한다.
- Windows/Linux에서는 Android 프로젝트만 생성한다. iOS는 macOS에서 같은 명령을 한 번 실행한다.
- 생성된 `android/`와 `ios/`는 네이티브 소스이므로 최초 생성 후 Git에 커밋해 두는 것을 권장한다. 빌드 산출물과 서명키는 `.gitignore`로 제외한다.

## 이후 웹게임 수정 반영

```bash
npm run mobile:sync
```

`mobile/build-web.mjs`가 현재 `index.html`, `shop.html`, `record-detail.html`, `assets/`, `data/`, `subjects/`를 `www/`에 새로 구성한 뒤 Capacitor가 네이티브 프로젝트에 복사한다. 따라서 웹게임과 앱 버전이 분기되지 않는다.

플랫폼별로 열기:

```bash
npm run mobile:ios
npm run mobile:android
```

실기기/에뮬레이터 실행:

```bash
npm run mobile:run:ios
npm run mobile:run:android
```

## 아이콘 / 스플래시

스토어 제출 전에 루트 `resources/`에 최종 원본 PNG를 배치한다.

- `icon-only.png`: 최소 1024x1024
- 필요 시 `icon-foreground.png`, `icon-background.png`: 최소 1024x1024
- `splash.png`: 최소 2732x2732
- 필요 시 `splash-dark.png`: 최소 2732x2732

그 다음:

```bash
npm run mobile:assets
npm run mobile:sync
```

브랜드 최종 이미지가 아직 확정되지 않아 실제 PNG는 저장소에서 임의 생성하지 않는다. Capacitor 기본 리소스로 개발 빌드는 가능하지만, 스토어 제출 전 최종 브랜드 리소스로 교체해야 한다.

## 배포 문서

- Apple: `mobile/store/APPLE_APP_STORE.md`
- Google: `mobile/store/GOOGLE_PLAY.md`

## 저장소에 넣지 말아야 할 것

Apple 인증서, provisioning profile, Android keystore, keystore 암호, App Store Connect API key, Google Play service-account key 등 서명/계정 비밀정보는 절대 커밋하지 않는다.
