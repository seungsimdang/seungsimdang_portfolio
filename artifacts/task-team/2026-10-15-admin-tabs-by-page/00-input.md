# 00-input: admin 탭을 공개 Navbar 기준으로 재구성

- 작업 브랜치: `feature/admin-tabs-by-page` (develop `c6c53b0`에서 분기)
- 작성: orchestrator (T01 intake, 분석 없음)

## 사용자 요청 원문 (2026-10-15 대화에서 승인된 범위)

1. "about 페이지 섹션 home 탭에서 삭제해" - 홈(`/`)의 `.about` 섹션 삭제. 사용처가 없어지는 `src/components/common/about-section.tsx`도 삭제 승인.
2. admin 탭 구성을 공개 Navbar와 1:1로 맞춤: **home · projects · about · blog · talks · contact**. resume·profile 탭은 없앰.
   - home 탭: name·title·tagline·description
   - about 탭: 이력(resume) 항목 + skills·tools
   - contact 탭: email·github
   - resume 탭의 "스킬과 툴은 profile에서 편집합니다." 안내 문구 삭제
   - 사용자 발언: "1:1 대응시키면 뭐 문제가 있음? 왜 쓸데없이 자꾸 다른 탭을 만드는거임?"
3. profile 저장 API를 부분 저장으로 변경: "저장 방식: 부분 저장 API(권장)로 가."
   - 확인한 현재 상태: `src/app/api/admin/profile/route.ts` PUT이 `profileInputSchema`(`src/schemas/portfolio.schema.ts:124`, `z.strictObject`, 8개 항목 모두 필수)로 검사하고 `updateProfile`(`src/services/portfolio/portfolio-admin-service.ts:121`)이 받은 값으로 갱신.
4. 로그아웃 버튼을 탭과 분리 (현재 `admin-console-shell.tsx`에서 `.admin-header-navigation` 안에 탭과 같은 모양으로 있음).
5. 로그아웃 후 이동 경로를 `/admin/login`에서 home(`/`)으로 변경 (`src/components/admin/sign-out-button.tsx`).
6. (마지막 순서) admin 로그인 화면 리디자인: "로그인 화면 ui가 이게 맞냐? best practice 웹 서치 후 리디자인해." 로그인 화면에 home으로 가는 링크 포함 권장(사용자 승인한 보고 내용).

## 모호한 항목

- 기존 `/admin/resume`, `/admin/profile` URL 처리(삭제 vs 새 경로로 리다이렉트), 하위 경로 `/admin/resume/new`, `/admin/resume/[id]` 이동 경로.
- `/admin` 기본 이동 대상(현재 `/admin/projects`)과 헤더 이름 링크 대상 유지 여부.
- home 탭에 홈 화면의 projects·talks 목록 편집을 넣지 않음(각 탭에서 편집) - 대화에서 설명함, 요구사항에서 확정 필요.
- 부분 저장 시 빈 객체 요청 처리, 다른 탭에서 동시에 저장할 때의 동작.
- 로그아웃 버튼 분리 시각 형태(대화 제안: 탭 묶음 오른쪽 끝, 세로 구분선, 테두리 버튼).
- 로그인 화면 리디자인의 구체 형태는 웹 서치 근거로 결정.

## 승인 지점

- T02 요구사항 완료 후 사용자 확인 게이트.
- 커밋·develop 병합은 사용자 지시 후.

## 보존 제약

- 기존 Framer 디자인·브레이크포인트·애니메이션, 공개 Navbar 높이(77px)와 admin 헤더 정렬 유지.
- 주석 규칙(명사형 종결, em-dash 금지), kebab-case 파일명, `HttpStatusCode` 사용.

## 추가 요청 (2026-10-15, 같은 사이클)

7. 모든 admin 폼(blog, project, talk, resume-entry, profile)을 react-hook-form으로 마이그레이션. "오히려 늘어나는 항목에 대해서는 rhf 호환되도록 근본적 구조 최적화 후 작업해. 의존성 문제는 context7 공식 문서 읽고 버전 확인 후 작업해. 이번 사이클에서 모든 폼에 대해서 작업해."
   - 의존성(orchestrator 확인): `react-hook-form@7.89.0`(peer react ^19 포함, 7.90.0은 2026-10-11 배포로 `minimumReleaseAge: 10080` 미충족), `@hookform/resolvers@5.9.1`(peer zod ^4, react-hook-form ^7.55.0). context7 `/react-hook-form/resolvers`: zod 4는 `zod` 그대로 import, transform 시 `useForm<input, unknown, output>` 3제네릭.
8. 재리뷰 결과 수정: T07-2 M1(보조 키 클릭 로그아웃) 반영 완료, L2(부분 저장 스키마 테스트)는 T09.
