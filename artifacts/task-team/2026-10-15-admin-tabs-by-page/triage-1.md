# triage-1: 1차 리뷰 재검토 (orchestrator 9-1 게이트)

대상: `code-review-1.md`(통과, M1 L1 L2 L3), `security-review-1.md`(배포 승인, L-1 L-2). 각 finding은 실제 코드를 열어 확인함.

| finding | 확인한 코드 | 타당성 | 처리 |
|---------|-------------|--------|------|
| T07 M1 `profileUpdateInputSchema` 테스트 없음 | `__tests__/schemas/portfolio-schema.test.ts`에 해당 스키마 테스트 없음 | 타당 | 재작업 아님. 신규 테스트는 T09 QA가 작성하는 계약이므로 T09 범위에 포함 |
| T07 L1 `{name: undefined}`가 refine 통과 | `src/schemas/portfolio.schema.ts:136-138` `Object.keys(v).length > 0` | 타당 (JSON 경로로는 도달 불가) | 재작업: 값이 `undefined`가 아닌 키가 하나 이상인지로 판정 |
| T07 L2 about 등 탭 폼 취소 링크가 자기 페이지 | `profile-form.tsx:52-56`, `:186` `cancelHref={href}`. 같은 경로 이동이라 draft 유지, 미저장 상태에서는 LeaveDialog 확인 후에도 화면 변화 없음 | 타당 | 수정 방식이 UX 결정이라 사용자 확인 |
| T07 L3 `toInput` 이중 변환과 제네릭 보정 | `profile-form.tsx:36`, `:58-68`, `:86` | 타당 (동작 결함 아님) | 재작업: section별 키 배열 상수로 단순화 |
| T08 L-1 같은 탭 두 창 편집 시 마지막 저장 우선 | `updateProfile` set 동작 | 기각 | 사용자 확정 D5(낙관적 잠금 없음)와 같은 동작 |
| T08 L-2 `requireAdminPage` redirect에 `from` 없음 | `src/lib/auth/require-admin.ts:29` `redirect("/admin/login")`, 이번 사이클 diff 밖 | 타당 (보안 영향 없음) | 사이클 diff 밖이라 사용자에게 포함/백로그 확인 |
| orchestrator 추가: 미저장 상태 로그아웃 | `use-leave-confirm.ts:78`은 `a[href]`만 가로챔. next-auth `signOut`은 `/signout` POST 후 `window.location.href` 이동이라 beforeunload 기본 창이 세션 종료 뒤에 뜸 | 타당 (기존 동작, 이번 diff가 만든 것 아님) | 사용자에게 포함/백로그 확인 |

## 사용자 결정과 재작업 (2026-10-15)

- 미저장 로그아웃: 이번에 포함. `sign-out-button.tsx`를 링크(`href="/"`)로 바꿔 `use-leave-confirm`의 링크 가드가 세션 종료 전에 LeaveDialog를 띄움. 확인 뒤 `signOut({ redirect: false })` 후 `router.push("/")`로 이동해 beforeunload 기본 창이 다시 뜨지 않음. `admin-button.tsx` 링크 분기에 `onClick` 추가.
- 탭 폼 취소: 마지막 저장값으로 되돌리는 "변경 취소" 버튼(미저장 변경이 있을 때만 활성, ConfirmDialog 확인). `form-parts.tsx` `CancelAction` 분기, `use-admin-form.ts`에 `dirty`·`discard` 노출(baseline을 draft 객체로 보관).
- T07 L1: `profileUpdateInputSchema` refine을 값이 `undefined`가 아닌 항목 존재 여부로 변경.
- T07 L3: `SECTION_SCHEMAS` 제거, `SECTION_KEYS` 상수와 `profileUpdateInputSchema` 클라이언트 검증으로 단순화.
- T08 L-2: 사용자 질문("문제가 되는거임?")에 실익 없음으로 답변, 재작업 없음.
- 수행자: 9-1 예외(사용자 진행 지시, 단순 범위, `git status`에 타인 변경 없음, ListAgents의 다른 세션은 모두 다른 저장소).
- 검증: tsc(.next/dev 생성물 제외) 통과, vitest 408 통과, knip·biome·주석 검사 통과. `pnpm type-check`는 사용자 dev 서버 생성물 `.next/dev/types` 손상으로 3건 실패(소스 무관).
