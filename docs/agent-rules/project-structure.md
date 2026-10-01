# 포트폴리오 프로젝트 구조 규칙

Framer 디자인 기반 포트폴리오. Next.js App Router + React + TypeScript + Tailwind CSS.

## 목차

- [디렉터리](#디렉터리)
- [핵심 규칙](#핵심-규칙)

## 디렉터리

| 경로 | 용도 |
|------|------|
| `src/app/` | App Router. 홈, `about/`, `blog/`, `contact/`, `projects/` |
| `src/proxy.ts` | 인증/인가 (Next 16: `middleware.ts` → `proxy.ts`, 위치는 `src/` 내부) |
| `src/components/` | `ui/`(버튼), `common/`(공용 섹션·카드), `layout/`(Navbar·Footer) |
| `src/services/` | 서버 사이드 비즈니스 로직·외부 API 호출. `{도메인}/{도메인}-service.ts` |
| `src/lib/axios/` | `client-axios.ts`(`apiClient` default export), `server-axios.ts`(`serverGet` 등) |
| `src/lib/react-query/` | `query-keys.ts`(`queryKeys` 팩토리), `client-query-options/`, `server-query-options/` |
| `src/lib/auth/` | `auth-options.ts`, `verify-credentials.ts` |
| `src/lib/toss/`, `src/lib/market/` | 토스 API 어댑터, 시세/기술적 지표 계산 |
| `src/lib/utils/` | `with-retry.ts`, `csrf.ts`, `rate-limit.ts`, `log-error.ts` 등 서버 유틸 |
| `src/db/` | Drizzle. `schema/portfolio.ts`, 마이그레이션은 `drizzle/` |
| `src/schemas/` | Zod 스키마만. `kebab-case.schema.ts` (예: `portfolio.schema.ts`) |
| `src/types/` | 타입 정의. `api-types.ts`의 `CustomData<T>`가 API 응답 표준 |
| `src/constants/`, `src/utils/` | 공용 상수 / 클라이언트 유틸(`styleUtils.ts`의 `cn`) |

## 핵심 규칙

1. **파일 네이밍은 kebab-case** (컴포넌트 파일 포함 - React PascalCase 관례와 다름). 기존 `styleUtils.ts` 같은 예외가 있으나 신규 파일은 kebab-case로 만든다.
2. **서버 전용 모듈**은 최상단에 `import "server-only";` - `services/`, `lib/axios/server-axios.ts`, `lib/auth/*`, `lib/utils/with-retry.ts` 등. 클라이언트에서 import되면 빌드가 깨진다.
3. **Route Handler는 `src/app/api/{도메인}/route.ts`**. 세션 검사는 `getServerSession(authOptions)`, 응답은 `Response.json({ data, status }, { status })` + `CustomData<T>` 형태.
4. **HTTP 상태 코드는 매직넘버 금지** - `axios`의 `HttpStatusCode` enum 사용(`HttpStatusCode.Unauthorized` 등). `docs/agent-rules/react-query.md` 참조.
5. **죽은 코드·미사용 export/의존성 금지** - pre-commit에서 `knip`이 전체 검사한다.
6. **주석·문서에 em-dash(`—`) 금지** - 하이픈(`-`)만 쓴다. `//` 주석은 읽기 쉬운 문장·문단 단위로 작성하며, 여러 줄이 필요하면 같은 형식을 반복한다. 주석은 완결형 종결어미(`~했다`, `~한다`, `~된다`, `~있다` 등 `다`로 끝나는 문장) 대신 명사형·비종결 구절(`~함`, `~됨`, `~수정`)로 끝낸다(`__tests__/lint/source-rules.test.ts`가 pre-push·CI에서 검사). 여러 줄 주석의 줄바꿈은 [주석 줄바꿈 기준](#주석-줄바꿈-기준)을 따른다. `.husky/pre-commit`이 변경 범위의 금지 참조·em-dash를 강제하고, 커밋 메시지 규칙은 `.claude/skills/git-commit` 참조.
7. 커밋은 `.claude/skills/git-commit` 규칙을 따른다.
8. **통화 단위(원화/네이티브)는 변수명에 명시** - `number` 타입만으로는 원화 환산 여부가 구분되지 않는다. 네이티브 통화(USD 등, 환율 미적용) 값은 `Native`/`Usd` 접미사, 원화 환산 완료 값은 `Krw` 접미사를 붙인다 (`priceNative`, `avgCostKrw` 등). `price`, `avgCost`처럼 단위가 드러나지 않는 이름으로 두 통화를 같은 계산식에 섞지 않는다 (BUG 20260909220000 - 원화값에 환율을 재적용해 손익이 ~1,300배 왜곡된 사례, `artifacts/bug-team/postmortem-20260909220000.md`).

## 주석 줄바꿈 기준

Semantic Line Breaks(sembr.org) 4번 규칙("문장이 끝나면 반드시 줄바꿈")과 Google JavaScript/TypeScript Style Guide의 블록 주석 형식을 이 저장소에 맞게 좁힌 기준이다. Markdown 본문의 "한 항목은 한 줄" 규칙과 같은 방향으로, 줄 길이 때문에 문장을 자르지 않는다.

1. **한 줄은 한 문장(또는 한 항목)**. 문장이 끝나면 줄을 바꾸고, 한 줄에 두 문장을 이어 쓰지 않는다.
2. **문장 중간 줄바꿈 금지**. 줄 끝이 쉼표·조사(`는`, `를`, `을`, `은`, `에`, `와`, `에서`, `으로` 등)·연결어미(`하고`, `하며`, `하면`, `지만`, `는데` 등)·영어 접속사/전치사이거나, 영어 소문자로 끝난 줄 다음 줄이 소문자로 시작하면 위반이다.
3. **줄 길이 상한은 두지 않는다**. 한 문장이 80열을 크게 넘기면 줄을 자르지 말고 문장을 둘로 나눈다(SemBr 12·13번 권고 반영).
4. **블록 주석 형식**. 여러 줄 `/* */`·`/** */`는 둘째 줄부터 `*`로 시작해 정렬하고, `//` 주석은 같은 들여쓰기로 반복한다.
5. **예외**. 빈 주석 줄(문단 구분), 목록 항목(`- `, `1. `), JSDoc 태그(`@param` 등), URL 포함 줄, 도구 지시 주석(`biome-ignore`, `@ts-` 등)은 줄 끝 검사에서 제외한다.

검사기는 `scripts/check-comment-line-breaks.mjs` 하나이며, 앱 소스(`src/`·`tests/`·`__tests__/`, 검사기 샘플용 `__tests__/lint/` 제외)와 하네스 스크립트(`scripts/`·`.claude/hooks/`·`.codex/hooks/`)의 줄 단위 주석에 적용된다. 셸 스크립트는 `#` 주석(`#!` 제외), JS/TS는 `//`·`/* */` 주석을 검사한다. 같은 검사기가 주석 줄 끝의 완결형 종결어미(`~다`, `마다` 제외)도 함께 차단하므로, 6번 종결어미 규칙은 하네스 스크립트에도 적용된다. 작성 시점에는 PreToolUse 훅(`.claude/hooks/block-comment-line-wrap.sh`, `.codex/hooks/block-comment-line-wrap.sh`)이 이번 편집 범위만 차단하고, 커밋 시점에는 lint-staged가 스테이징된 파일 전체를 검사한다.
