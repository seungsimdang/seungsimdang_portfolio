# 앱 구조와 설정

## 목차

- [기본 구성](#기본-구성)
- [선택 모듈](#선택-모듈)
- [개발 명령](#개발-명령)
- [테스트와 CI](#테스트와-ci)

## 기본 구성

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    ui/
    common/
    layout/
  utils/
    cn.ts
AGENTS.md
.env.example
.gitignore
package.json
pnpm-lock.yaml
tsconfig.json
next.config.ts
postcss.config.mjs
biome.json
```

이 트리는 파일 배치 기준이다. 빈 폴더를 모두 생성할 필요는 없다. `cn.ts`는 `clsx`와 `tailwind-merge`를 선택했을 때만 만든다. Git 저장소가 아니면 Git 초기화가 요청 범위인지 확인하고, Husky 설정은 Git 사용 시 추가한다.

- 신규 파일은 kebab-case로 만들고, 컴포넌트와 타입 이름은 PascalCase로 정한다.
- TypeScript는 strict 검사와 `@/*` → `src/*` 별칭을 적용한다.
- 페이지는 Server Component를 기본으로 두고 상태·이벤트 처리가 필요한 부분만 별도 Client Component로 분리한다.
- 서버 전용 코드에는 `server-only`를 사용한다. 서버 비밀값을 공개 환경변수나 클라이언트 코드에 넣지 않는다.
- globals.css에서 의미 기반 색상·간격·그림자·타이포그래피 토큰을 정의한다. 간격 단위는 새 디자인 체계에 맞추고 기존 앱의 재정의를 자동 복사하지 않는다.
- 폰트, 언어, 메타데이터, 개발 포트와 배포 출력 방식은 새 프로젝트에 맞춘다.
- CSS 문법, 라우팅 API와 요청 가로채기 파일 위치는 설치된 도구의 문서에 맞춘다.
- 기존 설정의 경고 억제, 의존성 override와 빌드 스크립트 허용 목록은 그대로 복사하지 않는다. 선택한 패키지에서 필요성이 확인될 때만 추가한다.

## 선택 모듈

| 기능 | 파일 배치 | 구현 기준 |
| --- | --- | --- |
| 서버 상태 | `src/lib/react-query/`, `src/app/providers.tsx` | query client, 중립적인 query key 팩토리, query options와 Provider |
| HTTP | `src/lib/http/` | 클라이언트 호출과 서버 전용 호출 분리 |
| API | `src/app/api/`, `src/services/` | Route Handler는 입력·권한·응답 처리, 서비스는 비즈니스 로직 |
| 폼 검증 | `src/schemas/`, `src/types/` | Zod 스키마와 타입 정의, 폼 입력·오류 처리 |
| 인증 | `src/lib/auth/`, 인증 라우트 | Provider에 맞는 세션 검증, 보호 페이지와 API 권한 검사 |
| DB | `src/db/`, `src/db/schema/`, `drizzle/`, `drizzle.config.ts` | 새 요구사항의 스키마와 새 마이그레이션 |
| 외부 연동 | `src/lib/integrations/` | 서버 전용 어댑터와 환경변수, 필요한 경우 테스트 대역 |

서버 상태 관리에서는 서버 prefetch와 클라이언트 query options가 동일한 query key를 사용하게 한다. 공유 key 모듈에 `use client`를 붙이지 않는다. SSR hydration은 실제로 필요할 때 구성하고, 인증된 내부 HTTP 요청에는 올바른 요청 컨텍스트를 전달한다. 서버가 서비스 함수를 직접 호출할 수 있으면 불필요한 내부 HTTP 요청을 추가하지 않는다.

mutation이 바꾸는 리소스를 기준으로 관련 쿼리를 무효화한다. 조회 핸들러에 사용자 상태 변경을 넣지 않고, 비멱등 요청은 일괄 자동 재시도하지 않는다. 새 API의 응답·오류 계약은 한곳에 정의한다.

## 개발 명령

| script | 명령 | 적용 조건 |
| --- | --- | --- |
| `dev` | `next dev` | 기본 |
| `build` | `next build` | 기본 |
| `start` | `next start` | 기본 |
| `check` | `biome check .` | 기본 |
| `format` | `biome format --write .` | 기본 |
| `type-check` | `tsc --noEmit` | 기본 |
| `test:unit` | `vitest run` | 유닛 테스트 선택 시 |
| `test:unit:coverage` | `vitest run --coverage` | 커버리지 선택 시 |
| `test:e2e` | `playwright test` | E2E 선택 시 |
| `knip` | `knip` | 미사용 코드 검사 선택 시 |
| `prepare` | `husky` | Git 훅 선택 시 |
| `db:generate` | `drizzle-kit generate` | DB 선택 시 |
| `db:migrate` | `drizzle-kit migrate` | DB 선택 시 |
| `db:studio` | `drizzle-kit studio` | DB 선택 시 |

`db:migrate`는 명령을 정의하는 것과 외부 DB에 실행하는 것을 구분한다. 대상과 기존 승인 범위를 확인한다. 스캐폴딩을 위해 운영 DB를 변경하지 않는다.

## 테스트와 CI

- Vitest의 DOM 테스트에 jsdom·Testing Library를 사용한다. 실제 브라우저 컴포넌트 테스트가 필요하면 browser-playwright를 추가하고 프로젝트를 분리한다.
- `server-only`를 사용하는 순수 서버 모듈을 테스트할 때는 테스트 설정에서만 해당 마커를 대체한다.
- 테스트 탐색에서 빌드 결과, E2E 폴더와 worktree 경로를 제외한다.
- Playwright의 baseURL과 webServer 포트를 일치시킨다. 테스트 DB와 계정은 개발·운영 데이터에서 분리한다.
- CI는 lockfile 기반 설치 → 정적 검사 → 타입 검사 → 선택한 테스트 → 빌드 순서로 구성한다. 브라우저 테스트 사용 시 해당 브라우저를 설치한다.
- lint-staged는 변경 파일 검사, pre-push 또는 CI는 전체 검사에 사용한다. 테스트와 타입 검사가 실패하면 전달 완료로 기록하지 않는다.
- React Doctor는 선택 검사이며 사용한다면 프로젝트 의존성으로 관리한다. 훅에서 매번 네트워크로 가져오는 명령을 기본값으로 두지 않는다.
