# T09 QA Report 1

## 판정

**통과.** 부분 저장 스키마, 탭별 폼 출력 모양, 폼 오류 경로, 브라우저에서의 핵심 관리자 흐름을 검증했다. 전체 단위 테스트와 타입 검사도 통과했다. 아래 미검증 항목은 실제 OAuth와 일부 저장 흐름에 한정된다.

## 확인 결과

| 영역 | 결과 | 근거 |
| --- | --- | --- |
| `profileUpdateInputSchema` 부분 입력 | 통과 | 일부 키 허용 및 trim, 빈 객체·undefined만 있는 객체·null·잘못된 이메일·알 수 없는 키 거부를 실제 스키마 import로 확인 |
| 폼 출력과 서버 입력 호환 | 통과 | profile home/about/contact, resume entry, project, unchanged-thumbnail 제외 경로, blog create/edit, talk update 출력·입력을 실제 스키마로 비교 |
| `applyServerErrors` / `countErrors` | 통과 | 실제 모듈 import. 배열 오류는 `.root`, 객체 항목은 첫 입력 경로로 매핑하고 `ref`를 제외한 오류 말단 수를 계산 |
| 관리자 화면 | 통과 | 격리 Playwright 12건 통과: 로그인 360px, 관리자 헤더 360/768/810/1024px, logout 미저장 확인·취소 후 이동, 변경 취소, logout 오류 토스트, about 하위 경로 활성 탭, talk 유효성 오류, Markdown 가져오기, 프로젝트 경험 hydration 및 slug 확인 모달, 구 profile/resume 경로 404 |
| 탭별 프로필 요청 | 통과 | 브라우저 요청 가로채기로 home은 4개, about은 skills/tools, contact는 email/github만 보내는 것을 확인. 실제 DB 저장은 하지 않음 |
| 부분 저장 API | 통과 | 메인 세션 실행 결과: Origin 누락과 3101 불일치는 각각 403, `{}`와 알 수 없는 키는 각각 400. name 일부 변경 PUT은 200이며 SQL 비교에서 name 및 `updated_at` 외 프로필 컬럼 보존 확인. name 원복 PUT도 200 |
| 정적·단위 검사 | 통과 | `pnpm test`: 32 files, 423 tests 통과. `pnpm exec tsc --noEmit` 통과. 담당 테스트 3개 파일 Biome 검사 통과 |

`inputName`은 비공개 함수라 직접 import하지 않았다. 공개 함수 `applyServerErrors`를 호출해 해당 내부 경로 매핑을 검증했다.

## 추가한 테스트

- `__tests__/schemas/admin-form-schema.test.ts`: 부분 저장 경계값과 각 폼 출력의 서버 호환성
- `__tests__/utils/form-errors.test.ts`: 서버 오류 입력 경로 매핑과 중첩 오류 개수
- `tests/e2e/admin-tabs.spec.ts`: 격리된 브라우저에서 핵심 관리자 동작

세 파일은 설정된 Vitest/E2E 테스트 경로 안에 있으며, 검증 대상 식별자를 실제 소스에서 import해 호출한다.

## 실행 기록

- `pnpm exec vitest run __tests__/schemas/admin-form-schema.test.ts __tests__/utils/form-errors.test.ts`: 2 files, 15 tests 통과
- `pnpm test`: 32 files, 423 tests 통과
- `pnpm exec tsc --noEmit`: 오류 없음
- `pnpm exec biome check __tests__/schemas/admin-form-schema.test.ts __tests__/utils/form-errors.test.ts tests/e2e/admin-tabs.spec.ts`: 오류 없음
- Playwright 직접 실행: `node /Users/leeseunghyun/Documents/GitHub/seungsimdang_portfolio/node_modules/@playwright/test/cli.js test --config /private/tmp/portfolio-t09-iLTK2f/playwright.qa.config.mjs /Users/leeseunghyun/Documents/GitHub/seungsimdang_portfolio/tests/e2e/admin-tabs.spec.ts`. 임시 서버 `http://127.0.0.1:3100`, 12 tests 통과

첫 병렬 실행에서 기존 `sync-agent-harness.test.ts`가 5초 timeout을 냈지만, 단독 재실행에서는 전체 423건이 통과했다. 마지막 검증은 단독 전체 실행이다.

## 미검증

- GitHub OAuth 외부 왕복과 실제 허용/거부 계정 인증은 실행하지 않았다. 브라우저 테스트는 격리된 테스트 JWT를 사용했다.
- 기존 `pnpm test:e2e` 전체 공개 사이트 스위트는 실행하지 않았다. 이번 변경 대상인 신규 관리자 spec은 별도 임시 서버에서 실행했다.
- API 실제 DB 쓰기는 name 부분 변경과 원복만 확인했다. skills/tools, email/github의 실제 DB 저장은 브라우저에서 요청 범위를 확인하고 API는 입력 스키마 계약으로 검증했다.
- resume/project/blog 전체 저장 및 삭제, 네트워크 회복 뒤 logout 재시도는 실행하지 않았다. resume/talk 검증 표시, project slug 확인창, blog Markdown 가져오기는 브라우저에서 확인했다.
- 경험 목록 전체 오류의 `data-error-focus` 위치로 포커스 이동, 로그아웃 실패 뒤 재시도, resume 폼 전체 검증 케이스는 실행하지 않았다.
- 대화상자 키보드 전체 순환은 검증하지 않았다. 헤더의 logout 터치 영역은 계산된 높이 44px 이상으로 확인했다.
- 초기 전체 테스트의 일시적 timeout 외 발견된 코드 실패는 없다.

## 데이터·환경 영향

브라우저 테스트는 메인 checkout의 `.next`와 사용자 dev 서버(3000)를 건드리지 않는 임시 서버를 사용했다. E2E DB 호스트는 `DATABASE_URL` 호스트와 다른 것을 호스트명만 비교해 확인했다. 직접 API 검증에서 name 값은 원복됐으며, E2E DB의 `updated_at` 및 write quota 시각은 테스트 기록에 따라 바뀌었다. Production DB 쓰기는 수행하지 않았다.
