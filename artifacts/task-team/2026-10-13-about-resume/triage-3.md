# triage-3: security-review-2, security-review-3 재판단

- 작성: orchestrator, 2026-10-13

## security-review-2 (기준 커밋 `13b214f`)

| finding | 타당성 | 처리 |
| --- | --- | --- |
| L-4 고정 윈도 경계에서 약 2배 버스트 | 타당 | 사용자 결정으로 이번 사이클에 포함. backend-developer가 worktree에서 슬라이딩 윈도 카운터로 전환(`e6e0e5b`). 미적용 0002를 `0002_blushing_toro`로 재생성 |
| I-5 마이그레이션 전 코드 배포 시 admin 쓰기 500 | 정보 | Vercel 빌드의 `migrate.mjs --build`가 선행 적용. 운영 반영 순서는 summary.md에 기록 |
| I-6 거부 요청도 upsert 실행 | 정보 | 조치 없음 |
| I-7 락 대기 요청의 now() 오차 | 정보 | 조치 없음 |

## security-review-3 (기준 커밋 `e6e0e5b`)

| finding | 타당성 | 처리 |
| --- | --- | --- |
| L-4 잔여(슬라이딩 카운터 근사 한계) / I-8 | 정보 | 이 방식의 알려진 한계로 수용 |
| L-5 Retry-After가 실제 허용 시점보다 약 W/prev초 이름 | 타당 (`rate-limit-service.ts:48-56`, 다음 요청의 +1 누락, count가 상한 초과일 때 다음 버킷 경계에서 다시 거부) | 사용자 결정으로 이번 사이클에 포함, 사용자 지시로 orchestrator 직접 수정. `secondsUntilNextAllowed`로 분리해 현재 버킷 안은 `W * (1 - (MAX - count - 1) / prev)`, 그 외는 버킷 잔여 + `W * (1 - (MAX - 1) / count)` |
| I-9 경계 수 ms 동시 요청 시 새 버킷 행이 되돌려질 수 있음 | 정보 | 조치 없음 |
| I-5 보충: 구 0002_small_famine이 적용된 DB가 있으면 실패 | 확인 | 구 0002는 push 전 커밋에만 있었고 DB 접속 명령을 실행한 적 없음. 어느 DB에도 미적용 |

## 재검증

- 수치 검증(scratchpad 스크립트): 거부 상태 6가지(c, prev, 경과초 조합)에서 계산한 Retry-After 시점의 다음 요청이 모두 허용됨. 1초 앞 시점은 거부됨(c=1, prev=60 확인).
- `pnpm exec tsc --noEmit`, `pnpm exec vitest run`(188 통과), `biome check`, `knip`, `check-comment-line-breaks.mjs` 통과.
