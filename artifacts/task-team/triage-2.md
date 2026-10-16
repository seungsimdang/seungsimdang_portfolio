# 최종 리뷰 재검토

- 검토자: Claude orchestrator, 2026-10-16 (Codex 세션 이어받음).
- 입력: `code-review-3.md`, `security-review-2.md`.

| Finding | 직접 확인한 근거 | 판정 | 조치 |
| --- | --- | --- | --- |
| SEC-T08-03 Low: 썸네일 retirement lock이 이력서 lock `7301004`와 같음 | `portfolio-admin-service.ts`의 `THUMBNAIL_RETIRE_LOCK_KEY`와 `RESUME_LOCK_KEY`가 모두 `7_301_004`, 0007 trigger도 `7301004` | 타당 | 사용자 포함 결정. 서비스 상수를 `7_301_005`로 바꾸고 0008에서 trigger 함수를 같은 키로 교체. 다른 사용처 없음을 grep으로 확인. 프로젝트 생성은 `7301001 → 7301005` 순서만 존재해 역순 획득 없음 |
| SEC-T08-04 Low: Blob 삭제 실패 후 자동 재시도 없음 | `deleteBlobIfUnused`가 `del` 실패를 로그만 남기고, 이후 일반 흐름에서 같은 URL을 다시 넘기지 않음 | 타당 | 사용자 포함 결정, 방식은 "다음 정리 때 재시도" 선택. 0008이 `deleted_at` 추가. 정리 시 이번 URL을 퇴역 기록한 뒤 `deleted_at` null인 모든 URL을 삭제하고 성공한 것만 기록 |
| `code-review-3.md` | Medium 이상 finding 없음 | - | 없음 |

## 재리뷰 생략

- 이번 재작업은 Low 2건(SEC-T08-03, SEC-T08-04)만 고쳤으므로 스킬 11번에 따라 T07·T08 재리뷰를 생략함.
- 재검증: type-check, Biome, knip, 주석 검사, 단위 테스트 통과. 0008을 E2E 전용 DB에 적용 후 컬럼·trigger 키(`7301005`) 확인, DB 통합 테스트 3개 통과. 신규 동작 테스트와 전체 회귀는 T09 2차(`qa-report-2.md`)에서 확인.
