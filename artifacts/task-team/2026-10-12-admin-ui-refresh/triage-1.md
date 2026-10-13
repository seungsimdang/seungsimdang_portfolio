# triage-1: 1차 리뷰 재검토 게이트

- 일시: 2026-10-13, Claude orchestrator
- 입력: `code-review-1.md`(재작업 경미), `security-review-1.md`(통과, Medium 2)
- 수정 방식: 단독·소범위 수정이라 orchestrator가 메인 체크아웃에서 직접 수정

## 코드 리뷰

| ID | 판정 | 조치 |
| --- | --- | --- |
| M1 뒤로 가기 취소 시 확인창 재노출 | 타당 | `history.forward()`로 생긴 popstate 1회 무시 |
| M2 같은 URL 링크 확인 후 이탈 경고 해제 | 타당 | 확인 통과 시 다음 tick에 `leavingRef` 복원 |
| M3 본문 위쪽 여백 소실 | 타당 | `paddingTop: headerHeight + 48`, 클래스 `pb-48` |
| L1 주석의 요구사항 ID | 타당 | ID 없는 사유 문장으로 교체 |
| L2 `aria-describedby`가 없는 id 참조 | 타당 | 오류가 있을 때만 오류 id 포함 |
| L3 이전 스크립트 실패 시 종료 코드 0 | 타당 | 실패 행이 있으면 `exitCode = 1` |
| L4 Preview DB 교체 누락 시 가드 없음 | 부분 타당 | Preview DB는 이미 분리됨. 코드는 Production 호스트를 알 수 없어 가드 대신 대상 호스트 출력으로 대응(보안 M-1과 같은 수정) |

## 보안 리뷰

| ID | 판정 | 조치 |
| --- | --- | --- |
| M-1 수동 마이그레이션·이전 스크립트의 대상 DB 미표시 | 타당 | 두 스크립트 시작 시 비밀번호 없이 호스트 출력. 이전 스크립트는 기본이 dry-run이고 `--apply`가 명시적 확인 역할이라 추가 프롬프트는 두지 않음 |
| M-2 chunked 요청은 본문 적재 후 크기 검사 | 수정 안 함 | Vercel Function 요청 본문 4.5MB 상한이 플랫폼에서 먼저 적용되고, 관리자 인증 뒤에서만 도달 가능 |
| L-1 Origin 비교에 scheme 미포함 | 수정 안 함 | 이번 사이클 변경 밖의 기존 `admin-route.ts`. HSTS 환경이라 실사용 위험 낮음 |
| L-2 헤더 바이트만 검증 | 수정 안 함 | Blob은 감지한 고정 contentType으로 제공되어 형식 위조로 얻는 이득 없음 |
| L-3 저장 안 한 Blob 고아 파일 | 수정 안 함 | `api-spec.md` 3절에서 범위 밖으로 결정 |
| L-4 업로드 호출 빈도 제한 없음 | 수정 안 함 | 관리자 1인 전용 엔드포인트, 저장소에 rate limit 유틸 없음 |
| L-5 `thumbnails/` 접두 미강제 | 타당 | `isValidThumbnail`에 `/thumbnails/` 경로 조건 추가, 스키마 테스트 갱신 |
| I-1 Preview 마이그레이션 대상 | 해당 없음 | Preview 전용 Neon 브랜치로 이미 분리 |
| I-2 CI `E2E_DATABASE_URL` 대상 | 미확인 | Secret이라 값 확인 불가 |
| I-3 로컬 e2e URL이 Production과 같은지 미검사 | 타당 | `run-e2e-local.sh`에서 `DATABASE_URL`과 같으면 중단 |
| I-4 slug 변경 후 이전 주소 404 | 해당 없음 | 사용자 결정(리다이렉트 없음) |

## 검증

- biome, type-check, vitest 130개 통과
- `migrate-thumbnails.mjs` dry-run(읽기 전용): 대상 호스트 출력 확인, `/images` 썸네일 행 1개(globber)만 존재. 요구사항의 "5개"와 다르므로 F11 실행 전 dry-run 보고 시 재확인 필요

## 2차(사이클 전체 최종) 리뷰

`code-review-2.md`, `security-review-2.md` 모두 통과. 1차 지적 해소와 수정 안 함 사유 타당성 확인.

| ID | 판정 | 조치 |
| --- | --- | --- |
| 코드 Low 1 effect 정리 후 popstate 무시 플래그 잔존 | 타당 | effect 시작 시 `ignoreNextPopRef` 초기화 |
| 코드 Low 2 같은 탭 외부 링크에서 경고 중복 가능 | 수정 안 함 | 재현되지 않았고 중복 확인창일 뿐 데이터 손실 없음 |
| 보안 L-A 잘못된 `DATABASE_URL`이면 예외 출력에 URL 원문 노출 | 타당 | 호스트 파싱을 try/catch로 감싸 변수명만 출력하고 종료 |
| 보안 L-B 로컬 e2e 동일 DB 비교가 문자열 완전 일치 | 타당 | 따옴표·공백·CR·포트·경로·쿼리·`-pooler` 차이를 걷어낸 호스트로 비교 |
| 보안 Info 업로드 본문 상한의 플랫폼 의존 | 반영 | 업로드 route에 주석 추가 |
| 보안 Info CI `E2E_DATABASE_URL` 대상 | 미확인 | Secret이라 사용자 1회 확인 필요 |
