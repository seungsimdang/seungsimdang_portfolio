# Nick's Portfolio - Product Design Partner

Framer 프로젝트를 기반으로 구현한 완전한 반응형 포트폴리오 웹사이트입니다.

## 📋 프로젝트 개요

이 프로젝트는 Framer에서 디자인된 포트폴리오를 Next.js와 TypeScript로 완전히 재구현한 것입니다. Framer의 레이아웃 구조, 스타일 시스템, 그리고 반응형 디자인을 충실히 따릅니다.

## 🛠 기술 스택

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Library**: React 19.2.3
- **Build Tool**: Turbopack

## 📱 반응형 디자인

Framer 프로젝트의 4개 브레이크포인트를 완벽하게 구현:

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

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 결과를 확인하세요.

### 빌드

```bash
npm run build
```

### 프로덕션 실행

```bash
npm start
```

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
