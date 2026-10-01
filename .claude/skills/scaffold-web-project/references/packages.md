# 패키지 목록

참조 앱의 직접 의존성을 기능별로 정리한 목록이다. 새 프로젝트에서는 기본 도구와 활성화할 기능의 패키지만 설치한다. 목록 전체를 필수 의존성으로 취급하지 않는다. 구체적인 버전과 버전 범위는 기재하지 않는다.

## 목차

- [런타임 의존성](#런타임-의존성)
- [개발 의존성](#개발-의존성)
- [설치와 선택 기준](#설치와-선택-기준)
- [매니페스트 외 선택 검사](#매니페스트-외-선택-검사)

## 런타임 의존성

| 구성 | 패키지 | 용도 |
| --- | --- | --- |
| 기본 런타임 | `next`, `react`, `react-dom`, `server-only` | App Router, React 렌더링, 서버 전용 경계 |
| UI 선택 | `radix-ui`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react-hot-toast` | 접근성 primitive, 아이콘, variant, 클래스 병합, 토스트 |
| 서버 상태·HTTP 선택 | `@tanstack/react-query`, `axios`, `@suspensive/react`, `@suspensive/react-query` | 쿼리 캐시, HTTP, Suspense 경계와 SSR hydration |
| 폼·검증 선택 | `react-hook-form`, `@hookform/resolvers`, `zod` | 폼 상태, resolver, 런타임 스키마 검증 |
| 인증 선택 | `next-auth`, `bcryptjs` | 세션·인증 Provider, 비밀번호 해시 |
| DB 선택 | `drizzle-orm`, `@neondatabase/serverless` | DB 접근과 선택한 PostgreSQL 공급자의 드라이버 |
| 차트 선택 | `recharts` | 시각화가 필요한 화면 |
| 외부 서비스 선택 | `openai`, `resend` | AI·이메일 기능을 선택한 경우의 서버 전용 SDK |
| 파일·네트워크 연동 선택 | `adm-zip`, `fast-xml-parser`, `https-proxy-agent` | ZIP·XML 처리 또는 프록시 요구가 있는 경우 |

## 개발 의존성

| 구성 | 패키지 | 용도 |
| --- | --- | --- |
| 기본 개발 도구 | `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@biomejs/biome`, `tailwindcss`, `@tailwindcss/postcss` | 타입 검사, 포맷·린트와 CSS 빌드 |
| UI 애니메이션 선택 | `tw-animate-css` | 공통 애니메이션 유틸리티 |
| 유닛·DOM 테스트 선택 | `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` | 테스트 실행, React 변환, 경로 별칭, DOM과 사용자 이벤트 |
| 브라우저·커버리지 선택 | `@playwright/test`, `@vitest/browser-playwright`, `@vitest/coverage-v8` | E2E, 브라우저 컴포넌트 테스트, 커버리지 |
| 품질·Git 훅 선택 | `husky`, `lint-staged`, `knip` | Git 훅, 변경 파일 검사, 미사용 코드 탐지 |
| 서버 개발 보조 선택 | `dotenv`, `drizzle-kit`, `tsx` | 환경변수 로딩, DB 스키마·마이그레이션, TypeScript 스크립트 실행 |

## 설치와 선택 기준

- 기본 앱은 프레임워크·타입·CSS·정적 검사 도구로 시작한다. 기능을 선택할 때 해당 패키지를 추가한다.
- 폼을 선택하면 폼 라이브러리, resolver와 스키마 라이브러리 사이의 호환성을 확인한다.
- SSR hydration 보조 라이브러리를 선택하면 TanStack Query와의 호환성을 확인한다. `@suspensive/react-query`처럼 별칭으로 설치되는 의존성은 실제 배포 패키지도 확인하고 원본 별칭을 무조건 복사하지 않는다.
- 인증은 선택한 Provider와 인증 라이브러리의 현재 API를 기준으로 구성한다. 비밀번호 로그인이 없으면 `bcryptjs`는 생략한다.
- DB 공급자를 먼저 정한다. Neon을 사용하지 않으면 해당 드라이버 대신 선택한 환경에 맞는 드라이버를 확인한다.
- AI·이메일·차트·ZIP·XML·프록시 패키지는 관련 요구사항이 있을 때만 설치한다.
- 테스트 도구를 선택하면 변환 플러그인, 브라우저 Provider와 커버리지 Provider의 호환성을 함께 확인한다.
- 생성된 package.json과 lockfile에는 실제 설치 결과를 기록한다. 이 문서의 버전 생략 원칙 때문에 재현 가능한 설치 정보를 제거하지 않는다.
- Node.js와 pnpm 실행 환경도 선택한 프레임워크의 요구사항에 맞춘다. 원본의 버전을 템플릿에 고정하지 않는다.

기본 설치 예시:

```sh
pnpm add next react react-dom server-only
pnpm add -D typescript @types/node @types/react @types/react-dom @biomejs/biome tailwindcss @tailwindcss/postcss
```

설치 후 기본 페이지, CSS와 타입 설정까지 구성한다. 명령 실행만으로 스캐폴딩이 완료됐다고 판단하지 않는다.

## 매니페스트 외 선택 검사

`react-doctor`는 참조 앱에서 script로 호출하는 도구이며 직접 의존성 목록에는 없다. 새 프로젝트에서 선택하면 개발 의존성으로 추가하고 실행 환경에서 재현 가능한 검사로 구성한다.
