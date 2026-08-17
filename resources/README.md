# Native app icon and splash sources

Capacitor native resource generator가 읽는 원본 이미지 위치다.

스토어 제출용 최종 디자인이 확정되면 다음 PNG를 이 폴더에 둔다.

- `icon-only.png` — 1024x1024 이상
- `icon-foreground.png` — 1024x1024 이상, Android adaptive icon 사용 시
- `icon-background.png` — 1024x1024 이상, Android adaptive icon 사용 시
- `splash.png` — 2732x2732 이상
- `splash-dark.png` — 2732x2732 이상, 선택

생성 명령:

```bash
npm run mobile:assets
npm run mobile:sync
```

원본 PNG는 최종 브랜드 에셋을 그대로 사용하고 업로드 과정에서 저화질로 재압축하지 않는다.
