# Nick's Portfolio - Product Design Partner

Framer 디자인을 바탕으로 작성된 Next.js 포트폴리오 프로젝트입니다. 기존 디자인 정보를 유지하면서 개발·검증 환경과 AI 작업 규칙을 구성했습니다.

## 📋 프로젝트 개요

Framer에서 디자인된 포트폴리오를 Next.js와 TypeScript로 구현한 저장소입니다. 아래 Framer 노드, 브레이크포인트와 스타일 정보는 기존 참조 자료를 유지한 것입니다. 이번 스캐폴딩에서는 Framer 원본과의 시각적 일치를 검증하지 않았습니다.

## 🛠 기술 스택

- **Framework**: Next.js 16.3.8 (App Router)
- **Language**: TypeScript 7.0.2
- **Styling**: Tailwind CSS 4.3.3
- **UI Library**: React 19.3.0
- **Build Tool**: Turbopack
- **Package Manager**: pnpm 11.18.0
- **Lint / Format**: Biome 2.5.15
- **Browser Test**: Playwright 1.63.0

Next.js·React·Tailwind의 Context7 문서를 확인하고 npm registry의 `latest` stable 버전을 적용했습니다. 실제 의존성은 `package.json`과 `pnpm-lock.yaml`로 관리합니다. ESLint는 Biome으로 교체했습니다.

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

```
seungsimdang_portfolio/
├── app/
│   ├── layout.tsx              # Root 레이아웃 (Navbar + Footer)
│   ├── page.tsx                # Home 페이지
│   ├── globals.css             # 글로벌 스타일 + 반응형 CSS
│   ├── projects/
│   │   └── page.tsx            # Projects 페이지
│   ├── about/
│   │   └── page.tsx            # About 페이지
│   ├── blog/
│   │   └── page.tsx            # Blog 페이지
│   ├── contact/
│   │   └── page.tsx            # Contact 페이지
│   └── not-found.tsx           # 404 페이지
├── components/
│   ├── WordCycler.tsx          # 텍스트 순환 애니메이션
│   ├── ProjectCard.tsx         # 프로젝트 카드
│   ├── Button.tsx              # 버튼 컴포넌트
│   ├── HeroSection.tsx         # 히어로 섹션
│   ├── AboutSection.tsx        # About 섹션
│   ├── BlogPreview.tsx         # 블로그 미리보기
│   ├── Navbar.tsx              # 네비게이션 바
│   └── Footer.tsx              # 푸터
├── package.json
├── tsconfig.json
├── next.config.ts
├── biome.json                 # 정적 검사와 포맷
├── playwright.config.ts       # 프로덕션 앱 브라우저 테스트
├── tests/e2e/                 # 페이지·탐색·404 스모크 테스트
├── AGENTS.md                  # AI 작업 시작점
├── docs/agent-rules/          # 구조·검증·Git 규칙
├── artifacts/scaffolding/    # 스캐폴딩 결과
├── .github/workflows/ci.yml  # 설치·검사·빌드·E2E
└── README.md
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

Node.js 22.13 이상과 pnpm 11.18.0을 사용합니다. 이번 로컬 검증 환경은 Node.js 26.5.1입니다. 기본 앱은 환경변수나 외부 서비스 자격증명을 요구하지 않습니다. `.env.example`에는 안내만 있습니다.

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

### 프로덕션 실행

```bash
pnpm start
```

## 개발 검사와 작업 흐름

```bash
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

E2E는 빌드된 앱을 `http://127.0.0.1:3100`에서 직접 시작합니다. `/`, `/projects`, `/about`, `/blog`, `/contact`, 내부 탐색, 404와 WordCycler 텍스트 순환을 데스크톱·모바일 Chromium에서 확인합니다. 해당 포트가 비어 있어야 합니다. CI는 lockfile 설치 → 정적 검사 → 타입 검사 → 빌드 → Chromium 설치 → E2E 순서입니다.

현재 문의 폼은 콘솔 출력만 수행하며 이메일 전송은 연결되지 않았습니다. 프로젝트·블로그 상세 URL의 구현과 외부 소셜 링크는 이 스모크 테스트의 검증 대상이 아닙니다.

AI 작업은 [AGENTS.md](AGENTS.md)와 [공용 규칙](docs/agent-rules/README.md)에서 시작합니다. 기본은 단일 실행 흐름이며 인증·DB·서버 상태 관리와 역할별 에이전트는 추가하지 않았습니다. 구성 결정, 검사 결과와 미검증 항목은 [스캐폴딩 결과](artifacts/scaffolding/summary.md)에 기록합니다.

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
