import type { Project, TechTalk } from "@/types/portfolio";

export const profileData = {
  name: "이승현",
  title: "Frontend Developer",
  tagline:
    "함께할 때 최고의 아웃풋을 내고,\n책임감을 최고의 덕목이라 여기는 프론트엔드 개발자 이승현입니다.",
  description:
    "사용자 중심의 인터페이스와 효율적인 코드 구조를 통해 직관적이고 반응성 높은 웹 애플리케이션을 개발하는 것을 목표로 합니다. 최신 프론트엔드 기술과 모범 사례를 활용하여 고품질의 제품을 만드는 데 열정을 가지고 있습니다.",
  email: "oak20005@naver.com",
  github: "https://github.com/seungsimdang",
  skills: [
    "React",
    "Vue 3",
    "TypeScript",
    "Next.js",
    "TanStack Query",
    "Zustand",
    "Pinia",
    "Tailwind CSS",
    "Playwright",
  ],
};

export const projects: Project[] = [
  {
    id: "globber",
    title: "Globber",
    period: "2025.08 ~ 현재",
    role: "프론트엔드 개발",
    techStack: [
      "Next.js 15",
      "React 19",
      "TypeScript",
      "Globe.gl",
      "TanStack Query",
      "Zustand",
      "Three.js",
    ],
    summary: "3D 지구본 기반 여행 시각화 웹 애플리케이션.",
    link: "https://globber.world/",
    thumbnail: "/images/projects/globber/thumbnail.png",
    experiences: [
      {
        title: "3D 지구본 시각화 시스템 - 이중 클러스터링 알고리즘 구현",
        problem:
          "수백 개의 여행 마커를 3D 지구본에 효과적으로 표시해야 했으나, 성능 저하 및 사용자 경험 문제 발생. 많은 마커로 인한 화면 혼잡도 증가, 클러스터 클릭 시 부정확한 위치로 이동, 대륙/국가 단위 탐색의 어려움.",
        solution:
          "이중 클러스터링 알고리즘 구현으로 대륙 → 국가 계층 구조의 클러스터링 시스템 개발. 정밀한 앵커링 시스템으로 클러스터 클릭 시 정확한 위치로 카메라 이동 기능 구현.",
        tradeoff: {
          advantages: "직관적인 계층 탐색, 성능 최적화",
          disadvantages: "복잡한 상태 관리 필요, 초기 개발 비용 증가",
          rationale:
            "사용자 테스트 결과, 계층적 탐색이 더 직관적이라는 피드백 수집. 대안인 단일 레벨 클러스터링은 더 간단하지만 UX 저하.",
        },
        result:
          "클러스터 클릭 시 자동으로 앵커링되는 기능을 구현하여 사용자 탐색 경험 개선. 대륙 → 국가 단위로 자연스러운 탐색 가능.",
        learning:
          "복잡한 3D 시각화에서는 계층적 데이터 구조와 상태 관리가 핵심. 대규모 데이터 시각화 시 클러스터링을 통한 성능 최적화, 사용자 인터랙션의 정확성이 UX에 직접적 영향, Custom Hook을 통한 복잡한 로직의 재사용성 확보.",
      },
      {
        title: "이모지 인터랙션 시스템 - 모바일 키보드 대응 및 디바운싱 최적화",
        problem:
          "여행 기록에 실시간으로 이모지를 등록하고 반응할 수 있는 인터랙티브 시스템 필요. 키보드와 이모지 picker UI 겹침, 이모지 중복 등록 시 사용자 피드백 부재, 화면 밖 이모지 위치 처리 미흡.",
        solution:
          "동적 UI 포지셔닝으로 키보드 높이 감지 및 picker 위치 자동 조정 (Viewport API 활용). 디바운싱 최적화로 이모지 카운팅 API 호출 최적화하여 서버 부하 감소. 토스트 피드백으로 중복 등록 시도 시 명확한 사용자 안내 제공. React Portal, Debouncing, Dynamic Positioning 활용.",
        tradeoff: {
          advantages: "모든 기기에서 일관된 UX, 키보드 대응 자동화",
          disadvantages: "Viewport API 의존성, 복잡한 상태 관리",
          rationale:
            "Mobile-first 디자인 원칙. 대안인 Fixed Positioning은 간단하지만 키보드 대응 불가.",
        },
        result:
          "키보드 겹침 이슈 해결. 디바운싱으로 API 호출 빈도 감소. 사용자 피드백으로 중복 등록 시도 시 명확한 안내 제공.",
        learning:
          "모바일 환경의 키보드 처리는 Viewport API를 활용한 동적 대응이 필수. 사용자 입력 빈도가 높은 기능은 디바운싱으로 성능 최적화, 에러 상황에서 명확한 피드백 제공이 UX 만족도 향상, 크로스 플랫폼 대응 시 실제 기기 테스트 필수.",
      },
    ],
  },
  {
    id: "dpm-core",
    title: "DPM Core",
    period: "2026.01 ~ 현재",
    role: "프론트엔드 개발",
    techStack: [
      "Next.js 15",
      "React 19",
      "TypeScript 5",
      "TanStack Query",
      "React Hook Form",
      "Radix UI",
      "Tailwind CSS 4",
      "Turborepo",
    ],
    summary:
      "디프만의 모든 활동을 지원하는 코어 시스템. 모노레포 구조로 Admin/Client 앱 통합 관리.",
    experiences: [
      {
        title: "과제 공지 상세 페이지 구현 - 제출 상태 관리 및 필터링 시스템",
        problem:
          "Admin과 Client 앱 간 공통 UI 컴포넌트 중복 개발로 인한 유지보수 비용 증가. 모노레포 구조에서 컴포넌트 재사용 전략 부재.",
        solution:
          "컴포넌트 분리 및 재사용성 강화. 공통 컴포넌트를 packages/shared에 배치하여 모노레포 구조에서 재사용 가능하도록 설계.",
        tradeoff: {
          advantages:
            "관심사 분리로 유지보수성 향상, 빌드 최적화(Turborepo 캐싱), 타 프로젝트 재사용 가능.",
          disadvantages: "초기 설정 복잡도 증가, 의존성 관리 필요.",
          rationale:
            "장기적으로 Admin과 Client 앱에서 공통 컴포넌트를 재사용할 가능성이 높고, 초기 리팩토링 비용이 이후 유지보수 비용 절감으로 이어질 것으로 판단",
        },
        result:
          "shared 패키지의 컴포넌트를 재사용하여 Admin/Client 앱 간 일관성 확보.",
        learning:
          "공통 컴포넌트를 별도 패키지로 관리하여 여러 앱에서 재사용 가능한 모노레포의 장점 활용.",
      },
    ],
  },
  {
    id: "semt",
    title: "SEMT 제품 관리 시스템",
    period: "2025.11 ~ 현재",
    role: "프론트엔드 개발",
    techStack: [
      "Next.js 16",
      "React 19",
      "TypeScript 5",
      "TanStack Query v5",
      "Zod",
      "React Hook Form",
      "Zustand",
      "Biome",
      "pnpm",
    ],
    summary:
      "의료기기 자산 관리 웹 애플리케이션 (Service Engineer Management Tool)",
    experiences: [
      {
        title: "전체 CSR → Streaming SSR 아키텍처 전환",
        problem:
          "모든 데이터 페칭이 클라이언트 사이드('use client')에서 이루어져 초기 페이지 렌더링 시 빈 화면이 노출되는 구조였음. 인증 토큰을 localStorage에 저장해 서버 컴포넌트에서 접근이 불가능했고, SSR 프리페치 후에도 데이터가 느릴 경우 전체 페이지 렌더링이 블로킹되며 에러 상황의 fallback UI도 부재했음.",
        solution:
          "prefetchQuery + HydrationBoundary + useSuspenseQuery 패턴 도입으로 서버사이드 프리페치 구현. 토큰 저장소를 localStorage → Cookie로 이관하고 set-cookie Route Handler를 신규 생성하여 서버 컴포넌트에서 쿠키 접근 가능하도록 캡슐화. 6개 페이지를 page.tsx(서버)와 *-content.tsx(클라이언트)로 역할 분리. 이후 @suspensive/react-query의 QueriesHydration을 활용한 Streaming SSR로 고도화하여 각 페이지 layout에 Suspense + ErrorBoundary를 추가하고 여러 쿼리를 단일 Streaming 경계로 묶음.",
        tradeoff: {
          advantages:
            "서버에서 데이터를 미리 페칭해 HTML에 포함하므로 초기 로딩 시 빈 화면 제거. Streaming으로 준비된 데이터부터 순차 렌더링하여 체감 속도 개선. 클라이언트 번들 의존도 감소.",
          disadvantages:
            "서버/클라이언트 컴포넌트 경계를 명시적으로 관리해야 하는 복잡도 증가. @suspensive/react-query와 TanStack Query v5의 버전 호환성 주의 필요.",
          rationale:
            "localStorage 기반 CSR은 서버 컴포넌트 활용이 불가능하고, 빈 화면 노출로 실사용자 피드백이 부정적이었음. 토큰 저장소 교체를 Route Handler로 캡슐화하면 클라이언트 코드 변경 없이 SSR 전환이 가능하다고 판단.",
        },
        result: "6개 페이지 SSR 구조 전환. 클라이언트 번들 의존도 대폭 감소.",
        learning:
          "Next.js App Router에서 SSR을 적용할 때 localStorage → Cookie 교체가 선행 과제임. API Route Handler로 토큰 설정을 캡슐화하면 클라이언트 코드 변경을 최소화할 수 있음. QueriesHydration이 복수 prefetchQuery를 단일 Suspense 경계로 감싸는 추상화를 이해하면 Streaming SSR 보일러플레이트 없이 적용 가능.",
      },
      {
        title: "Zod + React Hook Form 기반 폼 유효성 검증 체계화",
        problem:
          "기존 폼 로직이 useState로 formData를 관리하는 방식이어서 각 필드의 유효성 검증이 컴포넌트마다 분산되고, 오류 메시지 기준이 일관되지 않았음. PC 등록, QC, 출하, 설치, 수리 등 10개 이상의 복잡한 탭 폼이 동일한 필드임에도 서로 다른 검증 로직을 가지고 있었음.",
        solution:
          "Zod 스키마 기반 타입 안전 유효성 검증과 React Hook Form으로 폼 상태 관리를 일원화. 스키마 파일 9개를 신규 생성하여 검증 로직을 단일 소스화. @hookform/resolvers로 Zod와 RHF를 연결. 스키마 파일을 먼저 분리한 뒤 컴포넌트 단위로 점진적으로 적용하여 리그레션 위험 최소화.",
        tradeoff: {
          advantages:
            "z.infer<typeof schema>로 타입 자동 추론하여 타입 중복 선언 제거. 스키마 파일 분리로 동일 필드의 유효성 기준이 단일 소스화되어 테스트 가능성과 재사용성 향상.",
          disadvantages:
            "React Hook Form은 uncontrolled 컴포넌트 방식이므로 기존 controlled state 방식과 혼용 불가. 전면 교체 시 리그레션 위험이 존재.",
          rationale:
            "점진적 마이그레이션(스키마 파일 먼저 분리 → 컴포넌트 단위 적용)으로 리그레션 위험을 최소화하면서도 검증 로직 중앙화의 이점을 확보할 수 있다고 판단.",
        },
        result: "스키마 9개로 중앙화하여 18개 폼 컴포넌트의 유효성 기준 통일.",
        learning:
          "유효성 검증 로직을 컴포넌트 바깥 스키마 파일로 분리하면 테스트 가능성과 재사용성이 동시에 향상됨. z.infer<typeof schema>를 통한 타입 자동 추론으로 타입 중복 선언을 제거하는 패턴이 특히 폼이 많은 관리 시스템에서 효과적.",
      },
      {
        title: "프로덕션 환경 런타임 설정 동적 로드 시스템 설계",
        problem:
          "하드코딩된 process.env.NEXT_PUBLIC_IMAGE_BASE_URL 사용으로 인해 Docker 컨테이너 배포 시 빌드 시점의 환경 변수가 고정되어, 배포 환경에 따라 이미지가 로드되지 않는 문제 발생. 개발 환경에서 빌드한 이미지를 프로덕션에 배포하면 개발 서버 URL이 하드코딩되어 이미지를 찾을 수 없었음.",
        solution:
          "/api/config 엔드포인트를 통해 런타임에 환경 변수를 동적으로 fetch하는 시스템 구축. EnvManager 싱글톤 패턴으로 환경 설정을 중앙 관리. getEnv() 유틸리티 함수로 모든 컴포넌트에서 일관된 방식으로 환경 변수 접근.",
        tradeoff: {
          advantages:
            "한 번의 빌드로 모든 배포 환경 대응 가능 (개발/프로덕션), Docker 컨테이너 재빌드 없이 환경 변수만 변경하여 배포 가능, CI/CD 파이프라인 간소화",
          disadvantages:
            "초기 로딩 시 추가 HTTP 요청 발생 (약 50ms), 환경 변수 초기화 전 컴포넌트 렌더링 시 에러 가능성",
          rationale: "배포 유연성과 CI/CD 효율성이 초기 로딩 비용보다 중요",
        },
        result:
          "배포 환경별 재빌드 불필요, Docker 이미지 재사용 가능. API 응답 시간 < 50ms로 사용자 체감 지연 없음.",
        learning:
          "빌드 타임 vs 런타임 설정의 트레이드오프 이해. 컨테이너 기반 배포 환경에서의 환경 변수 관리 전략. 싱글톤 패턴을 활용한 전역 상태 관리 및 초기화 타이밍 제어.",
      },
    ],
  },
  {
    id: "endo-admin",
    title: "Endo Admin Dashboard",
    period: "2025.11 ~ 현재",
    role: "프론트엔드 개발",
    techStack: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "TanStack Query",
      "Zustand",
      "Tailwind CSS",
    ],
    summary: "의료 장비 관리시스템",
    experiences: [
      {
        title: "React 19 + Suspense 기반 선언적 비동기 처리 아키텍처 구축",
        problem:
          "기존 useQuery 기반 명령형 상태 관리는 isPending, isError, data null 체크 등 보일러플레이트 코드 산재. 컴포넌트마다 다른 로딩/에러 처리 방식으로 일관성 부족. props drilling으로 전달되는 initialData로 인한 타입 복잡도 증가.",
        solution:
          "useSuspenseQuery + ErrorBoundary 패턴 도입.\n- useCustomSuspenseQuery 커스텀 훅 설계: API 응답 자동 unwrapping 및 타입 안정성 확보.\n- ErrorBoundaryProvider 구현: 전역 에러 처리 및 QueryClient 자동 리셋 기능.\n- react-error-boundary 라이브러리 도입으로 표준화된 에러 처리.",
        tradeoff: {
          advantages:
            "Suspense의 선언적 API로 컴포넌트에서 로딩/에러 상태 관리 코드 완전 제거, ErrorBoundary로 에러 처리를 컴포넌트 트리 상위로 위임하여 관심사 분리",
          disadvantages:
            "Suspense는 SSR에서 폴백 UI가 서버 렌더링되지 않음. 마이그레이션 시 CSR 위주 페이지(대시보드, 관리자 페이지)부터 단계적 적용하고, SEO 중요 페이지는 Streaming SSR 또는 서버 컴포넌트 직접 fetch 방식 병행 필요",
          rationale:
            "관리자 대시보드는 SEO가 불필요하고 인증 후 접근하므로 Suspense의 이점이 단점보다 크다고 판단",
        },
        result:
          "- 보일러플레이트 코드 제거: isPending, isError, initialData, null 체크 로직 완전 제거.\n- 타입 안정성 향상: MapData | null → MapData.\n- 에러 처리 일관성: ErrorBoundary로 모든 비동기 에러 중앙 집중 처리.",
        learning:
          "Suspense는 단순 로딩 처리가 아닌 컴포넌트의 관심사 분리 철학을 구현하는 도구.\n- 선언적 API 설계: '무엇을 보여줄지'만 정의, '언제 보여줄지'는 프레임워크에 위임. 추상화 계층 추가 시 초기 코드량 증가하지만, 이후 모든 컴포넌트에서 반복 코드 제거 효과.",
      },
    ],
  },
  {
    id: "endo-report",
    title: "Endo Report",
    period: "2024.11 ~ 현재",
    role: "프론트엔드 개발",
    techStack: [
      "Vue 3",
      "TypeScript",
      "Vite",
      "Pinia",
      "TanStack Query",
      "Tailwind CSS",
    ],
    summary:
      "AI 기반 내시경 검진 결과를 의료진용 전문 리포트로 자동 생성하고 관리하는 엔터프라이즈 웹 솔루션",
    experiences: [
      {
        title: "무한 스크롤 기능 구현 및 성능 최적화",
        problem:
          "리포트 편집 화면에서 검사 이미지를 한 번에 모두 로딩하여 초기 로딩 시간이 길어지고 메모리 사용량이 과도하게 증가. 수백 장의 의료 이미지를 한 번에 렌더링하면서 브라우저 성능 저하 발생.",
        solution:
          "TanStack Query의 useInfiniteQuery hook을 활용한 페이지네이션 기반 무한 스크롤 구현. Intersection Observer API 기반 센티넬 요소를 통한 자동 다음 페이지 로딩. 역순 정렬 시 현재까지 스크롤된 이미지 개수만큼 역순으로 refetch하여 중복 fetching 방지.",
        tradeoff: {
          advantages:
            "초기 로딩 속도 개선, 메모리 사용량 감소, 네트워크 대역폭 효율적 사용",
          disadvantages:
            "페이지네이션 로직 추가로 코드 복잡도 증가, 역순 정렬 시 추가 refetch 필요",
          rationale:
            "의료 이미지의 특성상 고해상도 이미지를 다수 다루므로, 성능 최적화가 사용성에 더 중요하다고 판단",
        },
        result:
          "페이지네이션으로 인한 초기 로딩 데이터량 약 90% 감소 (전체 이미지 → 첫 10개).",
        learning:
          "TanStack Query의 useInfiniteQuery를 활용한 페이지네이션 패턴 이해. Intersection Observer API를 통한 효율적인 스크롤 이벤트 처리 방법 습득. 대용량 데이터 렌더링 시 가상화(Virtualization)와 페이지네이션의 트레이드오프 이해.",
      },
      {
        title: "PDF 변환 텍스트 깨짐 및 이미지 렌더링 문제 해결",
        problem:
          "vue3-html2pdf 라이브러리를 사용한 PDF 변환 시 한글 단어가 중간에서 줄바꿈되어 텍스트 가독성 저하. HTML에서는 정상이던 띄어쓰기가 PDF에서 어색하게 표시. SVG의 linear gradient가 PDF에서 렌더링되지 않고 빈 공간으로 표시.",
        solution:
          "- CSS word-break: keep-all 속성을 소견 텍스트에 적용하여 단어 단위 줄바꿈 보장.\n- CSS white-space: pre 속성으로 모든 공백과 줄바꿈을 원본 그대로 보존.\n- PDF 변환용 solid color SVG 아이콘을 별도로 생성하여 조건부 렌더링.",
        tradeoff: {
          advantages:
            "텍스트 정확성 보장으로 의료 문서로서의 신뢰성 확보, 추가 라이브러리 없이 CSS 속성만으로 해결하여 번들 크기 유지",
          disadvantages:
            "word-break: keep-all로 인해 긴 단어가 있을 경우 레이아웃이 넓어질 수 있음, PDF 전용 아이콘 추가로 아이콘 관리 포인트 증가",
          rationale: "",
        },
        result: "PDF 변환 시 텍스트 깨짐 이슈 0건으로 감소.",
        learning:
          "HTML to Canvas 변환 시 CSS 렌더링 차이에 대한 이해. 브라우저 렌더링과 Canvas 기반 렌더링의 차이점 학습. SVG gradient가 canvas에서 지원되지 않는 한계 인식 및 우회 전략 수립.",
      },
    ],
  },
];

export const techTalks: TechTalk[] = [
  {
    id: "mcp-llm-talk",
    title: "MCP + LLM은 프론트 개발을 대체할 수 있는가?",
    date: "2025.06",
    venue: "팀 세미나",
    description:
      "급속히 발전하는 AI 기술과 프론트엔드 개발의 미래 연관성에 대한 팀 내 관심 증가에 따라, MCP(Model Context Protocol) 프로토콜의 핵심 개념과 LLM 연동 방식을 분석. 프론트엔드 개발 워크플로우에 미치는 영향 및 실무 적용 가능성을 조사하여 발표.",
    impact:
      "최신 AI 기술 트렌드를 팀원들과 공유하여 조직의 기술 역량 향상에 기여. AI 도구 활용 가능성을 사전 검토하여 개발 효율성 개선 방향 제시. 복잡한 기술 개념을 이해하기 쉽게 정리하여 전달하는 커뮤니케이션 능력 입증.",
    link: "https://drive.google.com/file/d/1hm66rGmaQibWm8GMFBdTUdJE9_7oH2VK/view?usp=sharing",
  },
  {
    id: "test-automation-talk",
    title: "테스트 자동화 도입 사례 공유",
    date: "2024.11",
    venue: "전사 세미나",
    description:
      "KBHC Web Console 프로젝트에서 Playwright 기반 E2E 테스트 자동화를 도입하여 QA 리소스 99% 절약 (2명 × 2주 → 수분)을 달성한 경험을 공유. storageState와 workerIndex를 활용한 테스트 성능 최적화 기법 및 Page Object Model 패턴 적용 사례 발표.",
    impact:
      "전사 품질 문화 확산에 기여하고, 다른 팀의 테스트 자동화 도입을 촉진. 테스트 자동화 도구 선택부터 구현까지의 실무 노하우를 조직 차원에서 공유하여 개발 생산성 향상 기여.",
    link: "https://drive.google.com/file/d/1MQLk7nSVlmTTA0_wAhzZpQeDlfemdUcf/view?usp=sharing",
  },
];
