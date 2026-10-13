# 원인 분석

- 위치: `src/components/common/project-card.tsx` - `<Image fill>`의 직접 부모가 `sticky top-160` 클래스를 가진 `<Link>`
- 원인: next/image는 `fill` 이미지의 부모 position을 absolute·fixed·relative 중 하나로만 허용함. sticky도 containing block을 만들어 실제 렌더는 정상이나 개발 모드 검사에서 경고 발생
- 수정 범위: 썸네일과 그라데이션 오버레이를 `absolute inset-0` 래퍼로 감싸 Image의 부모를 absolute로 변경. 카드의 sticky 동작은 유지
