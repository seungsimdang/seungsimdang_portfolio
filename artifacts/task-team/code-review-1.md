# Code Review 1 (T07, 커밋 8af467f)

판정: 재작업 (High 1건, Medium 2건, Low 3건)

실행 확인: `knip` 위반 없음, `tsc --noEmit` 오류 없음, `__tests__/lint` 7파일 48건 통과. 구현 코드 주석에 AC/F 번호, finding ID, 게이트 ID 인용은 grep으로 확인했고 없음(`blog-query-params.ts:25`의 "서로게이트"는 무관한 단어).

## 확인 통과 항목

- 정규화(`normalizeSearchQuery`): 제어문자와 NUL 제거, 공백 축약, NFC 후 코드포인트 기준 절단, trimEnd 순서가 맞음. category와 달리 배열 첫 값 규칙도 유지됨.
- LIKE 이스케이프: 역슬래시를 먼저 치환하고 `%`, `_`를 치환함. 값은 drizzle 바인딩 파라미터로 전달됨.
- count와 list가 같은 `where`를 공유하고, `page` 보정(`Math.min(Math.max(1,page),totalPages)`)과 total 0일 때 빈 배열 처리가 맞음.
- query key: 페이지는 `category: undefined`를 담고 클라이언트 파서는 키를 생략하지만, react-query 해시가 JSON 직렬화라 undefined가 제거되어 동일 키가 됨.
- 오래된 응답 경합: 입력마다 key가 달라 응답이 key별 캐시에 들어가고, `signal`도 전달됨.
- QueryClient: 서버는 호출마다 새로 생성, 브라우저는 싱글턴. 요청 간 공유 없음.
- server-only 경계: `blog-query-params.ts`는 server-only를 import하지 않고, `blog-service.ts`와 두 Route Handler만 서버 전용임.
- admin GET: `adminRoute`가 Origin 검사를 `MUTATING_METHODS`에만 적용하므로 safe method 원칙 준수. GET에 부작용 없음.
- q 없는 화면: `CategoryTabs`의 `query` 기본값이 빈 객체라 기존 링크와 동일. 기존 category와 page 테스트는 import 경로만 이동함.

## Findings

### F-01 [High] 서비스 레벨 테스트 누락

- 위치: `__tests__/` 전체. 이 커밋에서 변경된 테스트는 import 경로 수정 2건뿐임.
- 근거: 요구사항에서 서비스 레벨 테스트로 정규화(NFC·공백·100자 절단·배열 첫 값), `escapeLikePattern`, `%`·`_`·`\` 리터럴 일치, count/list 조건 일치, page 보정을 검증하라고 요구하나 신규 테스트가 없음. `normalizeSearchQuery`와 `escapeLikePattern`은 순수 함수라 DB 없이도 바로 검증 가능함.
- 수정 제안: `__tests__/utils/blog-search-query.test.ts`를 추가해 두 순수 함수를 실제 소스에서 import하여 검증함(제목은 한글). `listPosts`는 drizzle mock으로 where 인자 일치를 확인하거나 DB 통합 테스트로 둠.

### F-02 [Medium] 이전 결과가 0건일 때 로딩 중에 새 검색어의 "결과 없음"이 즉시 표시됨

- 위치: `src/components/common/blog-search-results.tsx:260-264` (`else if (data.items.length === 0)` 분기)
- 근거: `keepPreviousData` 때문에 새 key 로딩 중 `data`는 이전 key의 결과임. 이전 결과가 빈 배열이면 `busy`를 보지 않고 `EmptyState`를 렌더함. 예: "zzz"(0건) 다음에 "zzzz" 입력 시, 응답 전에 `"zzzz"에 대한 검색 결과가 없습니다`가 그대로 뜸. 반대로 0건 상태에서 검색어를 지우면 응답 전에 "아직 작성한 글이 없습니다."가 잠깐 뜸. 로딩 표시도 없어 로딩 상태를 이전 결과 위에 표시하라는 요구와 어긋남. CodeRabbit도 같은 지적을 함.
- 수정 제안: 빈 분기에서 `busy`이면 `LoadingText`(또는 이전 EmptyState를 `aria-busy`와 흐림으로 유지)를 렌더함. 최소 변경은 `else if (data.items.length === 0) body = busy ? <LoadingText /> : <EmptyState .../>`.

### F-03 [Medium] 로딩 중 Pagination이 새 params와 이전 data를 섞어 링크를 만듦

- 위치: `src/components/common/blog-search-results.tsx:188-199` (`ResultList`의 `paginationQuery`와 `Pagination`)
- 근거: `paginationQuery`는 새 `params`(q, category)에서, `page`와 `totalPages`는 placeholder data에서 옴. 로딩 중에도 `Pagination`이 활성이라, 예컨대 이전 q의 3페이지 중 2페이지로 가는 링크가 새 q로 만들어져 클릭 가능함. 클릭하면 새 q의 2페이지 서버 렌더로 이동하므로 치명적이지는 않으나 이전 결과 기준 페이지 수가 새 검색어에 붙어 노출됨.
- 수정 제안: `busy`일 때 `Pagination`을 숨기거나, 목록 영역(`ul`)처럼 흐림과 클릭 차단(`pointer-events-none`, `aria-hidden`)을 줌.

### F-04 [Low] SearchAnnouncer가 최초 마운트와 같은 q의 재조회에서도 낭독함

- 위치: `src/components/common/blog-search-results.tsx:65-75`
- 근거: effect 의존성 `[busy, data, category, q]`에 `data`가 있어 같은 key의 재조회(retry, `refetch`)나 페이지 이동 후에도 같은 문구로 `textContent`를 다시 써 중복 낭독될 수 있음. `?q=`로 직접 진입하면 사용자 액션 없이 로드 직후 "검색 결과 N개"가 낭독됨(요구사항상 허용 범위일 수 있으나 의도 확인 필요).
- 수정 제안: 직전 낭독 문구를 ref에 저장하고 같으면 건너뜀. 최초 마운트 낭독이 불필요하면 첫 effect 실행은 `previousQ`만 기록하고 종료함.

### F-05 [Low] BlogSearchBox의 `committedRef` 갱신이 조합 중 URL 변경과 어긋날 수 있음

- 위치: `src/components/common/blog-search-box.tsx:35-41`
- 근거: 조합 중(`composingRef.current === true`)에 뒤로가기로 `query`가 바뀌면 effect가 조기 반환하고, 조합이 끝난 뒤에는 `query`가 다시 바뀌지 않아 입력창 값이 URL과 어긋난 채 남음. 이후 debounce commit이 URL을 다시 덮어쓰므로 데이터 손상은 없고 발생 조건도 드묾.
- 수정 제안: 현 상태 유지 가능. 손볼 경우 `handleCompositionEnd`에서 `query`와 `committedRef`를 비교해 동기화함.

### F-06 [Low] 테스트의 불필요한 mock

- 위치: `__tests__/utils/blog-category-param.test.ts:3-4`, `__tests__/utils/blog-excerpt-page.test.ts:3-4`
- 근거: 함수가 `@/utils/blog-query-params`로 이동해 `vi.mock("server-only")`와 `vi.mock("@/db")`가 더 이상 필요하지 않음. 동작에는 문제없으나 "server-only 경계 밖" 보장을 흐리는 잔재임.
- 수정 제안: 두 mock 제거(제거해도 통과하는 것이 순수 모듈 보장의 회귀 검증이 됨).

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --base main --committed` 완료(무료 CLI 허용량, 인증 정상). 1건 보고.
- 타당 판정
  - `blog-search-results.tsx:263-264` · 빈 결과 분기에서 `busy`를 확인하지 않음 · Medium · 자체 리뷰 F-02와 중복
- 기각 항목: 없음

CodeRabbit 1건 중 1건 타당.

## 최종 판정

재작업. F-01(테스트 누락)과 F-02, F-03(로딩 중 상태 UI 정합성) 반영 후 재리뷰 필요. 정규화, LIKE 이스케이프, count와 list 조건, page 보정, key 일치, QueryClient 분리, server-only 경계, 관리자 GET 가드는 문제 없음.
