---
paths:
  - "src/**/*.{ts,tsx}"
  - "next.config.ts"
---

# Next.js 16 핵심 규칙

> 이 저장소의 Next.js는 학습 데이터와 다를 수 있다. 새 API/규칙이 불확실하면 `node_modules/next/dist/docs/` 의 해당 문서를 먼저 읽는다 (AGENTS.md).

1. **클라이언트/서버 분리**: 클라이언트 컴포넌트는 별도 파일로 분리하고 `"use client"`를 최상단에 선언한다. `page.tsx`(Server)는 `<XxxContent>`(Client)를 렌더하는 얇은 셸로 둔다.
2. **params / searchParams는 `Promise` 타입**: `async/await`로 추출 (Server), Client에서는 `use()`.
   - ✅ `const { symbol } = await params;` / ❌ `const { symbol } = params;`
3. **인증/인가는 `src/proxy.ts`** (Next 16에서 `middleware.ts` → `proxy.ts`로 rename, 위치는 `src/`).
   - proxy: `matcher`는 `/admin/:path*`, `/api/admin/:path*`뿐이며 공개 페이지는 거치지 않는다. `getToken`(`next-auth/jwt`)으로 JWT 존재만 확인하고, 미인증이면 페이지는 `/admin/login?from=`로 리다이렉트, `/api/admin/*`은 401 JSON을 반환한다. `/admin/login`은 그대로 통과한다.
   - admin Route Handler: `adminRoute`(`src/lib/auth/admin-route.ts`)로 감싼다. 내부의 `requireAdmin`이 `getServerSession(authOptions)`과 GitHub allowlist로 401/403을 판정하고, unsafe method에는 Origin/host 검사를 더한다.
   - admin 서버 페이지: `requireAdminPage()`로 판정하고 실패 시 `/admin/login`으로 redirect.
4. **`<Image>`는 `width`/`height` 명시 또는 `fill`**. `<img>` 직접 사용 금지.
5. **데이터 흐름**: 읽기는 서버 컴포넌트에서 `services/`를 직접 호출하고(`services/` → Drizzle), 자신의 Route Handler를 HTTP로 다시 호출하지 않는다. 쓰기는 admin 클라이언트 컴포넌트가 `adminRequest`(`src/lib/admin-client/admin-request.ts`, 네이티브 `fetch`)로 `src/app/api/admin/*`을 호출한다. admin 폼은 `useAdminForm`(`src/lib/admin-client/use-admin-form.ts`, React Hook Form `useForm` + `schemaResolver`)으로 만들고, 폼 스키마는 `src/schemas/`의 서버 스키마를 조합해 검증 규칙을 중복하지 않는다. 목록 편집은 `useFieldArray`, 내부 상태가 있는 입력(마크다운 편집기, 썸네일)은 `Controller`로 연결한다.
6. **Route Handler GET에 부작용(DB write) 금지** - react-doctor `nextjs-no-side-effect-in-get-handler`(error)로 강제된다. 캐시 upsert처럼 멱등하고 실패를 무시하는 경우에 한해 사유를 명시한 `// react-doctor-disable-next-line ...` 주석으로 예외 처리한다. 사용자 상태를 바꾸는 write는 POST로 옮긴다.
7. **능동 기능은 트리거 주체를 명시**: 알림/생성처럼 "누군가 능동적으로 발생시켜야" 하는 기능을 GET 핸들러에만 넣지 않는다 - 프로덕션에서 그 GET을 실제로 호출하는 주체(크론, 사용자 액션 등)를 설계 단계에서 명시하고, 없으면 별도 크론/트리거를 만든다.

