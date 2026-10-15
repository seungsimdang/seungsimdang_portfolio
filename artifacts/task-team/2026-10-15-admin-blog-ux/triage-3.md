# triage-3: 사이클 전체 최종 리뷰 orchestrator 재검토 (9-1 게이트, 2차 이후 기준)

- 대상: `code-review-3.md`(통과, Low 1, Info 2), `security-review-2.md`(배포 승인, Low 3, Info 2). 범위 `6aee747..00e738b`.
- 기준: 타당한 Medium 이상만 자동 재작업, Low는 사용자 결정.

| ID | 심각도 | 판정 | 근거 | 조치 |
| --- | --- | --- | --- | --- |
| CR3-L1 | Low | 타당 (추정, 실측 필요) | `toast-provider.tsx` 토스트 `bottom-96`, `form-parts.tsx` 액션 바가 업로드 문구로 두 줄(약 129px)이 되면 토스트가 저장·취소 줄을 가릴 수 있음. 정적 계산만 있음 | 사용자 결정: 이번 사이클 포함 |
| SEC2-L1 | Low | 타당 | `use-leave-confirm.ts` 링크 분기에서 `endLeaving()`이 `try/finally` 밖에 있어 `anchor.click()` 동기 예외 시 `leavingRef`가 true로 남음 | 사용자 결정: 이번 사이클 포함 |
| SEC2-L2 | Low | 타당 | `sortable-list.tsx` 209행 새로고침 action이 `leavingRef.current = true`만 설정하고 해제하지 않음. reload 지연 중 보호 꺼짐, 사용자가 직접 누른 동작 | 사용자 결정: 이번 사이클 포함 |
| SEC2-L3 | Low | 타당 | 뒤로가기 우회 `bypassPopRef`가 목적 키와 무관하게 다음 traverse 하나를 통과시킴. 확인 직후 연타 시 한 건이 확인 없이 통과 가능 | 사용자 결정: 이번 사이클 포함 |
| CR3-I1, CR3-I2, SEC2-Info 2건 | Info | 기록만 | slug 모달 busyLabel 미표시(액션 바가 저장 중 표시), 브라우저 실측은 T09, 로그아웃은 beforeunload 기본 창, Navigation API 미지원 범위(triage-2 CR2-M1) | 조치 없음 |
