# triage-2: code-review-2 orchestrator 재검토 (9-1 게이트, 2차)

- 대상: `code-review-2.md` (재작업 diff `1eab77e..5555433`)
- reviewer 판정: 통과. 이전 CR1-M1·M2·L1·L2 해결(M1은 잔여 사례 CR2-L1).
- 2차 기준: 타당한 Medium 이상만 자동 재작업, Low는 사용자 결정.

| ID | 심각도 | 판정 | 근거 | 조치 |
| --- | --- | --- | --- | --- |
| CR2-M1 | Medium | 기각 (재작업 불필요) | MDN Navigation API 문서가 "Baseline 2026, Newly available. Since January 2026, this feature works across the latest devices and browser versions"로 표기(2026-10-15 확인). 미지원은 2026년 이전 브라우저뿐이고 admin 사용자는 1명. requirements 7-6에 따라 `window.confirm` 폴백은 두지 않음. 미지원 브라우저에서도 새로고침 경고와 링크 모달은 동작 | summary에 지원 범위 기록. Firefox·Safari 실측은 T09 가능 범위에서 확인 |
| CR2-L1 | Low | 타당 | `markdown-editor.tsx` 탭 복귀가 `Boolean(error)`의 false에서 true 전환에만 반응함. 본문 오류가 남은 채 미리보기에서 다시 저장하면 숨은 textarea로 포커스 실패 | 사용자 결정: 이번 사이클 포함 |
| CR2-L2 | Low | 타당 | `use-leave-confirm.ts` `allowLeaving(LEAVE_MS)`가 확인 후 이동이 일어나지 않아도 5초간 beforeunload 우회를 유지함. 연속 호출 시 이전 타이머가 새 우회를 일찍 끝낼 수 있음 | 사용자 결정: 이번 사이클 포함 |
| CR2-L3 | Low | 타당 | `traverseTo(...)`의 `finished`만 catch하고 `committed` 거부는 처리하지 않음. 기록 항목이 사라진 경우 콘솔 unhandledrejection, 동작 영향 없음 | 사용자 결정: 이번 사이클 포함 |
