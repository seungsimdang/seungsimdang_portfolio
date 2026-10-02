# code-review-2: T07 2차 재리뷰

- 범위: triage-1 재작업 항목 해결 여부 + `git diff 9506615 3594d1e -- src next.config.ts`
- CodeRabbit: 재작업 재리뷰이므로 생략(지시문 규칙)
- 판정: **재작업** (Medium 1건)

## 재작업 항목 해결 여부

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| CR-F3 `<main>` 중첩 | 해결 | `src/app/page.tsx` 루트를 `<div>`로 교체. `src/` 내 `<main>`은 `layout.tsx:33` 하나뿐 |
| CR-F4 id 타입 | 해결 | `ProjectId` 유니온 + `Record<ProjectId, ...>` (`project-card-theme.ts:9`, `types/portfolio.ts`). id 누락·오타 시 컴파일 에러 |
| CR-F5 reduced-motion | 해결(경미한 잔여) | `word-cycler.tsx:80`에서 타이머 미시작. 아래 F3 참고 |
| CR-F6 네이밍 | 해결 | `talk-preview.tsx`, `TalkPreview`, `TalkPage`로 변경. `src`·e2e에 `BlogPreview` 잔존 참조 없음. 경로 `/blog` 유지 |
| SEC-I2 | 해결 | `work/[id]/page.tsx:17` `dynamicParams = false` |
| SEC-F2 | 해결 | `next.config.ts` 헤더 3종 추가, 값 적절 |
| SEC-I3 | 부분 해결, 신규 결함 있음 | 아래 F1 |

## 신규 finding

### F1 [Medium] 루트 layout의 `alternates.canonical: "/"`가 하위 페이지에 상속됨
- 위치: `src/app/layout.tsx:14`
- 근거: Next metadata는 하위 세그먼트가 `alternates`를 정의하지 않으면 상위 값을 상속한다. `generateMetadata`에서 canonical을 정의한 곳은 `work/[id]`뿐이다. `/about`, `/blog`, `/contact`, `/projects`(모두 metadata 없음)는 `<link rel="canonical" href=".../">`를 내보내 검색엔진에 "이 페이지는 홈의 중복"이라고 알린다. SEC-I3(SEO 개선) 취지와 반대로 동작한다. `openGraph`의 title·description도 같은 이유로 모든 페이지에서 홈 값이 된다(덜 심각).
- 제안: layout에서 `alternates`를 제거하고 `app/page.tsx`에 `export const metadata = { alternates: { canonical: "/" } }`를 두거나, 각 페이지에 자기 canonical을 지정한다. 최소 변경은 전자.

### F2 [Low] metadataBase 폴백이 localhost
- 위치: `src/app/layout.tsx:7-9`
- 근거: Vercel 외 환경(`next start`, 다른 호스트)에서는 프로덕션 canonical·OG URL이 `http://localhost:3000`으로 나간다. 사용자 결정(Vercel 변수 사용, localhost 폴백)과 일치하므로 결함은 아니다. 문자열 전달은 Next 16 타입 `string | URL | null`에 맞고 `new URL` 경고 우회도 정상.
- 제안: 조치 불필요. Vercel 프로젝트 생성 후 변수 주입 여부만 T09/배포 시 확인(`VERCEL_PROJECT_PRODUCTION_URL`은 Vercel이 자동 주입, 프리뷰에서도 프로덕션 도메인 값이라 프리뷰 canonical은 프로덕션을 가리킴. 의도에 부합).

### F3 [Info] reduced-motion 처리의 잔여 사항
- 위치: `src/components/common/word-cycler.tsx:80`, `hero-section.tsx:27-38`
- 근거: (1) 마운트 시 1회만 검사해 이후 OS 설정 변경에는 반응하지 않는다. (2) reduced-motion에선 CSS가 WordCycler 래퍼를 숨기므로 동작상 문제는 없고, 중복 정적 목록도 여전히 존재(triage는 "검토"로만 요구, 접근성 상 sr-only + 정적 표시가 분리돼 있어 허용 가능). 
- 제안: 조치 불필요.

### F4 [Info] 상세 페이지 OG
- 위치: `src/app/work/[id]/page.tsx:32-40`
- 근거: `openGraph.images`는 상대 경로이며 metadataBase로 절대화되므로 정상. thumbnail 없는 프로젝트는 images 생략되어 안전. `dynamicParams=false`로 `if (!project) return {}` 분기는 사실상 도달 불가이나 방어 코드로 무해.

## 판정
재작업: F1(canonical 상속) 수정 필요. 나머지는 통과.
