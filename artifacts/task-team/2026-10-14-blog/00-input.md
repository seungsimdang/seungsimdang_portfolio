# 00-input: Jekyll 블로그 DB 이관과 블로그 기능

- work-id: `2026-10-14-blog`
- 브랜치: `feature/blog` (기준 `origin/develop` ac2e26b)
- 작성: orchestrator (T01 intake, 분석·해석 없음)

## 사용자 요청 원문

1. "/Users/leeseunghyun/Documents/GitHub/seungsimdang.github.io/_posts 에 있는 내용들을 db화하고싶어." (방식 판단 보고 후 기존 DB 이관 + 포트폴리오 내 별도 탭으로 결정)
2. "블로그를 /blog에 두고 talks를 다른 경로로 옮겨"
3. "확인 후 블로그 저장소의 _images(18MB)를 Vercel Blob에 올리고 본문 URL을 바꿔 넣어"
4. slug: "따로 만들어 그럼" → 선택지 제시 후 "best practice대로 진행해"
5. 기존 GitHub Pages 블로그: "유지할거임"
6. "admin 페이지에도 블로그 탭을 추가하여 기존 다른 탭들처럼 포스트 추가(직접 마크다운 에디터에 입력하는 방식, md 파일을 import하는 방식 지원하도록), 수정, 삭제 등을 가능하도록 하고싶어"

## 확정 사항 (대화에서 사용자 결정 또는 orchestrator 기본값으로 고지됨)

- 데이터 소스: 기존 Neon + Drizzle DB에 `posts` 계열 테이블 추가 (사용자 확정).
- 경로: 블로그 `/blog`, talks는 `/talks`로 이동. navbar·footer 링크 갱신. 예전 `/blog`(talks) 주소 리다이렉트 없음 (orchestrator 기본값 고지, 이의 없음).
- slug: 블로그 글만 한글 허용, 날짜 접두사 포함 (예: `2024-10-06-7339-2xn-타일링-3`). 근거는 Google Search Central URL 구조 가이드("audience's language", 비ASCII는 퍼센트 인코딩). 기존 projects/talks의 영문 slug 규칙(`^[a-z0-9]+(-[a-z0-9]+)*$`)은 유지. admin 신규 글은 slug 직접 입력.
- 이미지: 기존 링크 유효성 확인 후 블로그 저장소 `_images`를 Vercel Blob에 업로드하고 본문 URL 치환.
- 기존 GitHub Pages 블로그(`seungsimdang.github.io`)는 유지. 원본 저장소는 수정하지 않음.
- 마크다운 렌더링: remark/rehype 파이프라인 + `rehype-sanitize` (Next.js 공식 MDX 가이드 근거).

## 원본 데이터 사실 (조사 결과)

- `_posts` 297개, 1.4MB. 대부분 CodeUp·알고리즘·강의 정리. 원본 저장소 마지막 커밋 2024-11-26.
- frontmatter: `title`, `categories`, `tags`, `toc`, `toc_sticky`, `toc_label`, 일부 `published`. Liquid 태그(`{% %}`) 사용 파일 0개.
- 파일명 `YYYY-MM-DD-제목.md`. 날짜 없는 파일 1개(`how-to-write-by-markdown.md`).
- 161개 파일명에 한글 포함. 날짜를 떼면 이름이 겹치는 글 다수(예: `ComputerArchitecture-컴퓨터의 구성`) → 날짜 접두사 필수.
- 파일명에 공백·마침표·`&` 포함 사례 있음 (예: `7339. 2xn 타일링 3`, `패리티 비트 & 해밍 코드`).
- 이미지 마크다운 참조 133건, 대부분 `https://github.com/222SeungHyun/222SeungHyun.github.io/blob/master/_images/...` (예전 저장소 이름, `?raw=true` 유무 혼재). `_images` 18MB, 파일명 한글·공백 포함.
- 이미지 링크 확인 결과 (2026-10-14, 마크다운 `![]()`와 `<img src>` 합산 고유 URL 138개):
  - 자기 저장소 링크 128개 (`222SeungHyun/222SeungHyun.github.io` 예전 이름, `seungsimdang/seungsimdang.github.io`, `raw.githubusercontent.com` 혼재). 예전 이름 링크는 GitHub 리다이렉트로 현재 200 응답.
  - 이 중 124개는 로컬 `_images`·`assets`에 파일 존재. 4개는 현재 트리에 없음: `KakaoTalk_20230104_012206888.jpg`·`_01.jpg`·`_02.jpg`(017b3029에서 추가, d23df7dd에서 삭제), `행렬 곱셈.png`(d737612f·b9aba5bc 이력 존재). git 이력에서 복원 가능.
  - 외부 링크 10개: 200 응답 6개(tistory, namu.wiki, user-images.githubusercontent.com, github.com `/assets/` 3개), 404 2개(`private-user-images.githubusercontent.com` 만료 JWT 링크), 403 1개(camo 프록시), 예시 문법 `/path/to/img.jpg` 1개(`how-to-write-by-markdown.md` 본문 예시라 이미지 아님).
- 현재 `src/app/(public)/blog/page.tsx`는 talks 목록(`listTechTalks`). navbar(`src/components/layout/navbar.tsx:21`), footer(`src/components/layout/footer.tsx:24`)가 `/blog`를 talks로 링크.
- 마크다운 렌더링 관련 의존성 현재 없음.

## Bug Team 피드백 반영 필수

출처: `artifacts/bug-team/2026-10-13-admin-save-feedback/postmortem.md` (develop 기준 미반영 확인)

- admin 블로그 폼의 저장 결과 피드백은 행동 버튼과 같은 영역에 보여야 함. `FormStatus`를 쓰면 `FormActionBar`에 `notice`를 전달함. design-spec에 "결과 피드백 위치" 항목을 두고, code-review에서 확인 결과를 남김.
- 같은 포스트모텀의 하네스 변경(designer.md·code-reviewer.md)과 lint 테스트 추가는 별도 브랜치(`feature/admin-form-feedback-guard`) 대상이라 이번 사이클 범위 밖. 포스트모텀 파일은 미반영 항목이 남아 있어 삭제하지 않음.

## 모호한 항목 (T02에서 확정 필요)

- 공개 블로그 목록 UI: 카테고리·태그 필터, 페이지네이션 여부와 방식 (297개).
- `toc` frontmatter 처리 (목차 렌더링 여부).
- `published: false` 글과 admin 초안 상태 필요 여부.
- 날짜 없는 파일의 날짜 결정 방법.
- 이미지 alt가 대부분 `image`인 점의 처리.
- 코드 블록 문법 강조 필요 여부.
- .md import 시 slug 충돌 처리(덮어쓰기/거부).
- 이관 스크립트 재실행 시 멱등성(이미 들어간 글 처리).

## 승인 지점

- T02 완료 후 요구사항 사용자 확인 게이트.
- 이관 스크립트의 운영 DB 실행과 Vercel Blob 업로드는 실행 전 사용자 확인.
- 커밋·병합은 사용자 지시 후 git-commit Skill로 진행.
