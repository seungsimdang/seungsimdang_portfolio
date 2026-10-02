# triage-1: 1차 리뷰 9-1 게이트 판정

- 대상: `code-review-1.md`, `security-review-1.md`
- 기준 커밋: 0e5d34a
- 판정자: orchestrator (각 finding을 코드에서 직접 확인)

## 재작업 (사이클 diff 안, 타당)

| finding | 심각도 | 확인 결과 | 조치 |
| --- | --- | --- | --- |
| CR-F4 | Low | `src/constants/project-card-theme.ts:7`이 `Record<string, ...>`라 id 누락 시 타입 에러 없이 `undefined`가 펼쳐짐 | 프로젝트 id를 리터럴 유니온 타입으로 만들고 테마 맵 키를 그 타입으로 제한 |
| CR-F5 | Low | `src/components/common/hero-section.tsx:27`이 `motion-reduce:hidden`으로 CSS만 숨겨 WordCycler 타이머가 계속 실행됨 | WordCycler가 `prefers-reduced-motion`이면 순환을 멈추도록 처리하고 중복 정적 목록 제거 여부 검토 |
| CR-F6 | Low | 라벨은 talks인데 `BlogPreview`, `BlogPage` 이름 유지 (`src/components/common/blog-preview.tsx:14`, `src/app/blog/page.tsx:6`) | 컴포넌트·파일·함수 이름을 talk 기준으로 변경. 경로 `/blog`는 유지 |
| SEC-I2 | Info | `src/app/work/[id]/page.tsx`에 `dynamicParams` 미지정, 미등록 id도 서버 렌더 후 404 | `export const dynamicParams = false` 추가 |

## 기각

| finding | 기각 사유 |
| --- | --- |
| CR-F1 `/work` e2e 누락 | Task 계약상 T05는 새 테스트를 쓰지 않고 T09 QA가 신규 테스트를 작성한다. T09 지시에 포함 |
| CR-F2 리셋 제거로 기존 섹션 변화 | 3ace956은 사용자가 버튼 padding 0 화면을 보고한 데 따른 근본 원인 수정이다. 결함 아님. T09에서 4개 폭 육안 점검 |
| SEC-F1 이메일 평문 공개 | 원본 `profileData` 공개 의도와 일치. 요구사항 범위 내 |

## 사용자 결정 필요 (사이클 diff 밖 또는 콘텐츠 판단)

| finding | 심각도 | 확인 결과 |
| --- | --- | --- |
| CR-F3 `<main>` 중첩 | Low | `src/app/layout.tsx:21`과 `src/app/page.tsx:11` 모두 `<main>`. 013fff5 이전부터 존재 |
| SEC-F2 보안 응답 헤더 없음 | Low | `next.config.ts` 비어 있음. 이번 diff가 건드리지 않은 파일 |
| SEC-I3 canonical·OG·metadataBase 없음 | Info | `src/app/layout.tsx` metadata. 보안이 아닌 SEO 항목 |
| SEC-F3, SEC-I1 사내 프로젝트 내부 구현·Drive 링크 공개 | Low/Info | 원본 데이터 그대로 이식. NDA·공개 권한은 사용자만 판단 가능 |

## 사용자 결정 결과

- CR-F3: 이번 사이클에 포함
- SEC-F2, SEC-I3: 둘 다 포함. 배포 도메인은 Vercel 기본 도메인 사용 허용. 이 저장소의 Vercel 프로젝트는 아직 없으므로 도메인을 하드코딩하지 않고 Vercel 시스템 환경 변수 `VERCEL_PROJECT_PRODUCTION_URL`로 `metadataBase`를 정하고, 없으면 `http://localhost:3000`으로 폴백한다.
- SEC-F3, SEC-I1: 조치 없음. 사용자 답변 "코드 전체가 공개되는게 아니면 ㄱㅊ. 기존 포트폴리오에 있던 내용들은 전부 공개해도 돼."
