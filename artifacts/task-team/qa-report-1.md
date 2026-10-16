# QA 보고서 1 - 프로젝트 썸네일 확장

## 판정

**구현 QA 통과.** 현재 코드와 테스트용 프로젝트 데이터 기준으로 회귀·동시성 검증이 통과했다. 단, DPM Core 모바일 썸네일 6장의 운영 데이터 반영과 실제 이미지의 시각 확인은 PC 원본 이미지가 전달되지 않아 미검증이다. 운영 DB/Blob 변경과 배포도 이 QA 범위에서 수행하지 않았다. 최종 사이클 판정은 오케스트레이터의 전체 게이트를 따른다.

## 실행 결과

| 영역 | 실행 및 결과 |
|---|---|
| 전체 단위 테스트 | `pnpm exec vitest run --maxWorkers=2` — 40개 파일 중 39 통과, 1개 skip; 485개 테스트 중 482 통과, 3개 skip. 종료 코드 0, 18.82초. |
| 브라우저 E2E | `pnpm test:e2e:local -- tests/e2e/project-thumbnails.spec.ts --workers=2` — 전체 138개 테스트 통과, 56.2초. 로컬 전용 E2E DB 대상 guard 및 테스트용 이미지 응답 fixture를 사용했다. 종료 코드 0. |
| DB 동시성 통합 | `RUN_THUMBNAIL_DB_TESTS=1 node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run __tests__/utils/portfolio-thumbnail-retirement-db.test.ts` — 오케스트레이터가 격리된 E2E DB에서 실행: 3개 통과, 종료 코드 0, 10.57초. `@vercel/blob.del`은 mock 처리했다. |
| 타입 검사 | `pnpm exec tsc --noEmit` — 통과, 종료 코드 0. |
| Biome | QA 소유 테스트 및 E2E fixture 파일 검사 — 통과. |

단위 테스트의 DB 통합 파일은 기본 실행에서 의도적으로 skip된다. 명시적 opt-in 테스트는 E2E DB와 `DATABASE_URL`의 호스트 분리를 확인하고 실제 portfolio service를 호출한다. QA sandbox에서 해당 DB 연결을 직접 시도한 실행은 네트워크 DNS 제한으로 연결되지 않았으며, DB 쓰기는 일어나지 않았다. 위 표의 DB 통합 성공은 이후 오케스트레이터가 sandbox 밖에서 같은 opt-in 테스트를 실행한 결과다.

## 기능별 검증

- 실제 `ProjectCardThumbnails` 컴포넌트를 import한 SSR 테스트가 초기 마크업에 첫 프레임만 렌더하고 올바른 대체 텍스트를 설정하는 것을 확인했다.
- Playwright 18개 썸네일 시나리오(데스크톱/모바일 각 9개)가 통과했다. 768px 경계와 복귀, 반대 viewport 이미지 미요청, hydration 경고 부재, 4초 간격 및 순환, 느린 이미지 로드 중 현재 프레임 유지, 실패 이미지 건너뛰기, hover/focus 일시정지, reduced-motion에서 고정, 문서 비활성 상태의 전환 정지를 확인했다.
- Origin 검증 테스트에서 설정 scheme과 다른 HTTP/HTTPS, 다른 port, origin에 경로가 추가된 입력을 거부하는 경우를 확인했다. 정상적인 GET 및 Origin 누락 GET 테스트도 통과했다.
- 서비스 테스트와 실제 DB 통합 테스트에서 공유 URL 참조 보존, 퇴역 URL의 재등록 차단, Blob 삭제 실패 뒤 tombstone 유지, 삭제와 새 참조 저장의 경합을 확인했다. 실제 Blob 서비스 삭제는 호출하지 않았다.
- 브라우저 테스트 1차 실행에서는 썸네일 이미지 locator가 반응형 PC/모바일 이미지 두 요소를 함께 잡아 테스트 strict-mode 오류가 났다. 보이는 이미지로 locator를 한정한 뒤 전체 E2E 138개를 다시 실행해 모두 통과했다. 이는 테스트 선택자 문제였으며 제품 동작 실패는 재현되지 않았다.

## 리뷰 게이트 및 잔여 위험

- `code-review-3.md`: 전체 코드 리뷰 통과, Medium 이상 신규 finding 없음.
- `security-review-2.md`: 보안 리뷰 통과, Critical/High 없음. 기존 T08 Low 두 건은 수정 확인.
- 보안 리뷰가 기록한 비차단 Low 잔여사항은 (1) 썸네일 retirement와 이력서 생성이 advisory lock 키 `7301004`를 공유해 무관한 작업이 직렬화될 수 있음, (2) Blob 삭제 실패 후 일반 API 흐름에서 자동 재시도가 보장되지 않아 public 고아 객체와 저장 비용이 남을 수 있음이다. 이번 QA는 이 운영 부하와 재시도 정책을 장시간 장애 조건에서 측정하지 않았다.

## 미검증 및 범위

- DPM Core PC 원본 이미지가 전달되지 않아 모바일 6장과 함께 실제 운영 프로젝트 데이터에 적용하지 않았다. 모바일 단독 저장은 현재 검증된 입력 규칙상 거부된다. 사용자가 PC 이미지를 별도로 전달하기로 한 상태다.
- 테스트 이미지 응답은 공통 작은 PNG fixture다. 실제 DPM 이미지를 카드 크롭, 텍스트 가독성, 색감 기준으로 시각 검수하지 않았다.
- 운영 DB, 운영 Blob 저장소 및 실제 외부 Blob 삭제는 읽기/쓰기를 수행하지 않았고 검증하지 않았다. 배포 후 실제 운영 반영 확인도 이 보고서 범위 밖이다.
- 보안 리뷰의 서로 다른 도메인 간 advisory lock 경합 성능과 Blob 장애 후 수동/자동 정리 운영 절차는 별도 검증이 필요하다.

