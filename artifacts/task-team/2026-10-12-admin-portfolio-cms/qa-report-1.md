# QA 리포트 1차 (T09)

- 브랜치 feature/admin-portfolio-cms, 기준 HEAD 7229e1a. 소스(src/) 수정 없음, 커밋 없음(테스트 5개 stage만).
- 판정: 자동 검증 범위 전부 통과, 소스 결함 발견 없음. 수동 항목(OAuth, revalidate, 모바일, 접근성)과 DB 의존 항목은 미검증.

## 추가한 테스트와 import한 실제 소스

| 테스트 파일 | import한 소스 | 비고 |
| --- | --- | --- |
| `__tests__/utils/admin-guard.test.ts` (10) | `isAllowedGithubId` (`src/lib/auth/admin-allowlist.ts`), `requireAdmin` (`src/lib/auth/require-admin.ts`) | `server-only`, `next-auth`, `auth-options`, `next/navigation`, `@/db`만 vi.mock |
| `__tests__/api/admin-route.test.ts` (21) | `adminRoute` (`src/lib/auth/admin-route.ts`), 실제 `SlugConflictError` 등 4종 (`portfolio-admin-service.ts`), `PortfolioNotSeededError` | 가드는 실제 코드를 통과, getServerSession만 모킹 |
| `__tests__/api/parse-body.test.ts` (10) | `parseJsonBody`, `ApiError` | |
| `__tests__/schemas/portfolio-schema.test.ts` (다수) | `projectCreateInputSchema`, `projectUpdateInputSchema`, `talkCreateInputSchema`, `profileInputSchema`, `orderInputSchema`, `ORDER_SLUGS_MAX`, `isValidThumbnail` | |
| `__tests__/utils/portfolio-read-filter.test.ts` (3) | `toTalk`, `toProfile` (`portfolio-service.ts`) | `@/db` 모킹 |

모든 테스트는 위 식별자를 실제로 호출함(로직 복사 없음).

## 수용 기준별 결과

| 기준 | 결과 | 근거 |
| --- | --- | --- |
| F3-1 비로그인 401 (가드 단독) | 통과 | admin-guard, admin-route |
| F3-1 비로그인 `/admin` 리다이렉트, proxy 동작 | 미검증 | proxy 단위 테스트 범위 밖, e2e에 admin 시나리오 없음 |
| F3-2 allowlist 외 거부, fail-closed (ADMIN_GITHUB_ID 비면 전원 거부) | 통과 | admin-guard (signIn 콜백 자체는 미검증) |
| F3-3 proxy 우회 직접 호출 가드 거부 | 통과 | 401/403 단독 검증 |
| F3-4 noindex 헤더/메타 | 미검증 | 자동 테스트 없음 |
| F3-5 Origin 불일치/없음 403 (POST/PUT/PATCH/DELETE), GET 정상 통과 | 통과 | NEXTAUTH_URL, ADMIN_ALLOWED_HOSTS, 잘못된 NEXTAUTH_URL, host 폴백 포함 |
| 도메인 예외 매핑 (409/404/409/409/409), 500 메시지 미노출 | 통과 | admin-route |
| F4-2 서버 zod 검증 (길이, 필수, strictObject) | 통과 | schema 테스트 |
| F4-5 slug 형식, 변경 불가(update 스키마가 slug 거부), `new` 예약 | 통과 | |
| F4-6 / F8 링크 http(s)만 (`javascript:` 등 거부) | 통과 | project, experience, talk, profile.github(https만) |
| 썸네일 `/images/` 규칙, `..` 차단 | 통과 | |
| 순서 slug 상한/중복/빈 배열 | 통과 | |
| F8 talk date `YYYY.MM` | 통과 | |
| 공개 읽기 필터 raw=false/raw=true | 부분 통과 | `toTalk`, `toProfile`만 검증. `toProject`, `toExperience`, `safeHttpUrl`, `safeThumbnail`은 미export라 미검증(export 추가 요청 가능) |
| parse-body 415/413/400 | 통과 | 멀티바이트 바이트 기준 포함 |
| CR5-02 생성 상한 에러 매핑 (22012, 23505) | 미검증 | `mapCreateError`가 미export(소스 수정 금지). DB 기반 상한/롤백도 미검증 |
| F4-3 원자적 저장, F4-4 동시 중복 409 (DB 유니크) | 미검증 | 실 DB 필요(공유 DB 오염 방지로 미작성) |
| F4-8 / F6 / 6절 revalidatePath 후 공개 페이지 갱신 | 미검증 | 사용자 확인 필요 |
| F9 seed 멱등성, 5/9/2건 | 미검증 | 실 DB 필요. 공개 e2e가 seed된 DB의 5개 프로젝트 상세와 talks를 확인해 간접 지지 |
| F2 공개 페이지 렌더 동일 | 통과(e2e) | 58건 통과 |
| 접근성(label, aria, 포커스), 모바일 레이아웃(admin) | 미검증 | 사용자 확인 필요 |
| GitHub OAuth 실로그인 | 미검증 | 사용자 확인 필요 |

## 실행 결과 (그대로)

| 명령 | 결과 |
| --- | --- |
| `pnpm test` | exit 0. Test Files 11 passed (11), Tests 127 passed (127) (신규 5파일 + 기존 lint 6파일 포함, include가 `__tests__/**`) |
| `pnpm harness:test` | exit 0. Test Files 6 passed, Tests 39 passed |
| `pnpm type-check` | exit 0 |
| `pnpm check` | exit 0. Checked 110 files, no fixes applied |
| `pnpm knip` | exit 0, 출력 없음 |
| `pnpm build` | exit 0 (admin/api 라우트 동적, /work/[id] SSG, Proxy 표시) |
| `pnpm test:e2e` | exit 0. 58 passed (포트 3100, 3000 미사용) |
| `pnpm lint:staged` | exit 0 (biome, 주석 줄바꿈 검사 통과) |
| `pnpm react-doctor:staged` | exit 0. No issues found |

참고: pnpm 경고 "Unsupported engine node >=22.22.1 <25 (current v26.5.1)"가 모든 명령에 출력됨(결과 영향 없음, 환경 이슈).

## 발견한 결함

- 소스 결함 없음.
- 테스트 가능성 제약 2건(결함 아님): `mapCreateError`, `toProject`/`toExperience`/`safeHttpUrl`/`safeThumbnail` 미export. 필요하면 orchestrator가 `export` 키워드 추가만 요청하면 22012/23505 매핑과 프로젝트 읽기 필터 테스트를 추가할 수 있음.
- e2e에 admin 시나리오(미인증 리다이렉트, 401, noindex 헤더)가 없음. 후속 추가 권장.

## 사용자 수동 확인 절차

1. GitHub OAuth: 로컬에서 `ADMIN_GITHUB_ID`에 본인 숫자 id를 두고 `/admin` 접근 시 로그인 화면, 허용 계정 로그인 성공, 다른 계정은 거부되는지 확인.
2. revalidate: 로컬 프로덕션 모드(`pnpm build && pnpm start`)에서 프로젝트/발표/프로필 수정 후 공개 페이지 새로고침으로 반영 확인, 실패 저장은 반영되지 않는지 확인.
3. 상한: 프로젝트 100개 근처 생성 시 409 LIMIT_EXCEEDED 메시지(테스트 DB 브랜치에서만).
4. 모바일/접근성: admin 목록과 폼을 모바일 폭에서 가로 스크롤 없이 사용 가능한지, 키보드만으로 CRUD와 삭제 확인 대화상자 포커스 이동 확인.
5. noindex: `/admin` 응답 헤더 `X-Robots-Tag`와 meta robots 확인.
