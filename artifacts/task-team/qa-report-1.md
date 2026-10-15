# QA 보고서 1: 블로그 검색 (feature/blog-search, HEAD 5d7409a)

## 요약

- 판정: 통과. 실패 항목 없음. 일부 항목은 미검증으로 분류함(아래 표 참고).
- 신규 vitest 테스트 4파일 35건, 신규 Playwright e2e 1파일 12건(desktop/mobile 합 24건) 작성.
- 전체 vitest 466건 통과, type-check, biome, knip, 주석 줄바꿈 검사, em-dash 검사, harness:test(47건) 통과.

## 작성한 테스트 파일

| 파일 | 대상 (실제 소스 import) | 건수 |
|------|------------------------|------|
| `__tests__/utils/blog-query-params.test.ts` | `normalizeSearchQuery`, `escapeLikePattern`, `parseBlogListParams`, `parseBlogListSearchParams` | 18 |
| `__tests__/utils/safe-error-log.test.ts` | `summarizeErrorForLog` (`server-only`는 기존 관례대로 vi.mock) | 4 |
| `__tests__/utils/get-query-client.test.ts` | `getQueryClient().getDefaultOptions().queries.retry` 호출 (5xx 미재시도, 네트워크 오류 1회, 4xx 1회) | 5 |
| `__tests__/utils/blog-search-service.test.ts` | `listPosts` (db만 mock, drizzle `PgDialect`로 where 조건을 SQL과 파라미터로 렌더링해 비교) | 6 |
| `tests/e2e/blog-search.spec.ts` | 실제 빌드 앱 대상 Playwright | 12 x 2 프로젝트 |

- 복사 테스트 없음. 모든 테스트가 소스의 export를 직접 import해 호출함.
- AC12 서비스 조건은 DB 없이 검증함: db를 mock하고 `where`에 전달된 조건을 `PgDialect.sqlToQuery`로 렌더링해, count와 목록 쿼리의 SQL이 동일함, 이스케이프된 패턴(`%a\%\_\\'; drop table posts;--%`)이 바인딩 파라미터로만 전달되고 SQL 문자열에 포함되지 않음, q 없음/공백이면 조건과 batch 없음, 0건이면 목록 쿼리 생략, 초과 page는 마지막 페이지로 보정됨을 확인함. 실제 ILIKE 매칭 결과(대소문자, 부분 일치)는 이 테스트로 검증되지 않으며 e2e와 curl로 대체함(아래 참고).

## e2e를 저장소에 추가한 판단 근거

- 기존 `tests/e2e/`에 Playwright 구조(`playwright.config.ts`, 공개 `blog.spec.ts`, 관리자 인증 쿠키를 만드는 `admin-tabs.spec.ts`, 고정 fixture 3건 `fixtures/portfolio.ts`)가 있고 `pnpm verify`가 `test:e2e:local`을 포함하므로, 같은 구조로 `blog-search.spec.ts`를 추가함.
- 디바운스, IME 조합, replaceState, 뒤로가기, 로딩 중 이전 결과 유지는 jsdom/vitest로 재현할 수 없고 브라우저 검증이 유일한 회귀 방지 수단임.
- 관리자 케이스는 `admin-tabs.spec.ts`와 같이 `NEXTAUTH_SECRET`/`ADMIN_GITHUB_ID`가 없으면 skip됨.
- 주의: 이 spec은 `pnpm test:e2e:local`(E2E_DATABASE_URL, fixture 시드 DB)에서 돌도록 작성됨. fixture 제목(`테스트 글 2`)과 본문(`두 번째 글 본문.`)에 의존함.

## 실행 명령과 결과

| 명령 | 결과 |
|------|------|
| `pnpm exec vitest run __tests__/utils/{blog-query-params,safe-error-log,get-query-client,blog-search-service}.test.ts` | 4파일 35건 통과 |
| `pnpm exec vitest run` (전체) | 37파일 466건 통과 |
| `pnpm type-check` | 통과 |
| `pnpm exec biome check .` | 210파일 오류 없음 (신규 thenable mock에 noThenProperty ignore 사유 주석 1건) |
| `pnpm knip` | 출력 없음(통과) |
| `node scripts/check-comment-line-breaks.mjs` | 종료 코드 0 |
| em-dash grep (신규 5파일) | 없음 |
| `pnpm harness:test` | 7파일 47건 통과 |
| `DATABASE_URL=<E2E DB> pnpm build` | 성공 (`/api/blog/posts`, `/blog` 동적 라우트 확인) |
| `next start -p 3124` + curl | 아래 표 |
| 임시 config(`-c`, 포트 3124)로 `playwright test blog-search.spec.ts` | desktop 12 + mobile 12 = 24건 통과 |

- 실행 환경: 빌드와 서버는 `DATABASE_URL`을 `E2E_DATABASE_URL`(fixture 3건 시드 DB)로 덮어써 실행. DB는 읽기만 했고 쓰기/시드/마이그레이션 없음. 운영 DB는 건수 조회(`select count`)만 1회 수행함.
- 3000번 포트는 사용하지 않았고, 3124 서버는 `kill $(lsof -ti tcp:3124)`로 종료 후 포트 점유 없음을 확인함.
- 중간 실패 이력: 최초 e2e 8건 실패는 모두 테스트 코드 문제(합성 composition 이벤트가 bubbles 없음, sr-only 상태 영역과 본문의 locator 중복, `request` fixture에 쿠키 미공유, 범용 list role 카운트). 소스 결함 아님. CDP `Input.imeSetComposition` 실제 IME 경로와 `context.request`로 수정 후 전부 통과.

curl 확인(E2E DB, 3124):

| 요청 | 결과 |
|------|------|
| `/blog` | 200, robots 메타 없음 |
| `/blog?q=%20%20` | 200, robots 메타 없음 |
| `/blog?q=본문`, `/blog?q=본문&q=x` | 200, `<meta name="robots" content="noindex, follow"/>` |
| `/blog?q=테스트 글 1` | 첫 HTML에 input value와 `검색 결과 총 1개 중 1-1번째` 포함 (SSR prefetch) |
| `/api/blog/posts?q=본문` | 200, `cache-control: no-store`, total 3 |
| `/api/blog/posts?q=%25` | 200, total 0 (전체 반환 아님) |
| `/api/blog/posts?q=a&q=b` | 200, 첫 값 `a`만 적용(total 1) |
| `/api/admin/posts?q=x` (인증 없음) | 401, `x-robots-tag: noindex, nofollow` |

## AC별 분류

| AC | 판정 | 근거 |
|----|------|------|
| AC1 | 통과 | e2e/curl로 "두 번째", "본문" 검색 결과 확인. 정렬 순서는 curl 응답이 published_at desc임을 확인. 대소문자 무시는 ilike 사용을 서비스 테스트의 SQL(`ilike`)로만 확인, 실DB 대소문자 케이스는 미실행 |
| AC2 | 통과 | 서비스 테스트(q 없음/공백 시 조건 없음), curl(`q=%20%20`에 robots 메타 없음), 파서 테스트 |
| AC3 | 통과 | 서비스 테스트(count와 목록에 category `@>`와 ilike 동시 적용), e2e(카테고리 탭 + q) |
| AC4 | 통과 | 파서 테스트, curl `q=a&q=b` |
| AC5 | 통과 | 파서 테스트(공백 축약, NFD to NFC). NFD 입력의 실DB 일치는 미실행 |
| AC6 | 통과 | 파서 테스트(300자 to 100, 서로게이트, NFD 선정규화). 입력창 `maxLength`는 소스 확인만(e2e 미검증) |
| AC7 | 통과 | `escapeLikePattern` 단위, 서비스 테스트(패턴 바인딩), curl `q=%` total 0 |
| AC8 | 통과 | 서비스 테스트에서 SQL 문자열에 `drop table` 미포함, 파라미터로 전달 |
| AC9 | 미검증 | `dangerouslySetInnerHTML` 미사용은 소스 확인만, XSS 렌더 e2e 미작성 |
| AC10 | 통과 | 서비스 테스트(total, totalPages), e2e 개수 문구 |
| AC11 | 통과 | 서비스 테스트(page 999 to 3, 0건 시 1) |
| AC12 | 통과 | 위 서비스 테스트. 실DB ILIKE 의미는 e2e/curl로 보완 |
| AC13 | 통과 | e2e에서 `getByRole("searchbox", { name: "블로그 글 검색" })` 사용(label 연결 확인) |
| AC14 | 통과 | e2e: 타이핑 직후 URL에 q 없고 `/api/blog/posts` 요청 0건, 이후 q 반영 |
| AC15 | 통과 | e2e: CDP IME 조합 중 700ms 동안 URL 변경 없음, 조합 확정 후 q 반영 |
| AC16 | 통과 | e2e: `?page=2`에서 검색 후 page 제거 |
| AC17 | 통과 | e2e: 검색 후 뒤로가기가 이전 페이지(/about)로 이동(replaceState) |
| AC18 | 통과 | e2e: 지우기 버튼/Esc 후 q 제거. "빈 값 검색 요청 없음"은 별도 요청 수 검증 미수행 |
| AC19 | 통과 | e2e: 지우기 후 category 유지, 탭 이동 후 q 유지 |
| AC20 | 통과 | e2e: `?q=글` 직접 진입 시 입력창 값 "글". 새로고침/앞으로가기 동기화는 별도 e2e 미작성 |
| AC21 | 통과 | curl/e2e: 첫 HTML에 결과 포함, 비해당 글 제외 |
| AC22 | 미검증 | 오래된 응답 덮어쓰기 방지(abort signal 전달, 키 기반 캐시)는 소스 확인만, 지연 응답 e2e 미작성 |
| AC23 | 통과 | e2e: 1.5초 지연 중 `ul[aria-busy=true]`와 이전 결과 링크 유지, 완료 후 갱신 |
| AC24 | 미검증 | 오류 문구와 다시 시도 e2e 미작성 (route abort 시나리오 미수행) |
| AC25 | 미검증 | `role=status aria-live=polite` 영역 존재는 e2e 중 locator 충돌로 간접 확인, 낭독 문구 내용 검증은 미수행 |
| AC26 | 미검증 | fixture가 3건뿐이라 페이지네이션 링크의 q 유지 e2e 불가. 소스(`ResultPagination`의 query)만 확인 |
| AC27 | 통과 | e2e: 탭 이동 후 q 유지 |
| AC28 | 통과 | e2e: `"두 번째" 검색 결과 총 1개 중 1-1번째`, curl `검색 결과 총 1개 중 1-1번째`. 카테고리 접두 문구는 미검증 |
| AC29 | 통과 | e2e: `Other 카테고리에서 "..."에 대한 검색 결과가 없습니다.`, 목록/페이지네이션 없음, 초기화 링크가 `/blog?category=Other`로 이동 |
| AC30 | 미검증 | q 없을 때 기존 빈 상태 문구는 e2e 미작성 (기존 fixture에 빈 상태 없음) |
| AC31 | 통과 | 인증 쿠키로 `/admin/blog`에서 자동 검색과 0건 문구, "새 글" 버튼 유지 확인(desktop/mobile). 50건 페이지 크기는 서비스 호출 인자 소스 확인만 |
| AC32 | 통과 | curl/e2e: 비인증 `/api/admin/posts?q=x`가 401, 인증 시 200과 검색 적용. 공개 API 응답에 관리자 전용 필드 없음(items 필드 확인) |
| AC33 | 미검증 | 행 마크업 불변은 spec 미작성, 소스 확인만 |
| AC34 | 미검증 | 기존 `/blog?page=2`, `?category=X` 동작은 기존 `blog.spec.ts`(미재실행)와 이번 e2e의 category 흐름으로 간접 확인. 픽셀 레이아웃 비교 미수행 |
| AC35 | 통과 | biome, knip, 주석 검사, em-dash 검사 통과. tailwind 규칙 위반 여부는 본 QA에서 별도 검사하지 않음 |
| AC36 | 일부 | `pnpm verify`는 실행하지 않음. 구성 요소 중 harness:test, knip, biome check, type-check는 개별 통과. harness:check와 test:e2e:local(E2E 전체 재빌드)은 미실행 |
| AC37 | 통과 | e2e/curl: q 있을 때 `noindex, follow`, q 없음/공백만이면 meta 없음 |

## 추가 요청 항목

| 항목 | 판정 | 근거 |
|------|------|------|
| 재시도 정책(5xx 미재시도, 네트워크 1회) | 통과 | `get-query-client.test.ts` |
| 오류 로그에 메시지 미포함 | 통과 | `safe-error-log.test.ts`에서 name/pgCode만 반환, 메시지 문자열이 직렬화 결과에 없음 |
| `/blog` 공개 응답과 관리자 401 | 통과 | 위 curl 표 |
| SSR 경로 DB 시간 초과 폴백(F2-01/S2-02) | 미검증 | 재현하려면 statement_timeout(2000ms)을 넘는 느린 쿼리가 필요해 fixture 3건 DB에서 재현 불가. 설계상 근거는 `blog-service.ts` 주석: 서버 페이지 경로는 `QueriesHydration`이 fetchQuery 실패를 잡아 `skipSsrOnError` 기본값에 따라 `ClientOnly`로 폴백하고 클라이언트 조회로 넘어감. 라이브러리 기본값 동작은 실행으로 확인하지 못함 |
| 관리자 화면 브라우저 확인 | 통과(제한적) | 로컬 env의 NEXTAUTH_SECRET으로 JWT 쿠키를 만들어 실행(기존 `admin-tabs.spec.ts` 패턴). 관리자 화면의 디바운스/IME/뒤로가기 등은 공개 화면과 같은 컴포넌트라 공개 쪽 spec으로 대신하고 관리자는 검색, 0건, 새 글 버튼만 확인 |

## 남은 위험과 권고

- 미검증 AC(9, 22, 24, 25 일부, 26, 30, 33, 34)는 요청한 최소 범위 밖이거나 fixture 한계로 이번에 검증하지 못함. 필요하면 후속으로 route 지연/abort를 쓴 e2e를 추가 가능.
- 이번 e2e는 `pnpm test:e2e:local` 전체 흐름(자체 webServer 3100, 빌드 시 `MIGRATE_ON_BUILD=1`)으로는 실행하지 않았음. 같은 spec을 3124 서버와 임시 config로 실행했고, 임시 config와 test-results는 삭제함.
- 구현 코드 수정 없음. export 추가 요청 없음(모든 대상이 이미 export됨).
