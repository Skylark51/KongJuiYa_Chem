# PC 장독대 상품 이미지 하단 잘림 수정

## 문제

PC 콩 상점의 장독대 스킨 카드에서 authored PNG를 `<img class="shop-jar-image">`로 렌더링하고 있음에도 장독대 하단이 동일한 높이에서 잘려 보였다.

원인은 `shop.css`에 남아 있던 구형 장독대 atlas용 `.shop-item-visual.shop-jar-visual::after` pseudo-element가 authored PNG 위에 `z-index: 1`로 다시 그려지고 있었기 때문이다. 즉 새 PNG와 옛 atlas가 동시에 렌더링되는 중복 소유권 문제였다.

## 수정 원칙

- PC 장독대 상품 카드에서는 authored `thumbnail-no-toad.png`만 화면의 source of truth로 사용한다.
- legacy `jars.png` pseudo-element는 PC 장독대 상품 카드에서 완전히 비활성화한다.
- authored jar asset을 pseudo-element보다 높은 명시적 stacking context에 둔다.
- `object-fit: contain`을 유지해 PNG 전체 프레임을 왜곡 없이 보여준다.
- 모바일 장독대 카드 규칙은 변경하지 않는다.
- 회귀 테스트에서 legacy atlas pseudo-element 비활성화와 authored asset 우선권을 검증한다.
