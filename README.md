# Nick's Portfolio - Product Design Partner

Framer 디자인을 바탕으로 작성된 Next.js 포트폴리오 프로젝트입니다. 기존 디자인 정보를 유지하면서 개발·검증 환경과 AI 작업 규칙을 구성했습니다.

## 📋 프로젝트 개요

Framer에서 디자인된 포트폴리오를 Next.js와 TypeScript로 구현한 저장소입니다. 아래 Framer 노드, 브레이크포인트와 스타일 정보는 기존 참조 자료를 유지한 것입니다. 이번 스캐폴딩에서는 Framer 원본과의 시각적 일치를 검증하지 않았습니다.

## 🛠 기술 스택

- **Framework**: Next.js 16.3.6 (App Router)
- **Language**: TypeScript 7.0.2
- **Styling**: Tailwind CSS 4.3.3
- **UI Library**: React 19.3.0
- **Build Tool**: Turbopack
- **Package Manager**: pnpm 11.18.0
- **Lint / Format**: Biome 2.5.14
- **Unit Test**: Vitest 5.0.1
- **Browser Test**: Playwright 1.63.0
- **Git Hooks**: Husky 9.1.7, lint-staged 17.5.1
- **Code Audit**: Knip 6.38.0, React Doctor 0.9.14

의존성은 출시 후 7일을 충족한 안정 버전을 사용하며 `package.json`과 `pnpm-lock.yaml`로 관리합니다.

## 📱 반응형 디자인

기존 Framer 참조의 4개 브레이크포인트:

- **Desktop (≥1440px)**: 패딩 120px, 간격 180px
- **Laptop (1024px - 1439px)**: 패딩 80px, 간격 160px
- **Tablet (810px - 1023px)**: 패딩 48px, 간격 120px
- **Phone (<810px)**: 패딩 24px, 간격 80px

## 📄 페이지 구조

### 1. Home (`/`)
- Hero 섹션 with WordCycler 애니메이션
- 5개 프로젝트 카드 (sticky scroll 효과)
- About 섹션
- 최신 블로그 포스트
- CTA 섹션

### 2. Projects (`/projects`)
- 프로젝트 헤더
- 클라이언트 로고 그리드
- 프로젝트 목록 (상세 설명 포함)
- CTA 섹션

### 3. About (`/about`)
- 소개 헤더
- 통계 (경력, 위치, 가용성)
- 프로필 이미지 + 소개글
- 경력 타임라인
- 사용 도구/스택
- CTA 섹션

### 4. Blog (`/blog`)
- 블로그 헤더
- 최신 포스트 하이라이트
- 전체 포스트 목록
- CTA 섹션

### 5. Contact (`/contact`)
- 연락처 헤더
- 문의 폼 (이름, 이메일, 메시지)
- 소셜 미디어 링크
- 제출 버튼

### 6. 404 Page (`/404`)
- 404 에러 메시지
- 홈으로 돌아가기 버튼

## 🎨 컴포넌트 구조

### 레이아웃 컴포넌트
- **Navbar**: 고정 네비게이션 바 (반투명 배경, 진행바)
- **Footer**: 브랜드, 네비게이션, 소셜 링크

### UI 컴포넌트
- **WordCycler**: 텍스트 순환 애니메이션 (Framer 코드 기반)
- **ProjectCard**: Sticky 스크롤 프로젝트 카드
- **Button**: Primary/Secondary 버튼 변형
- **HeroSection**: 히어로 섹션 (가용성 인디케이터 포함)
- **AboutSection**: About 섹션 (그리드 레이아웃)
- **BlogPreview**: 블로그 포스트 미리보기

## 📁 디렉토리 구조

```text
seungsimdang_portfolio/
├── .agents/skills/                  # Codex 업무 절차
├── .claude/                         # Claude 역할·스킬·런타임 훅
├── .codex/                          # Codex 역할·런타임 훅
├── .github/workflows/ci.yml         # CI 검사
├── .husky/                          # 커밋·푸시 검사
├── __tests__/lint/                  # Vitest 하네스·소스·제목 규칙 검사
├── artifacts/                       # 작업 기록
├── docs/                            # 공용 규칙·인계·하네스 원본
├── plugins/                         # Biome 한글 테스트 제목 검사
├── public/                          # 디자인 자산
├── scripts/                         # 생성·동기화·정책 검사
├── src/                             # 앱 소스
│   ├── app/                         # 페이지·레이아웃·전역 CSS
│   │   ├── about/page.tsx
│   │   ├── blog/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   └── components/
│       ├── common/                  # 섹션·카드·텍스트 애니메이션
│       ├── layout/                  # navbar.tsx·footer.tsx
│       └── ui/                      # button.tsx
├── tests/e2e/                       # Playwright 브라우저 테스트
├── AGENTS.md                        # Codex 진입 문서
├── CLAUDE.md                        # Claude 진입 문서
├── README.md                        # 프로젝트 안내
├── biome.json                       # 린트·포맷
├── knip.json                        # 미사용 코드·의존성 검사
├── lint-staged.config.mjs           # staged 검사
├── next.config.ts                   # Next.js 설정
├── package.json                     # 의존성·명령
├── playwright.config.ts             # 브라우저 테스트 설정
├── pnpm-lock.yaml                   # 의존성 잠금
├── pnpm-workspace.yaml              # 설치 정책
├── postcss.config.mjs               # PostCSS 설정
├── tsconfig.json                    # TypeScript 설정
└── vitest.config.ts                 # Vitest 탐색 설정
```

## 🎯 주요 기능

### 1. WordCycler 애니메이션
- Framer의 WordCycler 컴포넌트를 React로 재구현
- 부드러운 fade-in/out 전환 효과
- 동적 높이 계산 및 반응형 지원

### 2. Sticky 스크롤 효과
- 프로젝트 카드의 sticky 포지셔닝
- 각 카드별 고유 색상 테마
- 반응형 높이 조정

### 3. 반응형 타이포그래피
- CSS clamp를 활용한 유동적 폰트 크기
- 4개 브레이크포인트별 최적화된 타이포그래피

### 4. 네비게이션
- 고정 네비게이션 바
- 현재 페이지 하이라이트
- 진행바 (향후 스크롤 진행률 연동 가능)

## 🚀 시작하기

Node.js 22.22.1 이상과 pnpm 11.18.0을 사용합니다. lint-staged의 최소 Node 버전도 충족하도록 설정했습니다. 이번 로컬 검증 환경은 Node.js 26.5.1입니다. 기본 앱은 환경변수나 외부 서비스 자격증명을 요구하지 않습니다. `.env.example`에는 안내만 있습니다.

### 설치

```bash
pnpm install --frozen-lockfile
```

### 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

### 빌드

```bash
pnpm build
```

프로덕션 빌드는 Turbopack을 사용합니다. 로컬 검증·pre-push·CI에서 같은 빌드 명령을 실행합니다.

### 프로덕션 실행

```bash
pnpm start
```

## 개발 검사와 작업 흐름

```bash
pnpm harness:check         # 역할·스킬 원본과 양쪽 생성 파일 검사
pnpm harness:test          # Vitest 하네스·소스·제목 규칙 검사
pnpm knip                  # 사용하지 않는 코드·의존성 검사
pnpm react-doctor          # 전체 React 진단
pnpm check                 # Biome 린트·포맷·import 검사
pnpm lint                  # 린트만 실행
pnpm format                # 포맷 적용
pnpm type-check            # Next.js route 타입 생성 + TypeScript 검사
pnpm build
pnpm exec playwright install chromium  # 최초 브라우저 설치
pnpm test:e2e
# 설치와 브라우저 준비 후 전체 검증
pnpm verify
```

E2E는 빌드된 앱을 `http://127.0.0.1:3100`에서 직접 시작합니다. `/`, `/projects`, `/about`, `/blog`, `/contact`, 내부 탐색, 404와 WordCycler 텍스트 순환을 데스크톱·모바일 Chromium에서 확인합니다. 해당 포트가 비어 있어야 합니다. CI는 lockfile 설치 → 하네스 동기화 → 정적 검사 → 타입 검사 → 빌드 → Chromium 설치 → E2E 순서입니다.

현재 문의 폼은 콘솔 출력만 수행하며 이메일 전송은 연결되지 않았습니다. 프로젝트·블로그 상세 URL의 구현과 외부 소셜 링크는 이 스모크 테스트의 검증 대상이 아닙니다.

AI 작업은 [AGENTS.md](AGENTS.md), Claude는 [CLAUDE.md](CLAUDE.md)에서 시작합니다. 역할·스킬·훅과 생성 절차는 [하네스 안내](docs/agent-harness/README.md)를 참조합니다.

테스트 제목의 설명은 한글로 작성합니다. `plugins/korean-test-titles.grit`를 Biome에 연결해 `pnpm check`·커밋 훅·CI에서 검사합니다. 경로를 넣는 템플릿은 허용하며, 영문 태그는 제목 대신 Playwright의 별도 tag에 둡니다.

참고 문서: [Next.js 설치](https://nextjs.org/docs/app/getting-started/installation), [React 업그레이드](https://react.dev/blog/2024/04/25/react-19-upgrade-guide), [Tailwind 업그레이드](https://tailwindcss.com/docs/upgrade-guide), [Biome 시작하기](https://biomejs.dev/guides/getting-started/). 설치된 Next.js 문서는 `node_modules/next/dist/docs/`에서도 읽을 수 있습니다.

## 🎨 스타일 가이드

### 타이포그래피 클래스

| 클래스 | 용도 | 크기 범위 |
|--------|------|-----------|
| `text-h1` | 메인 헤딩 | 3rem ~ 6.5rem |
| `text-h2` | 서브 헤딩 | 2rem ~ 4rem |
| `text-h3` | 섹션 헤딩 | 1.5rem ~ 2rem |
| `text-body` | 본문 텍스트 | 1rem |
| `text-small` | 작은 텍스트 | 0.875rem |

### 레이아웃 클래스

| 클래스 | 용도 |
|--------|------|
| `container-padding` | 반응형 좌우 패딩 |
| `section-spacing` | 섹션 간 간격 |

### 색상 변수

| 변수 | 값 | 용도 |
|------|-------|------|
| `--background` | `#000000` | 배경색 |
| `--foreground` | `#ffffff` | 전경색 |
| `--green` | `hsl(148, 100%, 50%)` | 가용성 인디케이터 |
| `--white-25` | `rgba(255, 255, 255, 0.25)` | 구분선 |
| `--white-50` | `rgba(255, 255, 255, 0.5)` | 반투명 요소 |

## 📊 프로젝트 데이터

현재 5개의 프로젝트가 포함되어 있습니다:

1. **bizz buzz** - Personal Project (2023)
   - 기업가를 위한 소셜 미디어 플랫폼

2. **aquaflow** - Branding and Identity (2023)
   - 지속 가능한 물 회사 브랜딩 솔루션

3. **snackify** - UI/UX (2023)
   - 건강한 스낵 옵션 음식 배달 앱

4. **zengo** - Personal Project (2023)
   - 명상 및 웰니스 트래킹 애플리케이션

5. **roverride** - Branding and Identity (2023)
   - 프리미엄 자동차 서비스 브랜드 아이덴티티

## 🔗 Framer 연동

이 프로젝트는 Framer 프로젝트를 기반으로 구현되었습니다:

- **원본 Framer 프로젝트 ID**: `eL2hVs3sFTIi13Jf4fnj-1V3WI`
- **참고 컴포넌트**: WordCycler, Examples, Alt_Text
- **레이아웃 노드**: Desktop, Laptop, Tablet, Phone 브레이크포인트
- **페이지별 노드**: Home, Projects, About, Blog, Contact, 404

### Framer 노드 매핑

#### 기본 레이아웃
- Desktop: `VFodTio7z` (1440px, padding 120px, gap 180px)
- Laptop: `TJcFcFStt` (1024px, padding 80px, gap 160px)
- Tablet: `fHXIxFxyL` (810px, padding 48px, gap 120px)
- Phone: `EHCrbgZOo` (390px, padding 24px, gap 80px)

#### 페이지별 노드
각 페이지마다 4개 브레이크포인트 노드가 매핑되어 있습니다.

## 🚢 배포

### Vercel에 배포

가장 쉬운 배포 방법은 [Vercel Platform](https://vercel.com/new)을 사용하는 것입니다.

자세한 내용은 [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)을 참조하세요.

## 📝 라이선스

MIT

## 👨‍💻 개발자

이 프로젝트는 Framer 디자인을 기반으로 Next.js/TypeScript로 재구현되었습니다.
