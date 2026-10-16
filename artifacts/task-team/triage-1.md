# 1차 리뷰 재검토

- 검토자: Codex orchestrator, 2026-10-16.
- 입력: `code-review-1.md`, `security-review-1.md`.
- 기준: HEAD `8737d25`, 사이클 시작 `72f8aa0`.

| Finding | 직접 확인한 근거 | 판정 | 조치 |
| --- | --- | --- | --- |
| T07 High: 느린 다음 이미지 로드 중 빈 카드 | `project-card-thumbnails.tsx`의 `advance`는 로드 여부를 확인하지 않고 index 변경. `prev`는 600ms 후 제거되며 Image에 onLoad 없음 | 타당, 이번 구현의 E-h 위반 | frontend-developer에 격리 worktree 수정 지시. 로드 전 현재 프레임 유지, 실패 프레임 건너뛰기 확인 및 재리뷰 예정 |
| SEC-T08-01 Low: Origin scheme 미비교 | `src/lib/auth/admin-route.ts:45` 이하에서 URL의 host만 비교. 해당 파일은 사이클 diff 밖 | 기존 공통 가드의 한계. 이번 구현에서 도입하지 않음 | 사용자가 이번 사이클 포함 승인. backend 격리 수정 후 메인에 전체 origin 비교 반영 |
| SEC-T08-02 Low: Blob 참조 조회와 삭제 간 경합 | 현재 `deleteBlobIfUnused`와 `git show 72f8aa0:src/services/portfolio/portfolio-admin-service.ts` 비교. 이전에도 참조 SELECT 후 별도 del 호출 | 기존 정리 정책의 경합 한계. 배열 참조 확장은 새 참조 집합을 검사하지만 원자성 한계의 발생 원인은 이전과 동일 | 사용자가 이번 사이클 포함 및 자동 삭제 유지 지시. 삭제 대상 URL 기록과 advisory lock·trigger를 추가한 backend 격리 수정 후 메인에 반영 |

## 직접 검증

- 타입 검사, Biome, knip 통과. Vitest 38파일 478개 통과.
- 수정 전 baseline `pnpm test:e2e:local`: 제한 환경에서 마이그레이션 UnknownError로 중단, 제한 밖 동일 명령 재실행에서 빌드·테스트 DB 마이그레이션 완료 및 desktop/mobile 120개 통과(52.6초).
- E2E는 전용 DB 및 테스트 Blob 이미지 응답을 사용한 결과이며 실제 운영 이미지 업로드·운영 DB 변경의 검증이 아님.
- CodeRabbit은 reviewer가 인증 정보를 사용할 수 없어 실행하지 못함. 자체 리뷰 결과와 구분함.

## 재리뷰 계획

- T07 High 수정은 `code-review-2.md`에서 해결 확인 및 새 finding 없음.
- 보안 Low 두 건만 고친 재작업의 독립 재리뷰는 스킬 11번에 따라 생략하되, 앞선 High 재작업이 있으므로 사이클 전체 최종 T07·T08 리뷰는 1회 수행함.
- Blob 잠금·snapshot 설계는 PostgreSQL의 VOLATILE 함수 내부 쿼리마다 새 snapshot을 얻는 동작에 근거함: https://www.postgresql.org/docs/current/xfunc-volatility.html. 실제 DB 동시성은 전용 E2E DB로 별도 검증 예정.
