# 00-input: 블로그 포스트 검색

## 사용자 요청 원문

> 블로그 포스트들 검색 기능을 추가해줘

## 작업 브랜치

- `feature/blog-search` (`develop` 288f7a5에서 분기)

## 현재 상태 (사실 확인)

- 공개 블로그 목록: `src/app/(public)/blog/page.tsx`. `searchParams`의 `page`, `category`로 서버 렌더링하며 `CategoryTabs`, `Pagination`, `PostRow` 사용.
- 데이터 접근: `src/services/blog/blog-service.ts`의 `listPosts(page, pageSize, category)`, `listCategories()`.
- 관리자 블로그 탭(`src/app/admin/(console)/blog`)도 존재함.

## 모호한 항목 (T02에서 확정 필요)

1. 검색 위치: 공개 `/blog` 목록만인지, 관리자 블로그 목록도 포함인지.
2. 검색 대상 필드: 제목만 / 제목+요약 / 본문(markdown)까지.
3. 카테고리 필터·페이지네이션과의 결합 방식 (동시 적용 여부, 검색 시 page 초기화).
4. 검색 방식: URL 쿼리(`?q=`) 기반 서버 검색인지, 클라이언트 즉시 필터인지. 입력 중 자동 검색(debounce) 또는 제출형.
5. 대소문자·공백 처리, 최소/최대 길이, 결과 없음 문구.

## 승인 지점

- T02 `requirements.md` 완료 후 사용자 확인 게이트 (필수).

## Bug Team 피드백 반영 필수

- `artifacts/bug-team/postmortem-*.md` 2건 확인. 두 파일 모두 "Task Team 피드백 초안" 섹션이 없어 반영할 항목 없음.
