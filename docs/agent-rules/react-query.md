# React Query / API 핵심 규칙

## 목차

- [계층](#계층)
- [서버 사이드 HTTP 함수 선택](#서버-사이드-http-함수-선택)
- [인증/에러 처리](#인증에러-처리)

## 계층

`Route Handler(src/app/api)` → `services/` → `lib/react-query/*-query-options` → `hooks/컴포넌트`

1. **클라이언트 HTTP**: `lib/axios/client-axios.ts`의 `apiClient` (default export). **서버 HTTP**: 호출 대상이 외부 토스 API인지 내부 Route Handler인지에 따라 함수를 구분한다(아래 "서버 사이드 HTTP 함수 선택" 참고). 컴포넌트/서비스에서 `axios`를 직접 만들지 않는다.
2. **API 응답 타입은 `CustomData<T>`** (`src/types/api-types.ts`) - `{ data: T; status: number }`. Route Handler는 `Response.json({ data, status: HttpStatusCode.Ok })` 로 반환한다.
3. **HTTP 상태 코드는 `axios`의 `HttpStatusCode` enum** - 매직넘버(`401`, `502` …) 금지.
   - `import { HttpStatusCode } from "axios";` → `{ status: HttpStatusCode.Unauthorized }`, `status === HttpStatusCode.TooManyRequests` 등.
4. **엔드포인트 경로**는 서비스 파일 상단 `ENDPOINTS` 객체에 모은다 (`fund-management-service.ts` 참고).
5. **queryKey는 `lib/react-query/query-keys.ts`의 `queryKeys` 팩토리만** 사용.
6. **`queryOptions()` 팩토리 필수**: 쿼리는 `queryOptions()`로 캡슐화하고 컴포넌트에서 `useQuery(xxxQueryOptions())` 로 소비한다. 인라인 `queryKey`/`queryFn` 금지.
   - 파일: `lib/react-query/client-query-options/{도메인}.ts` (클라이언트), `lib/react-query/server-query-options/{도메인}.ts` (서버 - 이 프로젝트 자신의 내부 라우트를 호출하므로 반드시 `internalRouteGet` 사용, 아래 참고).
   - 네이밍: `<도메인><대상>QueryOptions` (camelCase). 서버용은 `server` 접두사.
   - 응답 변환은 `select` 안에서만 (`select: (r) => r.data?.data`). 컴포넌트로 raw 응답 노출 금지.
7. **`staleTime`**: 실시간성 데이터(지수 등)는 `refetchInterval` + 짧은 `staleTime`, 정적 데이터는 `5 * 60 * 1000`. 매직넘버 반복 대신 의미가 드러나게 둔다.
8. **mutation 성공 후 반드시 `queryClient.invalidateQueries({ queryKey })`** - 영향받는 키를 무효화. `useMutation` + `useQueryClient` 사용 (`rebalancing-content.tsx` 참고).
   - **영향받는 키 찾기**: mutation이 호출하는 Route Handler가 쓰는 테이블 → 그 테이블을 읽는 GET 라우트 → 그 라우트를 호출하는 `queryOptions` → 그 `queryKey` 순으로 grep해서 찾는다. 같은 테이블을 다른 화면이 읽고 있으면 그 화면의 키도 대상이다. 화면·키 대응표는 코드와 어긋나기 쉬워 따로 두지 않는다.
   - **키 모양 확인**: 무효화 키는 `queryKeys` 팩토리로 만들고, 소비 화면이 넘기는 인자와 같은 인자를 넘긴다. 예: `fundManagement.proposal(mode, targetProfileId)`는 `targetProfileId`가 있으면 `mode` 대신 그 값이 키에 들어간다(`["fund-management","proposal",targetProfileId]`). 광범위 키(`fundManagement.all` 등)로 뭉뚱그리지 않는다.
   - **강제 수단**: `useMutation`의 무효화 누락은 pre-commit의 react-doctor(`query-mutation-missing-invalidation`, `--blocking warning`)가 스테이징된 파일에서 막는다. 키가 맞는지와 `useMutation` 밖의 fire-and-forget 호출은 잡지 못하므로 code-reviewer 3-10 항목과 무효화 호출을 검증하는 테스트(`invalidateQueries` spy)로 확인한다(BUG 20260928231518).
9. **파생 상태 금지**: 쿼리 결과를 `useEffect`로 `useState`에 복사하지 않는다 - 직접 참조/계산.
10. **모달 내부 fetch**: 부모는 id만 넘기고 `{isOpen && id && <Modal id={id} />}` 로 언마운트 제어.

## 서버 사이드 HTTP 함수 선택

`src/lib/axios/`에는 목적이 다른 서버 HTTP 함수가 여러 개 있다. **URL이 외부 토스 API인지 내부 Route Handler인지에 따라 반드시 맞는 함수를 골라야 한다** - 잘못 고르면 baseURL/인증 방식이 어긋나 런타임에만 실패하고, `QueriesHydration`의 타임아웃 폴백에 가려 눈에 띄지 않는다(BUG 20260906183000 - `artifacts/bug-team/postmortem-20260906183000.md` 참고).

| 호출 대상 | 함수 | baseURL | 인증 |
|-----------|------|---------|------|
| 외부 토스 API (계좌 무관) | `serverGet` / `serverGetRetryable` (`server-axios.ts`) | `TOSS_API_BASE_URL` | 앱 레벨 토큰 |
| 외부 토스 API (사용자별) | `serverGetWithAccountForUser` / `serverPostWithAccountForUser` | `TOSS_API_BASE_URL` | 사용자 자격증명 토큰 |
| **이 프로젝트의 내부 Route Handler** | **`internalRouteGet`** (`internal-route-axios.ts`) | `NEXTAUTH_URL` | 요청의 `Cookie` 헤더 그대로 전달 |

`server-query-options/*.ts`에서 `/api/portfolio`처럼 이 저장소 자신의 `src/app/api/...` 경로를 호출한다면 무조건 `internalRouteGet`이다. `serverGet` 계열은 토스 오픈API(`openapi.tossinvest.com`) 호출 전용이며 내부 라우트에는 절대 쓰지 않는다.

## 인증/에러 처리

- **401**: 클라이언트는 `apiClient` 응답 인터셉터가 `/login?from=` 로 자동 리다이렉트, 페이지 진입은 `src/proxy.ts`가 차단. 서버 prefetch(`serverGet`)에서 401이면 `page.tsx`가 렌더되기 전 proxy 단계에서 이미 걸러진다.
- **403 / 404**: React Query `retry` 하지 않는다.
- **토스 API 429/5xx**: `lib/utils/with-retry.ts`의 `withRetry`로 지수 백오프 재시도.
