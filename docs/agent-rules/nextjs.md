# Next.js 16 핵심 규칙

> 이 저장소의 Next.js는 학습 데이터와 다를 수 있다. 새 API/규칙이 불확실하면 `node_modules/next/dist/docs/` 의 해당 문서를 먼저 읽는다 (AGENTS.md).

1. **클라이언트/서버 분리**: 클라이언트 컴포넌트는 별도 파일로 분리하고 `"use client"`를 최상단에 선언한다. `page.tsx`(Server)는 `<XxxContent>`(Client)를 렌더하는 얇은 셸로 둔다.
2. **params / searchParams는 `Promise` 타입**: `async/await`로 추출 (Server), Client에서는 `use()`.
   - ✅ `const { symbol } = await params;` / ❌ `const { symbol } = params;`
3. **인증/인가는 `src/proxy.ts`** (Next 16에서 `middleware.ts` → `proxy.ts`로 rename, 위치는 `src/`).
   - proxy: `getToken`(`next-auth/jwt`)으로 JWT 판별 → 미인증 시 `/login?from=` 리다이렉트, 루트 `/`는 인증 상태에 따라 `/dashboard` 또는 `/login`로 분기.
   - Route Handler: `getServerSession(authOptions)` → 세션 없으면 `Response.json({ error }, { status: HttpStatusCode.Unauthorized })`.
4. **`<Image>`는 `width`/`height` 명시 또는 `fill`**. `<img>` 직접 사용 금지.
5. **서버 fetch는 `serverGet`(server-axios)**, 클라이언트에서 `server-axios`/`serverGet` import 금지. 반대로 서버에서 `apiClient`(client-axios) import 금지.
6. **Route Handler GET에 부작용(DB write) 금지** - react-doctor `nextjs-no-side-effect-in-get-handler`(error)로 강제된다. 캐시 upsert처럼 멱등하고 실패를 무시하는 경우에 한해 사유를 명시한 `// react-doctor-disable-next-line ...` 주석으로 예외 처리한다. 사용자 상태를 바꾸는 write는 POST로 옮긴다.
7. **능동 기능은 트리거 주체를 명시**: 알림/생성처럼 "누군가 능동적으로 발생시켜야" 하는 기능을 GET 핸들러에만 넣지 않는다 - 프로덕션에서 그 GET을 실제로 호출하는 주체(크론, 사용자 액션 등)를 설계 단계에서 명시하고, 없으면 별도 크론/트리거를 만든다.

## 목차

- [SSR + hydration 패턴](#ssr--hydration-패턴)
- [queryKey 일치 규칙](#querykey-일치-규칙)

## SSR + hydration 패턴

- `page.tsx` (Server): `<QueriesHydration queries={[serverXxxQueryOptions()]} timeout={3000}>` 로 감싸 사전 hydration. `QueriesHydration`은 `@suspensive/react-query` 제공, `HydrationBoundary`를 직접 쓰지 않는다.
- `xxx-content.tsx` (Client): `useQuery(xxxQueryOptions())` 로 소비. 같은 `queryKey`여야 SSR 캐시가 재사용된다.

## queryKey 일치 규칙

> `"use client"` 파일에서 export한 상수를 Server Component에서 import하면 `undefined`가 되어 queryKey가 어긋나고 cache miss → 클라이언트 재요청이 발생한다.

- queryKey는 `src/lib/react-query/query-keys.ts`의 `queryKeys` 팩토리에서만 만든다.
- Server/Client 양쪽에서 쓰는 상수는 지시어 없는 별도 모듈에 둔다.
