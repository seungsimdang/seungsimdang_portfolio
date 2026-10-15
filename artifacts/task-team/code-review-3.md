# code-review-3: 블로그 검색 사이클 전체 최종 리뷰

사이클 전체 최종 리뷰. 범위는 `git diff 288f7a5 HEAD -- src __tests__ package.json pnpm-workspace.yaml` (하네스 변경 제외).

## 이전 finding 처리 확인

code-review-1, 2와 triage-1, 2에서 해결·기각된 항목은 다시 올리지 않았다. 아래는 사이클 전체를 파일 간 상호작용 기준으로 읽고 확인한 결과다.

## 확인한 정합성 (문제 없음)

- query key 일치: 서버 prefetch key는 `{page, category: undefined, q: undefined}`, 클라이언트 key는 `parseBlogListParams`의 키 생략 객체다. TanStack은 JSON 기반 해시라 undefined 키가 무시되어 같은 해시가 된다.
- 공개/관리자 모두 `normalizeSearchQuery`, `normalizeCategoryParam`, `parsePageParam`을 `src/utils/blog-query-params.ts` 한 곳에서 공유한다. 서버 페이지, Route Handler 2종, 클라이언트가 같은 규칙이다.
- `listPosts`: count와 rows가 같은 `where`를 쓴다. 검색어가 있을 때만 `set_config` batch를 거쳐 기존 3-인자 호출(검색 없음)은 경로가 변하지 않는다. LIKE 이스케이프는 서비스 한 곳이다.
- 관리자 GET은 `adminRoute`의 인증 가드를 거치고 쓰기 쿼터와 Origin 검사는 MUTATING 메서드에만 걸린다(GET 대상 아님). 공개 GET은 DB write 없음, `no-store`.
- 오류 로그: 공개 라우트와 `admin-route.ts` 모두 `summarizeErrorForLog`만 사용해 검색어가 로그에 남지 않는다.
- `server-only` 경계: 클라이언트 번들이 가져오는 `blog-query-params.ts`, `blog-posts-keys.ts`, `blog-posts-queries.ts`는 서버 전용 모듈을 import하지 않는다.
- 관리자 목록 변경 후 갱신: 하이드레이션 데이터는 서버 `dataUpdatedAt`이 더 최신이라 브라우저 QueryClient 캐시를 덮어쓴다. 기존 `revalidatePath("/", "layout")` 경로와 충돌하지 않는다.
- 사이클 한정 식별자(AC/F/S 번호 등) 인용: `src` 전체 grep 결과 구현 주석에 없음. 주석 줄바꿈 검사기(`scripts/check-comment-line-breaks.mjs`)는 위반 0건, `src`에 em-dash 없음.
- Tailwind: 새 클래스는 px spacing 토큰(`min-h-44`, `pr-72`, `md:max-w-480` 등)을 따르며 arbitrary spacing 값은 없다.
- 의존성/override: `@tanstack/react-query`, `@suspensive/react-query-5`는 코드에서 import되며(knip 통과는 triage-2에 기록), `pnpm-workspace.yaml` override에는 사유 주석이 있다.

## 새 finding

### F3-01 [Medium] 신규 로직 테스트가 사이클 diff에 전혀 없음

- 위치: `__tests__/` 전체. 사이클 diff에서 테스트 변경은 import 경로 이동 2건(`blog-category-param.test.ts`, `blog-excerpt-page.test.ts`)과 하네스 테스트뿐이다. `normalizeSearchQuery`, `escapeLikePattern`, `parseBlogListParams`, `summarizeErrorForLog`, `BlogSearchBox` 중 `__tests__`/`tests`에서 참조하는 파일은 0개다.
- 근거: AC12(서비스 레벨 테스트가 AC1~AC8, AC10, AC11 검증)와 AC36이 아직 충족되지 않았다. triage-1은 이를 T09 담당으로 넘겼다. 이는 정의된 인계이므로 T07 차단 사유로 보지 않지만, 미작성 상태로 병합되지 않도록 T09의 완료 조건으로 명시해야 한다.
- 제안: T09에서 최소한 다음을 실제 소스 import로 검증한다. (1) `normalizeSearchQuery`: NFD 입력, 배열 첫 값, NUL/제어문자, 서로게이트 쌍 경계의 100자 절단, 공백만 입력. (2) `escapeLikePattern`: `%`, `_`, `\` 조합. (3) `listPosts`는 DB 통합 또는 drizzle mock으로 category+q AND 조건과 count/rows 동일 조건. (4) e2e `tests/e2e/blog.spec.ts` 계열에 `?q=` 직접 진입 시 첫 HTML 결과 포함(AC21), IME, 0건 초기화 링크. 테스트 mock이 프로덕션 정규식을 복제하지 않고 import해야 한다.

### F3-02 [Low] `blog-service.ts` 시간 초과 주석이 SSR 경로를 빠뜨림

- 위치: `src/services/blog/blog-service.ts:31`
- 근거: 주석은 "시간 초과는 PG 57014 오류로 던져지고 호출한 Route Handler가 500으로 응답함"이라고 적는다. 그러나 `listPosts`는 공개 `/blog`, `/admin/blog` 서버 컴포넌트(QueriesHydration의 queryFn)에서도 검색어와 함께 직접 호출되며, 이 경로의 시간 초과는 Route Handler가 아니라 `(public)/error.tsx`, `admin/(console)/error.tsx` 경계로 간다. 이 경우 검색 입력창이 사라져 사용자가 같은 화면에서 q를 고칠 수 없다(F2-01에서 T09 확인 항목으로 넘긴 건과 같은 뿌리). 주석을 사실과 맞추지 않으면 다음 수정자가 SSR 경로를 놓친다.
- 제안: 주석에 "서버 컴포넌트 직접 호출 경로는 error 경계가 받음"을 덧붙이거나, T09에서 `?q=` 시간 초과 시 error 경계 동작을 확인한 결과를 반영한다. 코드 변경은 필수 아님.

### F3-03 [Low] 서버 페이지의 params 조립이 `parseBlogListParams`와 이중 구현

- 위치: `src/app/(public)/blog/page.tsx:46-50`, `src/app/admin/(console)/blog/page.tsx:35-39`
- 근거: 두 페이지가 `normalizeCategoryParam`, `normalizeSearchQuery`, `parsePageParam`을 직접 조합해 `BlogListParams`를 만들고, Route Handler와 클라이언트는 `parseBlogListParams`를 쓴다. 결과가 서로 달라지는 곳은 지금 없다(undefined 키 유무는 해시에서 무시됨). 하지만 서버 prefetch key와 클라이언트 key의 일치가 "undefined 키는 해시에서 무시된다"는 TanStack 내부 동작에 기대고 있어, 새 파라미터를 추가할 때 한쪽만 고치면 하이드레이션이 조용히 빗나간다.
- 제안: raw `searchParams` 객체를 받는 단일 함수(예: `parseBlogListParams`가 `get` 대신 객체도 받는 오버로드, 또는 서버용 래퍼)를 `blog-query-params.ts`에 두고 두 페이지가 이를 호출하게 한다. 이번 사이클 병합 차단 사유는 아님.

## 요구사항 누락 점검

- AC1~AC11: 구현 확인(F1~F2). 검증 테스트는 F3-01에 위임.
- AC13~AC25: `BlogSearchBox`, `BlogSearchResults`에서 label, debounce 300ms, IME, replaceState, 서버 prefetch, 오래된 응답 방지(axios signal + queryKey), 로딩 유지(keepPreviousData), 오류 재시도, aria-live를 코드로 확인. 실제 동작은 T09 확인 대상.
- AC26~AC30: 페이지네이션/탭이 `q` 유지, 문구, 0건 초기화 링크(`category` 유지)를 코드로 확인.
- AC31~AC33: 관리자는 `AdminPostRow`로 행 마크업 유지, GET은 인증 가드 확인.
- AC34: `q` 없는 `/blog`는 `CategoryTabs` 기본 query가 빈 객체라 링크 불변.
- 누락된 요구사항 구현은 발견하지 못함. 미충족은 테스트(AC12, AC36의 verify 통과 여부는 T09에서 재확인)뿐.

## CodeRabbit 교차검토

- 실행: 이 환경에서 `coderabbit review --agent --base main`을 실행하지 않았다. 이 실행은 이번 호출에서 수행하지 못했고 사유는 확인하지 않았다(호출 범위가 사이클 시작 커밋 288f7a5 기준이라 `--base main` 범위와 맞는지도 미확인). 따라서 CodeRabbit 미실행, 자체 리뷰만으로 판정한다. 보고 한 줄: CodeRabbit 미실행(이번 호출에서 실행하지 않음).

## 판정

통과(조건부). Critical/High 없음. Medium 1건(F3-01)은 이미 T09로 인계된 항목이며 T09 완료 조건으로 확정할 것. Low 2건(F3-02, F3-03)은 orchestrator 재검토 게이트에서 처리 여부 결정.
