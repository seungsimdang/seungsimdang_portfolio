# 보안 리뷰 3차 (최종 Low 수정분 재리뷰)

- 대상 브랜치: feature/admin-blog-ux
- 판정: **배포 승인** (Critical 0, High 0, Medium 0, Low 0, Info 1)
- 범위: security-review-2의 L1~L3 해결 여부, 수정 파일 4종(`use-leave-confirm.ts`, `sortable-list.tsx`, `form-parts.tsx`, `toast-provider.tsx`)이 새로 만든 위험. 정적 읽기만 수행.

## 해결 여부

| ID | 결과 | 근거 |
| --- | --- | --- |
| L1 | 해결 | 링크 분기의 `endLeaving()`이 `finally` 안으로 이동해 `anchor.click()` 동기 예외에도 `leavingRef`, `bypassPopRef`, 타이머가 해제된다. |
| L2 | 해결 | 새로고침 action이 `leaveGuard.allowLeaving()`을 호출한다. 5초 상한 타이머가 `endLeaving`을 예약하므로 reload가 지연되거나 실패해도 우회가 최대 5초 뒤 해제된다. 언마운트 effect도 해제한다. |
| L3 | 해결 | `bypassKeyRef`에 확인한 `targetKey`를 저장하고, `onNavigate`가 `bypassPopRef`이면서 `event.destination.key === bypassKeyRef.current`일 때만 우회를 소비한다. 연타한 다른 기록 이동은 취소 후 다시 확인을 거친다. `traverseTo` 예외 시에도 5초 타이머가 상한이다. |

## 신규 위험

Critical / High / Medium / Low: 없음.

**Info**
- I1. `form-parts.tsx`가 `--admin-action-bar-h`를 `document.documentElement`에 설정한다. 값은 `offsetHeight` 숫자와 `px`만으로 만들어져 주입 면이 없다. 액션 바가 동시에 둘 이상 마운트되면 먼저 언마운트되는 쪽이 변수를 지워 토스트가 기본값 80px로 돌아갈 수 있으나, 현재 구조상 폼당 하나이며 UI 위치 문제일 뿐 보안 영향은 없다.
- `endLeaving`이 `bypassKeyRef`를 비우지 않지만 소비 조건이 `bypassPopRef`와의 AND라서 잔존 키로 우회되지 않는다.
- `toast-provider.tsx`: 토스트 위치 계산은 CSS 변수 `calc`뿐이고 입력 경로가 없다. `Notice` href와 action 출처는 2차 리뷰의 결론이 그대로 유지된다.

## 판정

미해결 취약점이 없고 L1~L3이 모두 해결되었으며 신규 위험도 없으므로 **배포 승인**.

## 한계

- 정적 읽기만 수행했다. Navigation API의 브라우저별 `destination.key` 동작은 실행으로 확인하지 않았다(T09 범위).
- 지정 4개 파일의 변경 지점과 관련 호출부만 읽었고 기존 코드 전체는 다시 읽지 않았다.
