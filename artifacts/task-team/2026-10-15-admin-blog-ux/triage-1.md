# triage-1: code-review-1·security-review-1 orchestrator 재검토 (9-1 게이트)

- 대상: `code-review-1.md`, `security-review-1.md` (범위 `6aee747..754a208`)
- 판정자: orchestrator. 각 finding은 해당 코드를 직접 열어 확인함.
- reviewer 판정: code-review 재작업(High 1, Medium 2, Low 4), security 배포 승인(Low 2, Info 2).

## code-review-1

| ID | 심각도 | 판정 | 근거 | 조치 |
| --- | --- | --- | --- | --- |
| CR1-H1 | High | 기각 (의도된 2단계 배포) | `package.json` build가 `migrate.mjs --build`를 `next build`보다 먼저 실행하고 Vercel Preview·Production에서 자동 적용함(`scripts/migrate.mjs` 7-14행). 0004를 이번 커밋에 넣으면 빌드 중 컬럼이 먼저 삭제되어 서비스 중인 이전 코드의 `posts.published` 조회가 실패함. `api-spec.md` 1절·3절이 이 사실로 requirements 5.2의 순서를 A(코드)·B(마이그레이션) 커밋 분리로 구체화했고, 롤백 SQL은 `api-spec.md` 3.2절에 있음. 0004 미생성은 결함이 아니라 B 단계 대상 | B 단계: A가 Production에 배포된 뒤 `pnpm db:generate` 산출물만 별도 커밋. `main` 병합 직전 운영 적용 사용자 승인. Preview와 Production은 다른 DB(선행 사이클에서 `main` push 이후에야 운영 DB에 `posts` 생성) |
| CR1-M1 | Medium | 타당 | `markdown-editor.tsx` 238행 textarea가 미리보기 탭에서 `hidden`이고, `use-admin-form.ts` 170-174행이 `[aria-invalid="true"]` 첫 요소에 `focus()`를 호출해 숨은 textarea에는 포커스가 가지 않음 | 재작업: 본문 오류가 있으면 작성 탭이 보이도록 하고, 포커스 effect 시점에 textarea가 보이는 상태인지 보장 |
| CR1-M2 | Medium | 타당 | `use-leave-confirm.ts` `onPopState`가 모든 popstate를 "뒤로 1단계"로 보고 `history.forward()`로 되돌림. 앞으로가기나 여러 단계 이동이면 원위치 복구가 안 되고, forward 항목이 없으면 주소만 바뀐 채 화면이 남음 | 재작업: 방향과 단계에 무관하게 원위치를 복구하는 방식으로 안정화. 불가능하면 `window.confirm`을 남기지 않고 보고 (requirements 7-6) |
| CR1-L1 | Low | 타당 | cleanup이 `ignoreTimer`만 해제하고 `ignorePopRef`를 되돌리지 않음. 되돌림 직후 `active`가 false가 되면 플래그가 true로 고정되어 다음 활성화의 첫 뒤로가기가 조용히 삼켜짐 | 재작업: cleanup에서 플래그 초기화 (M2 재설계에 포함 가능) |
| CR1-L2 | Low | 타당 | `proceed`의 링크 경로가 `allowLeaving(0)`이라 일반 `a`의 문서 이동에서 `beforeunload`가 타이머 이후에 오면 기본 창이 한 번 더 뜰 수 있음 | 재작업: 문서 이동이 끝날 때까지 우회 플래그 유지 |
| CR1-L3 | Low | 기각 | 같은 알림 재발생 시 `renderKey` 교체로 재마운트하는 것은 타이머 재시작과 스크린리더 재낭독을 위한 의도된 구현(`toast-provider.tsx` 194-200, 223행). 같은 알림은 저장·업로드 같은 다른 요소의 행동으로만 다시 생기므로, 그 순간 포커스는 토스트가 아닌 행동 버튼에 있음 | 조치 없음 |
| CR1-L4 | Low | 기각 | 롤백 SQL은 `api-spec.md` 3.2절, 캐시 판단은 1절 6항, 이전 번들 400은 2절에 이미 있음. `window.confirm` 전수 검색 결과(0건)는 orchestrator가 병합 후 재확인함 | summary에 배포 순서·검색 결과 기록 |

## security-review-1

| ID | 심각도 | 판정 | 근거 | 조치 |
| --- | --- | --- | --- | --- |
| Low-1 | Low | 기록만 | reviewer 자체가 조치 불필요로 판정. `yaml` 기본 alias 상한, 1MB 제한, 관리자 본인 브라우저 한정 | 조치 없음 |
| Low-2 | Low | 기록만 | 컬럼 드리프트는 B 단계 전 과도 상태. 운영 DB `published=false` 0건 확인(2026-10-15 읽기 전용 조회) | B 단계 전 수동 DB 수정 금지를 summary에 기록, B 직전 0건 재확인 |
| Info 2건 | Info | 기록만 | 비공개 기능 재도입 시 필터 필요, strictObject 400 동작 | 조치 없음 |

## Bug Team 피드백 확인

- code-review-1이 "결과 피드백 위치" 확인 결과를 남김: 토스트 `fixed bottom-96`, 저장바와 겹치지 않음(정적 계산). 320·375px 실측은 T09.
- `FormStatus` 삭제로 `feature/admin-form-feedback-guard`의 lint 불변식이 성립하지 않음. summary에 기록.
