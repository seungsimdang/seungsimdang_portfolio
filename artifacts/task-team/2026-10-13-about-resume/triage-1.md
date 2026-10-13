# triage-1: code-review-1 재판단

- 작성: orchestrator, 2026-10-13
- 기준 커밋: `4284a29`
- 사용자 지시: 코드 리뷰 재작업 진행 (보안 리뷰, QA는 이번 범위 밖)
- 재작업 수행자: orchestrator 직접 수정 (사용자 지시, 단순 수정, 다른 세션·worktree 없음 확인)

| finding | 타당성 | 처리 |
| --- | --- | --- |
| Medium-1 경력 힌트(제목=회사명)와 시드(제목=직함) 의미 반대 | 타당 (`resume-labels.ts:18`, `scripts/resume-data.ts:24-25` 확인) | 수정: 힌트를 제목=직함, 부제=회사명으로 변경, `design-spec.md` 3.2 표 갱신. 운영 데이터는 그대로 |
| Low-1 detail/tag 문자열을 key로 사용해 중복 시 충돌 | 타당 (`resume-section.tsx`) | 수정: 위치와 값을 함께 key로 사용 |
| Low-2 text-h3 크기, grid 임의값 판단 | 판단 항목 | 코드 변경 없음. text-h3는 T09 시각 확인, grid 템플릿 임의값은 허용 |
| Low-3 삭제 메시지를 work 섹션에만 표시 | 타당 (`resume/page.tsx`) | 수정: 삭제 후 `deleted=<kind>`로 이동하고 해당 섹션에 표시 |
| Low-4 상한 검사 SQL을 limitGuard 대신 인라인 중복 | 타당 (`portfolio-admin-service.ts`) | 수정: `limitGuard`에 상한과 조건 인자를 추가해 재사용 |
| Low-5 신규 스키마·정렬·상한 자동 테스트 없음 | 타당 | 이번 재작업에서 제외. Task Team 계약상 신규 테스트는 T09 QA가 작성하므로 T09로 이관 |

## orchestrator 추가 발견

- `RESUME_LOCK_KEY = 7_301_003`이 `scripts/migrate.mjs`의 마이그레이션 advisory lock 키(7301003)와 같았다. 이력 생성과 마이그레이션이 서로 불필요하게 직렬화되므로 `7_301_004`로 변경했다. 이번 사이클 diff 안의 코드라 함께 수정했다.

## 재검증

- `pnpm exec tsc --noEmit`, `pnpm exec biome check src`, `pnpm exec vitest run`(188 통과), `node scripts/check-comment-line-breaks.mjs` 통과.
