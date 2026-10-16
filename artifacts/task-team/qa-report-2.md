# QA 리포트 2차 (썸네일 퇴역 재시도와 잠금 분리)

## 판정
통과. 실패 0건. 제품 코드는 수정하지 않음.

## 추가한 테스트
단위 (`__tests__/utils/portfolio-admin-service.test.ts`, 실제 `updateProject` 호출, `retireBlobIfUnused`/`deleteRetiredBlobs`는 모듈 내부 함수라 공개 API로 간접 호출)
- 이전 요청에서 삭제가 실패해 남은 퇴역 URL도 다음 정리 때 다시 삭제하고 삭제 시각을 기록한다
- 삭제에 실패한 URL은 삭제 시각을 기록하지 않고 성공한 URL만 기록한다

DB 통합 (`__tests__/utils/portfolio-thumbnail-retirement-db.test.ts`, opt-in 가드 유지, E2E 전용 DB)
- 첫 삭제 실패 뒤 다른 프로젝트 정리 시 같은 URL이 재시도되어 deleted_at이 채워진다 (실패 직후 null 확인 포함)
- 다른 트랜잭션이 pg_advisory_xact_lock(7301004)를 4초 유지해도 썸네일 저장이 3초 안에 끝난다
- 7301005를 잡고 있으면 썸네일 저장이 1.5초 이상 대기한다 (trigger와 서비스가 7301005를 쓴다는 양성 대조)
- 테스트가 만든 프로젝트와 퇴역 행은 afterAll에서 삭제

## 실행 결과
| 명령 | 결과 |
| --- | --- |
| `pnpm type-check` | 통과 |
| `pnpm exec biome check .` | 216 파일, 오류 없음 |
| `pnpm knip` | 출력 없음(통과) |
| `pnpm exec vitest run --maxWorkers=2` | 39 파일 통과 / 1 skip, 484 통과 / 6 skip (skip은 opt-in DB 테스트) |
| DB 통합 (`RUN_THUMBNAIL_DB_TESTS=1 ...`) | 1 파일, 6 테스트 통과 |
| `pnpm test:e2e:local -- --workers=2` | 138 통과 |

## 미검증
- 운영 DB와 Vercel Blob 실데이터 반영(DPM Core 등)은 범위 밖
- DB 통합의 Blob 삭제는 `del` 모의 대역이며 실제 Blob 삭제 호출은 검증하지 않음
- 잠금 테스트는 타이밍 기반(1.5초/3초 임계)이라 느린 네트워크에서 흔들릴 수 있음

## 수정한 파일
- `__tests__/utils/portfolio-admin-service.test.ts`
- `__tests__/utils/portfolio-thumbnail-retirement-db.test.ts`
- `artifacts/task-team/qa-report-2.md`
