# 원인 분석

- 공용 `src/components/common/project-card.tsx`의 `object-cover`와 기본 중앙 정렬 때문에 세로 원본의 위쪽이 크롭됨.
- 영향 호출부는 `src/app/(public)/page.tsx`, `src/app/(public)/projects/page.tsx`.
- 단순 top 정렬만 적용하면 모바일·프로젝트 목록에서는 해결되지만 1440×900 홈 카드(1192×692)에서는 설명 문구가 계속 잘림. 실제 스크린샷으로 확인.
- Candanta만 상단 정렬하며 이미지 래퍼 폭을 카드 높이 이하로 제한해 카피 영역을 보존. Image fill의 width·height 제약을 지키기 위해 래퍼에서 크기 제어.

