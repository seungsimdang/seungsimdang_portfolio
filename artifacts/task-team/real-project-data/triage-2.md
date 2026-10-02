# triage-2: 2차 재리뷰 9-1 게이트 판정

- 대상: `code-review-2.md`, `security-review-2.md`
- 기준 커밋: 3594d1e

## 재작업

| finding | 심각도 | 확인 결과 | 조치 |
| --- | --- | --- | --- |
| CR2-F1 canonical 상속 | Medium | `src/app/layout.tsx`의 `alternates.canonical: "/"`가 metadata 없는 하위 페이지로 상속됨. about·blog·contact·projects는 서버 컴포넌트라 페이지별 metadata export 가능 | layout에서 제거하고 페이지별 canonical과 title template 적용 |

## 조치 없음

| finding | 사유 |
| --- | --- |
| CR2-F2, SEC2-L1 Vercel 밖 배포 시 localhost canonical | 배포처를 Vercel로 정한 사용자 결정과 일치 |
| CR2-F3 reduced-motion 마운트 1회 검사 | Info. 설정 변경 후 새로고침하면 반영되어 동작 문제 없음 |
| CR2-F4, SEC2-I1, SEC2-I3 | Info. 문제 없음 확인 또는 CSP 범위 밖 결정 |

## 사용자 결정 필요 (사이클 diff 밖)

| finding | 심각도 | 확인 결과 |
| --- | --- | --- |
| SEC2-I2 WordCycler 모듈 전역 `mountedIds` | Info | `src/components/common/word-cycler.tsx`가 effect마다 전역 Set을 clear. 인스턴스가 둘 이상이면 앞선 타이머가 멈출 수 있음. 현재 사용처는 hero 1곳뿐이라 실제 영향 없음 |
