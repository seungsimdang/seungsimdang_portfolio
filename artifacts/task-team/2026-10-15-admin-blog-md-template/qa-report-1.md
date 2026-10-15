# QA 리포트 1차 (admin 블로그 .md 템플릿 다운로드)

판정: 조건부 통과. 자동화 가능한 항목은 모두 통과, 프로덕션 빌드 CSP 아래 blob 다운로드는 미검증.

## 작성한 테스트

- `__tests__/utils/blog-post-template.test.ts` (vitest, 8건). `buildPostTemplate`, `POST_TEMPLATE_FILE_NAME`, `parsePostMarkdown`, `parsePostFileName`, `slugifyPostName`, `toValueItems`, `todayInSeoul`, `postCreateFormSchema`를 모두 실제 소스에서 import해 호출한다.
- `tests/e2e/admin-blog-template.spec.ts` (Playwright, 3건). 관리자 인증 환경 변수가 없으면 skip되는 기존 `admin-tabs.spec.ts` 관례를 따른다.

참고: blog-form의 `applyImport`는 컴포넌트 내부 함수라 import할 수 없다. 폼 값 구성은 같은 모양으로 단위 테스트에서 재구성하고, 실제 `applyImport`는 E2E(가져오기 후 제목 반영)로 검증했다.

## 수용 기준별 결과

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| 템플릿 파싱 시 error·unpublished 없음 | 통과 | vitest |
| title/date/categories/tags 값 | 통과 | vitest |
| 본문에 `#` 안내 줄 없음 | 통과 | vitest |
| 프론트매터 구간에 펜스 외 `---` 없음 | 통과 | vitest |
| BOM 없음, LF, 끝 개행 1개 | 통과 | vitest |
| 파일명이 날짜 접두로 인식되지 않음 | 통과 | vitest |
| 가져온 값이 `postCreateFormSchema` 통과 | 통과 | vitest (applyImport 모양 재구성) |
| 템플릿 다운로드 클릭 시 `blog-post-template.md` 저장, 내용이 템플릿과 동일 | 통과 | E2E, dev 서버 |
| 다운로드 후 폼 값 유지 | 통과 | E2E |
| 받은 파일을 파일 선택으로 가져오면 폼 채워짐(덮어쓰기 확인 후 제목 반영, 선택한 파일명 표시) | 통과 | E2E |
| 767px, 768px 가로 스크롤 없음, 버튼 레이블 한 줄 | 통과 | E2E |
| 프로덕션 빌드 CSP 아래 blob 다운로드 | 미검증 | 아래 사유 |
| 편집 화면에 버튼 미노출 | 미검증 | 편집 화면은 DB 글이 필요해 E2E 대상 제외, 코드상 `!isEdit` 블록 안임 |

## 실행 명령과 결과

- `pnpm type-check`: 통과 (오류 없음)
- `pnpm exec vitest run`: 33 파일, 431 테스트 통과
- `pnpm check`: 192 파일, 수정 사항 없음
- `pnpm knip`: 출력 없음, 통과
- `pnpm harness:test`: 7 파일, 47 테스트 통과
- E2E: 임시 설정(포트 3199, headless Chromium, 설정 파일은 실행 후 삭제)으로 `next dev` 서버에서 실행, 3건 통과. 자신이 띄운 3199 포트만 `kill $(lsof -ti tcp:3199)`로 종료함.

## 미검증과 사유

- 프로덕션 빌드 기준 E2E: 이 worktree에 `.env.local`(E2E_DATABASE_URL)이 없고 `next build`가 실 DB 조회(`/work/[id]` 데이터 수집)를 요구해 빌드 실패 확인. 메인 체크아웃의 환경 파일은 읽지 않음. 따라서 E2E는 더미 `NEXTAUTH_SECRET`/숫자 `ADMIN_GITHUB_ID`와 `next dev`로 실행했고 CSP 헤더 환경은 재현하지 못했다. 프로덕션 CSP 아래 blob 다운로드(`<a download>` + `blob:` URL)는 사용자가 `pnpm test:e2e:local` 또는 배포 Preview에서 확인해야 한다.
- 실제 로그인 세션(GitHub OAuth)이 아닌 JWT 쿠키 주입 방식으로 인증함.
- Safari/Firefox, 실제 모바일 기기 다운로드 동작.

## 부수 확인

- `next dev` 실행이 worktree의 `AGENTS.md`를 자동 수정해, 해당 파일만 `git checkout -- AGENTS.md`로 되돌림. 현재 변경은 신규 테스트 2개 파일뿐(미커밋).

## 사용자 수동 확인 필요

1. 프로덕션(또는 Preview) `/admin/blog/new`에서 "템플릿 다운로드"로 파일이 실제로 저장되는지 (CSP 영향).
2. Safari, 모바일 브라우저에서 다운로드 동작과 파일명.
3. 템플릿의 예시 카테고리/태그 문구와 안내 주석 문구 최종 승인.
4. 편집 화면(`/admin/blog/{id}`)에 템플릿 버튼이 없는지 육안 확인.
