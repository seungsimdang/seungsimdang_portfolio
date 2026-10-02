# 코드 리뷰 1: real-project-data

- 대상: `git diff 013fff5 HEAD -- src tests public` (3ace956, 0e5d34a)
- 판정: **통과 (조건부, Medium 1건은 재작업 권장)**. Critical/High 없음.
- 자동 검사: `pnpm check`, `pnpm knip`, `pnpm type-check` 모두 통과.

## 검증 결과 요약

| 항목 | 결과 |
|------|------|
| 데이터 일치 | 원본 `lib/portfolio-data.ts`와 `profileData` 전체, 상위 5개 프로젝트(globber, dpm-core, semt, endo-admin, endo-report) 전 필드, `techTalks` 2건을 스크립트로 deep-diff. 차이는 DPM Core summary "활동을지원하는" -> "활동을 지원하는" 1건뿐이며 결정 U8과 일치. 지어낸 내용 없음. |
| 목데이터 잔존 | bizz buzz, aquaflow, snackify, zengo, roverride, stfnco, Nick, Palo Alto, Procreate, Mailchimp, "Profile Image", "12 years", LMN, Netflix 등 grep 0건(Google은 techTalks 원본 drive 링크뿐). `public/*.svg` 삭제됨, 제외 프로젝트 썸네일 미복사. |
| 주석 식별자 | `src`, `tests`에서 R1/U3/T0x/BUG/finding/게이트 ID 인용 0건. em-dash 0건. |
| Tailwind | spacing arbitrary value 없음(`h-[90vh]`, `hover:scale-[1.02]`은 spacing 계열 아님). rounded/shadow 규칙 위반 없음. |
| work 상세 | `params` await, `generateStaticParams` 5개, `notFound()`, 빈 rationale 숨김, 외부 링크 `rel`, `whitespace-pre-line`로 `\n` 보존 모두 충족. |

## Findings

### F1 (Medium) `/work/{id}` e2e 테스트 누락
- 위치: `tests/e2e/navigation.spec.ts` (전체, 신규 단언 없음)
- 근거: requirements 6장은 "신규: `/work/{id}` 5개 200 + h1 확인, `/work/unknown` 404"를 요구한다. 현재 spec에는 `/work` 경로 단언이 한 건도 없다(`grep work/ tests` 0건).
- 영향: 이번 사이클의 신규 라우트(R3)와 `isActive`의 `/work/*` 활성 표시, 빈 rationale 숨김 같은 edge case가 회귀 보호를 받지 못한다.
- 제안: 기존 경로 루프처럼 5개 id와 title h1 단언, `/work/unknown`과 `/work/kbhc` 404 단언을 추가한다. 가능하면 id 목록을 `projects`에서 import해 데이터 복제를 피한다.

### F2 (Medium) 전역 리셋 제거로 인한 기존 섹션 레이아웃 변화 (의도된 변화이나 R6 문구와 충돌 가능)
- 위치: `src/app/globals.css` (3ace956에서 `* { margin:0; padding:0; box-sizing }` 삭제)
- 근거: 레이어 밖(unlayered) 리셋은 `@layer utilities`의 모든 margin/padding 유틸리티를 항상 이겼다. 제거 후 `p-*`, `px-*`, `py-*`, `m-*`, `mx-auto`가 처음으로 실제 적용된다. `box-sizing`은 Tailwind preflight(base 레이어)가 동일하게 제공하므로 영향 없음. `.container-padding`, `.section-spacing`은 레이어 밖 클래스라 이전에도 적용되어 변화 없음.
- 이번 diff가 클래스를 바꾸지 않은 곳에서 살아나는 유틸리티:
  - `src/components/ui/button.tsx:21` `px-32 py-16`: 버튼 내부 여백이 0에서 32/16으로 생김. 5개 이상 호출부 전부 영향.
  - `src/app/not-found.tsx`: gap 계열(`gap-16 md:gap-32`)은 gap이라 원래도 동작. 해당 파일에 margin/padding 유틸리티 없어 변화는 `mx-auto`(섹션 중앙 정렬)뿐.
  - 모든 페이지 섹션의 `mx-auto`: `max-w-content`(1920px)보다 넓은 뷰포트에서 이전엔 좌측 정렬, 이제 중앙 정렬.
  - `src/components/layout/navbar.tsx` `py-24`: navbar 높이가 약 29px에서 약 77px로 커짐. `--spacing-header: 92px`(`pt-header`)보다 작아 본문과 겹치지 않음.
- 영향: 디자인 의도(Framer 기반 여백)에 가까워지는 방향이라 결함은 아니다. 다만 requirements 11장 R6의 "기존과 동일한 spacing" 조사는 리셋이 살아 있던 상태에서 측정해 diff 0건이었으므로, 이번 제거는 R6 측정 결과와 시각적으로 달라진다. 사용자가 3ace956을 직접 요청한 것이 아니라면 의도 확인이 필요하다.
- 제안: orchestrator가 3ace956의 요청 근거를 확인한다. 확인되면 QA에서 4개 폭(390/810/1024/1440) 스크린샷으로 Button, navbar, footer, 중앙 정렬을 육안 점검한다. 코드 수정은 불필요.

### F3 (Low) 홈 페이지의 중첩 `<main>`
- 위치: `src/app/page.tsx:11`, `src/app/layout.tsx:21`
- 근거: layout이 `<main className="pt-header">`를 두고 홈이 다시 `<main>`을 렌더해 `main` 랜드마크가 중첩된다. 013fff5 시점 홈에도 있던 기존 문제이고 이번 diff가 새로 만든 것은 아니다(다른 페이지는 `div`).
- 제안: 홈의 최상위를 `div`로 통일(후속 항목).

### F4 (Low) `projectCardTheme[project.id]` 누락 시 조용한 undefined
- 위치: `src/app/page.tsx:26`, `src/app/projects/page.tsx:37`, `src/constants/project-card-theme.ts:7`
- 근거: `Record<string, ProjectCardTheme>`를 spread하므로 새 프로젝트 id를 데이터에 추가하고 테마를 빠뜨려도 타입 에러 없이 `bgColor`가 undefined로 빠져 투명 배경이 된다.
- 제안: 키를 `Project["id"]` 유니온이나 `satisfies`로 데이터와 묶거나, 지금 규모(5개)면 현행 유지하고 인지만 해 둔다.

### F5 (Low) 모션 감소 설정에서도 WordCycler가 숨김 상태로 계속 동작
- 위치: `src/components/common/hero-section.tsx:28-35`
- 근거: `motion-reduce:hidden`은 CSS 숨김일 뿐이라 컴포넌트가 마운트된 채 2초 타이머와 ResizeObserver가 돈다. `display:none`에서 측정 높이가 0으로 갱신되며, 이후 설정이 바뀌면 높이 0이 될 수 있다. 영향은 미미하다.
- 제안: 필요 시 `useReducedMotion` 훅으로 조건부 렌더(현재는 무시 가능).

### F6 (Low) 명칭 불일치
- 위치: `src/components/common/blog-preview.tsx`, `src/app/blog/page.tsx` (UI 라벨은 "talks")
- 근거: 사용자 결정으로 경로는 `/blog` 유지, 라벨은 talks라서 컴포넌트/함수명(`BlogPreview`, `BlogPage`)과 노출 명칭이 다르다. 결정에 따른 것이라 결함은 아니며 기록만 남긴다.

## 기타 확인 사항 (문제 없음)
- `key={experience.title}`, `key={link.url}`은 데이터 내 유일하여 문제 없음.
- 상세 페이지 `techStack.length > 0`, `link`, `experience.links` 가드로 빈 버튼 없음.
- 홈과 projects는 동일 `projects` 소스, 카드 5개, 모두 `/work/{id}` 링크.
- 접근성: 썸네일 alt, 외부 링크 sr-only 안내, 장식 SVG `aria-hidden` 유지.

## CodeRabbit 교차검토

CodeRabbit 미실행(이번 호출은 파일 산출물과 자체 리뷰 중심 지시이며 CLI 인증과 네트워크 확인을 하지 않았다). 자체 리뷰만으로 판정한다.

## 최종 판정

통과. F1(e2e 누락)은 requirements 6장 명시 항목이므로 재작업 권장, F2는 의도 확인 후 QA 육안 점검. 나머지는 Low 후속 항목.
