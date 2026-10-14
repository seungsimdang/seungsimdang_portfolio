# code-review-3: T07 사이클 전체 최종 리뷰

- 사이클 전체 최종 리뷰. 범위는 `git diff ac2e26b..HEAD`의 코드 변경(`artifacts/` 제외)이며 재작업 3bf60c3, 6f5e0b7, 81a9553 포함.
- 기준: `requirements.md`, `code-review-1/2.md`, `triage-1/2.md`, `triage-security-1.md`, `security-review-2.md`, `project-structure.md`.
- 제외(결정됨): F-1 신규 단위 테스트는 T09 이관, SEC-03~06 기각, 정적 CSP의 `script-src 'unsafe-inline'`은 사용자 결정.
- 코드 수정·커밋 없음.
- 검증: `pnpm type-check`, `pnpm check`, `pnpm knip` 통과, `pnpm exec vitest run` 247 통과.

## 이전 finding 재발 여부

| ID | 판정 | 근거 |
| --- | --- | --- |
| F-2~F-6 | 재발 없음 | `render-markdown.tsx`의 `pre`/표 래퍼, `blog-form.tsx`의 제목 대체와 알림 단일화, `blog/page.tsx`의 `POST_LABEL_MAX` 가드, `image-signature.ts` 공유가 그대로 유지됨 |
| N-1 | 해결 | 6f5e0b7로 표 래퍼 라벨이 `aria-label="표"`로 단순화됨(`render-markdown.tsx:46`). 스크롤 가능 여부를 단정하는 문구가 사라져 낭독이 정확해짐. Tab 정지점 유지는 triage-2 결정 |
| F-1 | 범위 밖 | T09 이관. blog 관련 단위 테스트가 `__tests__/`에 없음은 알려진 상태 |

## 재작업 간 상호작용 확인

- 3bf60c3(`section.table-scroll`)과 6f5e0b7(라벨)은 같은 컴포넌트의 연속 수정이며 충돌 없음. `globals.css:409-416`의 `.table-scroll` 규칙과 `table` 시맨틱이 일관됨.
- 81a9553의 slug `new` 금지(`blog.schema.ts` refine)는 생성(`postCreateInputSchema`)과 수정/삭제 경로의 `resolveSlug`(`posts/[slug]/route.ts`)와 공개 `loadPost` 모두에 같은 `postSlugSchema`로 적용돼 대칭임. 이관 스크립트 slug는 날짜 접두사라 `new`와 충돌하지 않음.
- 81a9553 CSP는 sanitize/렌더러 코드와 독립이며 3bf60c3의 `components` 단계(sanitize 이후)에 영향 없음.

## 81a9553 CSP가 앱 기능을 막는지 확인

- 경로 매칭: Next 번들 `path-to-regexp`로 직접 검증함. 공개 규칙 `/((?!admin(?:/|$)).*)`는 `/`, `/blog`, `/api/admin/posts`, `/api/auth/*`에 매칭되고 `/admin`, `/admin/`, `/admin/blog`에는 매칭되지 않음. `/admin/:path*`는 `/admin`과 하위에 매칭됨. 두 규칙이 겹치지 않아 CSP 헤더 중복 없음.
- 이미지: `img-src 'self' data: blob: https:`로 Blob 호스트, 본문 외부 https 이미지(`render-markdown.tsx`의 `unoptimized` `Image`), admin 미리보기 모두 허용됨.
- 분석: `Analytics`/`SpeedInsights`는 `(public)/layout.tsx`에만 있고 운영에서 `/_vercel/*` 같은 출처로 로드·전송되어 `script-src 'self'`, `connect-src 'self'`로 충분함. 개발 모드의 외부 디버그 스크립트는 차단되나 개발 한정 무동작이라 영향 없음.
- admin 업로드/미리보기: 업로드는 서버 `put` 경유 `fetch('/api/admin/uploads/post-image')`라 `connect-src 'self'` 충족. 미리보기는 클라이언트 렌더라 추가 출처 불필요.
- OAuth: `signIn('github')`가 `/admin/login`에서 실행되고 그 문서가 `form-action 'self' https://github.com`을 가짐. 공개 규칙의 `form-action 'self'`는 OAuth 경로와 무관.
- 폰트/스타일: `next/font` 자체 호스팅, 외부 `url()`/`@import` 없음(`globals.css`는 `@import "tailwindcss"`만), `style-src 'unsafe-inline'`으로 Tailwind/Next 인라인 스타일 허용.
- 결론: 정적 확인상 차단되는 기능 없음. 단 실제 브라우저/e2e 검증은 R-1 참고.

## 요구사항 수용 기준 충족 (코드 기준)

- F1 스키마/마이그레이션(`0003_purple_blur.sql`, unique 위반 409 변환 `blog-admin-service.ts`), F2/F3 이관 스크립트(dry-run 기본, 멱등, 이미지 매핑), F4 목록(20개, `?page=`, "총 N개 중 a-b번째", 카테고리 필터, 빈 상태), F5 상세(sanitize, h2 강등, 외부 링크 `noopener noreferrer`, 404 처리, 코드 강조), F6 talks 이동(navbar `/blog`·`/talks` 분리, `isActive`가 `/blog/*` 하위 활성화, 코드에 남은 talks용 `/blog` 참조 없음), F7 admin(목록/생성/수정/삭제, 모든 쓰기 경로에서 `revalidatePath("/", "layout")` 호출로 생성·수정·삭제 대칭), F8 에디터(커서 위치 삽입 `insertImageMarkdown`, 업로드 중 저장 비활성, .md import 확인 창과 검증)가 충족됨.
- 미충족 1건은 R-2(메타데이터 description).

## 주석 규칙, 죽은 코드, 과설계

- 신규/수정 주석에서 em-dash 0건, 사이클 한정 식별자(F-n, SEC-nn, N-n, T0n, 리뷰 파일명) 인용 0건을 diff grep으로 확인함.
- `next.config.ts` 주석은 명사형·비종결(`허용함`, `제외함`, `추가함`)이고 한 줄 한 항목 규칙 준수.
- `pnpm knip` 통과로 미사용 export/의존성 없음. 서버 전용 모듈의 `server-only`, 파일명 kebab-case, `HttpStatusCode` 사용 준수.
- `buildCsp` 함수화는 공개/admin 두 규칙의 중복 제거에 필요한 최소 추상이며 과설계 아님.

## 새 finding

### R-1. CSP 적용 후 e2e/브라우저 검증 공백 (Low, 사이클 diff 안, 검증 공백)

- 위치: `next.config.ts:5-22`, `summary.md`의 e2e 50개 통과 기록은 81a9553 이전
- 근거: e2e는 `pnpm start`(운영 빌드)를 쓰며 CSP 커밋 이후 재실행하지 않음. 정적 검토로는 차단 항목이 없으나 모든 공개 경로에 새 정책이 걸린 변경이라 실제 위반 로그 확인이 없음
- 영향: 인라인 스크립트/스타일, 분석, OAuth 중 놓친 항목이 있으면 운영에서 조용히 깨질 수 있음(가능성 낮음)
- 수정 제안: T09에서 `pnpm test:e2e:local` 재실행과 홈, `/blog`, `/blog/{slug}`, admin 로그인·업로드 화면의 콘솔에서 CSP 위반(`Refused to ...`) 0건 확인

### R-2. 블로그 목록/상세 메타데이터에 description 없음 (Low, 사이클 diff 안)

- 위치: `src/app/(public)/blog/page.tsx:14-17`, `src/app/(public)/blog/[slug]/page.tsx:22-31`
- 근거: requirements F4-5/F5-9는 페이지별 title/description 설정을 요구하나 둘 다 title과 canonical만 설정함. 루트 layout의 `profile.description`이 상속되므로 빈 값은 아님
- 영향: 글별 검색 결과/공유 미리보기 설명이 사이트 공통 문구가 됨. 동작 오류 아님
- 수정 제안: 상세는 본문 앞부분(마크다운 제거 없이 순수 텍스트 일부) 또는 카테고리 기반 한 줄을 `description`으로 추가. 목록은 고정 문구 한 줄. 필수 아님, 처리 여부는 orchestrator 결정

### R-3. summary.md 상태가 최신이 아님 (Low, 사이클 diff 밖, 문서)

- 위치: `artifacts/task-team/2026-10-14-blog/summary.md:5`, 다음 단계 1번
- 근거: 상태가 hold이고 SEC-01/02 재작업 대기, nonce CSP 적용 지시가 남아 있으나 실제로는 81a9553으로 해결됐고 정책은 `unsafe-inline` 기반임. CodeRabbit도 같은 지적
- 영향: 재개하는 운영자가 완료된 재작업을 반복하거나 nonce 정책으로 오해할 수 있음
- 수정 제안: 사이클 종료 시 orchestrator가 상태, T08 행, 다음 단계를 현재 상태로 갱신

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --committed --base-commit ac2e26b`. 무료 CLI 한도로 실행되어 완료, finding 2건.
- 타당 판정(2건 중 2건 타당, 모두 문서 대상이며 코드 영향 없음)
  - `artifacts/.../summary.md:5` · 상태·다음 단계가 SEC-01/02 해결과 CSP 방식을 반영하지 않음 · Low · 자체 R-3과 중복.
  - `artifacts/.../security-review-2.md:54` · INFO-1이 `connect-src 'self'`를 "외부 전송 차단"으로 서술하나 `img-src https:`로 이미지 요청을 통한 전송은 막지 못함 · Low(문서 표현) · 자체 발견에는 없음. 같은 문서 INFO-2가 `img-src https:`를 이미 언급해 실질 판단은 바뀌지 않으며 사용자 결정 범위 내. 보안 리뷰 산출물이라 수정은 security-reviewer 소관이고 표현을 "연결 API 제한"으로 고치면 됨.
- 기각 항목: 없음. 코드(`src/`, `scripts/`, `next.config.ts`)에 대한 지적은 0건.

## 최종 판정

- **통과**: Critical/High/Medium 없음. 이전 finding 재발 없음, 6f5e0b7 확인 완료, CSP 정적 검토상 앱 기능 차단 없음.
- Low 3건(R-1 검증 공백, R-2 description, R-3 문서)은 orchestrator 재검토 게이트에서 처리 여부 결정. R-1은 T09 QA에 포함 권장.
- 남은 이관 항목: F-1 단위 테스트와 `The destination stream closed early` 로그 대조는 T09.
