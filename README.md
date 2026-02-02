# Nick's Portfolio - Product Design Partner

Framer 프로젝트를 기반으로 구현한 반응형 포트폴리오 웹사이트입니다.

## 기술 스택

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Library**: React 19.2.3

## 주요 기능

### 1. 반응형 디자인
- **Desktop (1440px)**: 전체 레이아웃
- **Laptop (1024px)**: 중간 크기 화면 최적화
- **Tablet (810px)**: 태블릿 레이아웃
- **Mobile (390px)**: 모바일 레이아웃

### 2. 컴포넌트 구조

#### WordCycler
- Framer의 WordCycler 코드를 기반으로 구현
- 텍스트 순환 애니메이션
- 부드러운 fade-in/out 효과

#### ProjectCard
- Sticky 포지션을 활용한 스크롤 효과
- 각 프로젝트별 고유 색상 테마
- 반응형 카드 크기 조정

#### HeroSection
- 인사말 및 가용성 상태 표시
- WordCycler를 활용한 동적 헤딩
- 반응형 타이포그래피

#### AboutSection
- 그리드 기반 레이아웃
- 텍스트와 이미지 배치
- 반응형 버튼 배치

#### BlogPreview
- 블로그 포스트 미리보기
- 호버 효과
- 링크 연결

#### Button
- Primary/Secondary 변형
- 반응형 버튼 스타일
- 부드러운 hover 효과

## 디렉토리 구조

```
seungsimdang_portfolio/
├── app/
│   ├── layout.tsx          # Root 레이아웃
│   ├── page.tsx            # Home 페이지
│   └── globals.css         # 글로벌 스타일
├── components/
│   ├── WordCycler.tsx      # 텍스트 순환 컴포넌트
│   ├── ProjectCard.tsx     # 프로젝트 카드
│   ├── Button.tsx          # 버튼 컴포넌트
│   ├── HeroSection.tsx     # 히어로 섹션
│   ├── AboutSection.tsx    # About 섹션
│   └── BlogPreview.tsx     # 블로그 미리보기
├── package.json
├── tsconfig.json
└── next.config.ts
```

## 시작하기

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

## 스타일 가이드

### 타이포그래피

- **H1**: `text-h1` - 메인 헤딩 (clamp 3rem ~ 6.5rem)
- **H2**: `text-h2` - 서브 헤딩 (clamp 2rem ~ 4rem)
- **H3**: `text-h3` - 섹션 헤딩 (clamp 1.5rem ~ 2rem)
- **Body**: `text-body` - 본문 텍스트 (1rem)
- **Small**: `text-small` - 작은 텍스트 (0.875rem)

### 레이아웃

- **Container Padding**: `container-padding` - 반응형 좌우 패딩
- **Section Spacing**: `section-spacing` - 섹션 간 간격

### 색상

- **Background**: `#000000` (검정)
- **Foreground**: `#ffffff` (흰색)
- **Green**: `hsl(148, 100%, 50%)` (가용성 인디케이터)
- **White 25%**: `rgba(255, 255, 255, 0.25)` (구분선)
- **White 50%**: `rgba(255, 255, 255, 0.5)` (반투명)

## 프로젝트 데이터

현재 5개의 프로젝트가 포함되어 있습니다:

1. **bizz buzz** - Personal Project (2023)
2. **aquaflow** - Branding and Identity (2023)
3. **snackify** - UI/UX (2023)
4. **zengo** - Personal Project (2023)
5. **roverride** - Branding and Identity (2023)

## Framer 연동

이 프로젝트는 Framer 프로젝트를 기반으로 구현되었습니다:

- 원본 Framer 프로젝트 ID: `eL2hVs3sFTIi13Jf4fnj-1V3WI`
- WordCycler, Examples, Alt_Text 코드 컴포넌트 참고
- Framer의 레이아웃 구조와 스타일 시스템을 React로 변환

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 라이선스

MIT
