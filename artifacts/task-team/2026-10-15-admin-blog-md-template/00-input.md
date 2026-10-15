# 00-input: admin 블로그 새 글 .md 템플릿 다운로드

- work-id: `2026-10-15-admin-blog-md-template`
- 브랜치: `feature/admin-blog-md-template` (기준 `develop` ced4e6f)
- 작업 위치: `/private/tmp/portfolio-blog-md-template` (메인 체크아웃을 다른 세션 `seungsimdang-portfolio-c6`이 미커밋 변경과 함께 사용 중이라 분리)

## 사용자 요청 원문

> admin -> blog -> 새글 추가 시 md 템플릿 다운받아 작성 수 있도록 개선해줘.

## 구조화

- 대상 화면: `/admin/blog/new` (`src/app/admin/(console)/blog/new/page.tsx`, `src/components/admin/blog-form.tsx`)
- 기대 결과: 새 글 화면에서 .md 템플릿 파일을 내려받아 로컬에서 작성한 뒤 기존 ".md 가져오기"로 불러올 수 있음
- 현재 상태: 새 글 화면에 ".md 가져오기(파일 선택)"만 있음. 가져오기 파서는 `src/lib/blog/frontmatter.ts`의 `parsePostMarkdown`(title, categories, tags, date, published 인식). 파일명 `YYYY-MM-DD-제목.md`이면 날짜·slug를 파일명에서 제안(`src/lib/blog/slug.ts`).

## 모호한 항목

1. 템플릿에 들어갈 frontmatter 키 범위 (title·date·categories·tags만인지, published 포함 여부 - 공개 여부 기능은 직전 사이클에서 삭제됨)
2. 내려받는 파일명 (고정 이름 vs 오늘 날짜 접두 `YYYY-MM-DD-제목.md` 형식 안내)
3. 템플릿 본문 내용 (빈 본문, 작성 가이드 주석, 마크다운 문법 예시 중 무엇)
4. 템플릿을 정적 상수로 둘지, admin에서 편집 가능하게 DB에 둘지 (메모리 규칙: 데이터 소스 결정은 구현 전 사용자 확인)
5. 생성 방식 (클라이언트 Blob 다운로드 vs `public/` 정적 파일 vs API 라우트)
6. 편집 화면(`/admin/blog/[slug]`)에도 노출할지

## 승인 지점

- T02 requirements 완료 후 사용자 확인 게이트
- 위 모호한 항목 4(데이터 소스)는 T02 게이트에서 함께 확정

## Bug Team 피드백 반영 필수

- 현재 `artifacts/bug-team/postmortem-*.md` 2건에 "Task Team 피드백 초안" 섹션 없음. 반응형 관련 재발 방지 항목(`postmortem-20261015145447.md`: 모바일 flex 줄바꿈 확인, 767/768px 경계 양쪽 검증)은 새 버튼 배치 시 참고. 포스트모텀 파일은 다른 세션 작업과 연관될 수 있어 이번 사이클에서 삭제하지 않음.
