# triage-2: code-review-2, security-review-1 재판단

- 작성: orchestrator, 2026-10-13
- 기준 커밋: `e9cafb4`
- 재작업 수행자: orchestrator 직접 수정 (사용자 지시, 주석 한 줄, 다른 worktree 없음)

## code-review-2

| finding | 타당성 | 처리 |
| --- | --- | --- |
| Low-1 `limitGuard` 주석이 "테이블별"로만 서술 | 타당 (`portfolio-admin-service.ts:136`) | 사용자 결정으로 이번 사이클에 포함. where를 넘기면 락은 테이블 단위, 개수 검사만 조건 행으로 좁힌다는 주석 한 줄 추가 |

## security-review-1

| finding | 타당성 | 처리 |
| --- | --- | --- |
| L-1 `reorderResumeEntries`의 집합 확인 SELECT와 UPDATE batch 사이에 락 없음 | 사실이나 주장한 피해가 생기지 않음 | 기각. 아래 사유 참고 |
| L-2 admin 쓰기 API 전반에 rate limit 없음 | 타당, 사이클 범위 밖 기존 구조 | 사용자 결정으로 이번 사이클에 포함. 저장 방식은 DB 기반(사용자 선택), backend-developer가 worktree에서 재작업 |
| L-3 `scripts/resume-data.ts`의 `--yes`가 호스트 검증 없이 확인 생략 | 사실이나 명세대로 만든 동작 | 기각. 아래 사유 참고 |
| I-1 `eq(profile.skills, OLD_SKILLS)` 배열 비교 실제 매칭 여부 미확인 | 확인 완료 | 운영 적용 기록(summary.md)에서 skills 10개 갱신 확인. 조치 없음 |
| I-2 시드 존재 확인과 insert 비원자적 | 정보 | 일회성 단일 운영자 스크립트이고 이미 적용 완료. 조치 없음 |
| I-3 lock 키 7_301_004 | 정보 | 조치 없음 |
| I-4 빌드 시 마이그레이션 자동 적용 (사이클 밖) | 정보 | 기존 구조, summary.md push 확인 사항에 이미 기록. 조치 없음 |

### L-1 기각 사유

- `resume_entries.sort_order`에는 unique 제약이 없다(`src/db/schema/portfolio.ts:119`).
- 정렬 중 생성: 생성은 `max(sort_order)+1`을 insert 시점에 계산하므로 정렬 결과(0..n-1) 뒤 n에 붙는다. 순번 충돌 없음.
- 정렬 중 삭제: 사라진 id의 UPDATE가 0행이 되어 간격만 생긴다. 상대 순서만 의미가 있어 허용된 상태(`deleteResumeEntry` 주석과 같은 전제).
- 정렬 두 건 동시: 각 batch가 단일 트랜잭션이라 마지막 요청이 통째로 이긴다. 섞인 순서는 생기지 않는다.
- kind가 다른 id 혼입은 `assertSameSet`과 UPDATE의 kind 조건으로 막힌다. 데이터 노출·권한 문제 없음.
- 코드 주석(`:423-424`)에 이미 한계와 전제가 적혀 있다.

### L-3 기각 사유

- api-spec 10절(`api-spec.md:248`)이 "호스트명 출력 + y 입력 또는 `--yes`"를 명시했고, 기존 `tests/e2e/fixtures/seed.ts`와 같은 방식이다.
- 쓰기는 모두 조건부(seed는 테이블이 비었을 때만, profile은 기대값과 일치할 때만)이고 delete/truncate가 없어 잘못된 DB에 실행해도 피해가 제한된다.
- 운영 적용은 이미 끝났고(2026-10-13), 리뷰어도 "현 상태로 허용 가능"으로 판정했다.

## 재검증

- `node scripts/check-comment-line-breaks.mjs`, `pnpm exec biome check src/services/portfolio/portfolio-admin-service.ts` 통과.
