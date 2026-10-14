# requirements: Jekyll 블로그 DB 이관과 블로그 기능

- 작성일: 2026-10-14
- 작성자: Project Manager (T02)
- 상태: **사용자 승인됨 (T02 게이트 통과)**. 승인 시 사용자 결정 2건 반영(admin 본문 이미지 업로드 포함, 정상 외부 이미지 6개 URL 유지).
- 입력: `00-input.md`, 기준 커밋 `ac2e26b` (develop)
- 브랜치: `feature/blog` (`develop`에서 분기, `docs/agent-rules/branch-strategy.md`)
- 참고한 현재 코드: `src/db/schema/portfolio.ts`, `src/app/(public)/blog/page.tsx`, `src/app/admin/(console)/talks/page.tsx`, `src/components/admin/*`, `src/app/api/admin/uploads/thumbnail/route.ts`

## 목차

- [1. 목적과 현재 상태](#1-목적과-현재-상태)
- [2. 확정 사항과 모호 항목 결정](#2-확정-사항과-모호-항목-결정)
- [3. 기능 분해와 수용 기준](#3-기능-분해와-수용-기준)
- [4. 비기능 요구사항](#4-비기능-요구사항)
- [5. 배포와 운영 데이터](#5-배포와-운영-데이터)
- [6. Bug Team 피드백 반영](#6-bug-team-피드백-반영)
- [7. 사용자 확인 필요](#7-사용자-확인-필요)
- [8. 범위 밖](#8-범위-밖)

## 1. 목적과 현재 상태

- 목적: `seungsimdang.github.io/_posts`의 글 297개를 포트폴리오 DB로 옮겨 `/blog`에서 공개하고, 소유자 1명이 admin에서 글을 추가(에디터 입력, .md import, 본문 이미지 업로드)/수정/삭제한다.
- 현재: `/blog`는 talks 목록(`listTechTalks`)이다. navbar(`navbar.tsx:21`), footer(`footer.tsx:24`)가 `/blog`를 talks로 링크한다. 마크다운 렌더링 의존성은 없다.
- admin에는 이미 `talks` 탭이 있고(`/admin/talks`), 공개 talks는 `/blog`에 있다. 이번에 공개 talks를 `/talks`로 옮긴다(admin 경로는 그대로).
- 썸네일 업로드(`/api/admin/uploads/thumbnail`)가 Vercel Blob(`put`, `del`)을 이미 쓴다(PNG/JPG/WebP, 4MB, 시그니처 검사). 같은 Blob 스토어/토큰을 재사용한다.
- 원본 GitHub Pages 블로그는 유지하고 원본 저장소는 수정하지 않는다.

## 2. 확정 사항과 모호 항목 결정

00-input.md "확정 사항"은 그대로 따른다. 아래는 "모호한 항목"의 결정이다.

| 항목 | 결정(기본값) | 근거 |
| --- | --- | --- |
| 목록 페이지네이션 | URL 쿼리 `?page=N`, 페이지당 20개, 날짜 내림차순. 서버 렌더링 | 297개를 한 화면에 두면 무겁다. 쿼리 방식은 JS 없이 동작하고 공유 가능 |
| 카테고리 필터 | 단일 카테고리 필터 `?category=` 1개 지원(P1). 태그는 표시만 하고 필터는 두지 않음 | 요청에 검색/필터 언급이 없어 최소로 유지 |
| `toc` frontmatter | 이관하지 않고 목차도 렌더링하지 않음. `toc_sticky`, `toc_label`도 버림 | Jekyll 테마 전용 설정. 요청에 목차 없음 |
| `published: false`, 초안 | `posts.published boolean not null default true` 추가. false 글은 공개 목록/상세에서 제외, admin에서는 보이고 토글 가능 | 원본에 `published: false` 글이 실제로 있음 |
| 날짜 없는 파일(1개, `how-to-write-by-markdown.md`) | 원본 저장소 git 최초 커밋 날짜를 발행일과 slug 접두사로 사용 | 다른 글과 규칙 통일. git 이력은 읽기 전용 |
| 이미지 alt | alt가 비었거나 `image`면 `{글 제목} 이미지 {n}`(n은 글 내 순번)으로 치환. 의미 있는 alt는 유지 | 접근성. 가장 작은 규칙 |
| 코드 문법 강조 | 필요(P1). 언어 지정 펜스 코드 블록에 적용. 미지정/미지원은 일반 코드 블록 | 알고리즘 글이 대부분. 서버 렌더 단계 처리 권장 |
| .md import 시 slug 충돌 | 거부. 저장 시 409와 "이미 사용 중인 slug" 메시지, 덮어쓰기 없음 | 기존 글 덮어쓰기 위험 제거 |
| 이관 스크립트 멱등성 | slug 유일 키 기준. 이미 있는 slug는 건너뜀. 이미지는 결정적 경로로 올려 중복 업로드 없음 | admin 수정본을 재실행이 되돌리지 않아야 함 |
| 편집 시 slug | 생성 시에만 입력, 편집 화면에서는 읽기 전용 | 리다이렉트 인프라가 없어 slug 변경은 링크를 깨뜨림 |
| admin 목록 | 날짜 내림차순, 페이지당 50개, `?page=`. 수동 정렬 UI 없음 | 정렬 기준이 날짜 |
| admin 에디터 | textarea 입력 P0, 같은 렌더러를 쓰는 미리보기 P1 | 리치 에디터 라이브러리는 과설계 |
| **admin 본문 이미지 업로드** | **사용자 결정: 포함(P0)**. 기존 썸네일 업로드(Vercel Blob)를 재사용하고, 업로드 후 커서 위치에 `![alt](url)` 삽입. gif 허용(본문 이미지 한정) | F7/F8 참조 |
| **정상 응답 외부 이미지 6개** | **사용자 확정: URL 유지, Blob 미러링 안 함** | F3-6 근거 |
| 깨진 외부 이미지 3개 | 원본을 내려받아 Blob에 올리고 URL 치환으로 확정 | F3-5 |

## 3. 기능 분해와 수용 기준

우선순위: P0 = 이번 사이클 필수, P1 = 같은 사이클 권장, P2 = 후속.

### F1. posts DB 스키마와 마이그레이션 (P0)

- 필드: id(uuid), slug(유일), title, content(마크다운 원문), categories(text[]), tags(text[]), publishedAt(발행일, 정렬 기준), published(boolean), createdAt, updatedAt. 이관 출처 추적 컬럼은 두지 않는다(slug가 멱등 키).
- 수용 기준:
  1. drizzle 마이그레이션이 `drizzle/`에 생성되어 커밋된다. 기존 테이블은 변경 없음(추가만).
  2. slug 유일성은 **DB unique 제약**이 보장한다. 동시 생성 경쟁에서 unique 위반이 나면 서비스가 409로 변환한다(서버 선검사만으로 보장하지 않음).
  3. slug 형식 check 제약: 한글/영문 소문자/숫자와 하이픈만, 하이픈 연속/양끝 금지, 길이 상한(200자 이하 권장). 기존 projects/talks 영문 slug 규칙은 변경하지 않는다.
  4. 목록용 인덱스: `(published, published_at desc, id)` 정렬/필터 지원.
  5. 읽기는 `src/services/` 서버 전용(`import "server-only"`), 쓰기는 기존 `portfolio-admin-service` 패턴. 공개 페이지는 Route Handler를 거치지 않고 서비스를 직접 호출.
- Edge case: 한글 slug는 경로 파라미터가 퍼센트 인코딩 상태로 들어온다. 디코딩 후 조회하며, 디코딩 실패는 404.

### F2. 이관 스크립트 (P0)

- 위치: `scripts/` 아래 단일 실행 스크립트(파일명은 개발자 결정). 원본은 읽기 전용.
- 처리:
  - frontmatter 파싱(`title`, `categories`, `tags`, `published`), 파일명에서 날짜/제목 추출, `toc*` 버림.
  - slug 생성: `YYYY-MM-DD-제목`. 공백은 하이픈, 마침표/`&` 등은 제거 또는 하이픈, ASCII 대문자는 소문자. 예: `2024-10-06-7339. 2xn 타일링 3` -> `2024-10-06-7339-2xn-타일링-3`.
  - 정규화 후 충돌하면 파일명 정렬 순으로 `-2`, `-3` 접미사(결정적).
  - 본문 이미지 URL을 F3 매핑으로 치환하고 alt 규칙 적용.
- 수용 기준:
  1. **기본 동작은 dry-run**: DB/Blob에 쓰지 않고 파일별 slug, 건너뜀/삽입 예정, 이미지 치환 건수, 경고를 출력한다. 쓰기는 명시적 플래그(예: `--apply`)일 때만.
  2. **멱등**: 같은 입력으로 `--apply`를 두 번 실행하면 두 번째는 삽입 0건이고 기존 행을 수정하지 않는다. 테스트로 보장한다.
  3. **운영 DB 실행과 Blob 업로드는 사용자 승인 후에만** 한다. 승인 전에는 dry-run과 로컬/개발 DB 검증까지만. 실행은 orchestrator가 승인을 받은 뒤 수행한다.
  4. 처리 결과 요약(삽입/건너뜀/실패/경고 수)과 실패 파일 목록을 출력한다. 한 파일 실패가 전체를 중단시키지 않되, 실패가 있으면 종료 코드가 0이 아니다.
  5. 환경변수: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, 원본 저장소 경로(인자 또는 상수). 누락 시 실행 전에 명확한 오류로 종료.
  6. 날짜 없는 파일 1개는 2절 규칙으로 처리되고 요약에 표시된다.
  7. 건수 검증: `_posts` 파일 수(297)와 (삽입 + 이미 존재 + 의도적 제외)가 일치함을 출력.
- Edge case: frontmatter 깨짐, `categories` 문자열/배열 혼재, `published: false`(그대로 published=false), 파일명에 공백/`&`/마침표, 빈 본문, 한글 NFC/NFD 차이(slug는 NFC), 동일 날짜 동일 제목.

### F3. 이미지 Vercel Blob 이관과 URL 치환 (P0)

- 대상: `_images`(약 18MB)와 본문이 참조하는 자기 저장소 이미지 128개, 복원 대상 4개, 깨진 외부 이미지 3개.
- 수용 기준:
  1. 모든 형태의 자기 저장소 URL(`222SeungHyun/222SeungHyun.github.io`, `seungsimdang/seungsimdang.github.io`, `raw.githubusercontent.com`, `blob/`, `raw/`, `?raw=true` 유무)이 로컬 파일 경로로 매핑되어 Blob URL로 치환된다. 퍼센트 인코딩/공백/한글 파일명 차이를 흡수한다.
  2. Blob 경로는 파일명 기반 결정적 경로(랜덤 접미사 없음, 예: `blog/images/...`)로 올려 재실행해도 중복 객체가 없다. 한글/공백 파일명은 안전한 경로로 변환하되 원본 파일명 매핑을 보고서에 남긴다.
  3. 치환 후 본문에 `github.com/.../_images`, `raw.githubusercontent.com` 자기 저장소 참조가 0건이다(스크립트가 검증 출력).
  4. **로컬에 없는 4개 복원**: `KakaoTalk_20230104_012206888.jpg`, `..._01.jpg`, `..._02.jpg`(017b3029에서 추가, d23df7dd에서 삭제), `행렬 곱셈.png`(d737612f·b9aba5bc 이력 존재)를 원본 저장소 git 이력(`git show <commit>:<path>`, 읽기 전용)에서 꺼내 같은 규칙으로 업로드하고 치환한다. 실패하면 경고로 남기고 원본 URL을 유지한다. 원본 저장소는 수정하지 않는다.
  5. **깨진 외부 링크 3개는 원본을 내려받아 Blob에 올리고 URL 치환으로 확정**(원본 복구 가능 확인됨, 2026-10-14). 다운로드 후 이미지 형식(content-type 또는 시그니처)을 확인한 뒤 올린다.

     | 글 | 깨진 URL | 복구 원본 |
     | --- | --- | --- |
     | `2023-12-17-Front-End-미니프로젝트 리팩토링 회고` | `private-user-images.githubusercontent.com` (404, JWT 만료) | `https://github.com/user-attachments/assets/ad847c87-947f-4b9b-a9c7-e37f1a2a254d` (200, image/gif, 741KB) |
     | `2024-01-31-Front-End-파이널프로젝트 회고` | `private-user-images.githubusercontent.com` (404) | `https://github.com/user-attachments/assets/a79617e9-4e90-4b17-939e-dbc45eef2fd6` (200, image/png, 44KB) |
     | `2023-01-09-ComputerArchitecture-고정 소수점 & 부동 소수점` | camo 프록시 (403) | camo URL hex 디코딩 원본 `http://tcpschool.com/lectures/img_c_floating_point_32.png` (200, image/png, 7.6KB) |

     - tcpschool 이미지는 외부 자료이므로 **출처 표기를 유지**한다. 기존 글에 출처 표기가 있으면 그대로 두고, 없으면 이미지 바로 아래에 출처(tcpschool.com) 한 줄을 넣는다. 출처 도메인과 원본 URL이 드러나야 한다.
     - 다운로드가 실패하면(200 아님 또는 이미지 아님) 해당 참조는 URL을 바꾸지 않고 경고로 남기며 종료 코드에 반영한다(조용한 누락 금지). 대체 문구 삽입이나 이미지 삭제는 하지 않는다.
     - 다운로드 대상은 이 3개의 지정된 원본으로 제한한다(임의 외부 URL 자동 다운로드 금지).
  6. **응답 200인 외부 6개**(tistory, namu.wiki, user-images.githubusercontent.com, github.com `/assets/` 3개)는 **사용자 확정: URL 유지**. 근거: (a) 요청은 `_images` 이전이며 외부 이미지 이전은 요청에 없음, (b) 외부 자료(tistory, namu.wiki)는 재배포가 저작권/출처 문제를 만들 수 있음, (c) 현재 정상 응답이고 원본 블로그도 같은 링크를 쓰므로 회귀가 아님.
  7. `how-to-write-by-markdown.md`의 예시 `/path/to/img.jpg`는 이미지가 아니므로 치환/제거 대상에서 제외.
  8. 마크다운 `![]()`뿐 아니라 HTML `<img src>`도 매핑/치환 대상(합산 고유 URL 138개 기준). 코드 펜스/인라인 코드 내부의 이미지 문법 예시는 치환하지 않는다.
  9. 이관 스크립트에는 썸네일 4MB 제한을 적용하지 않는다. 파일 형식은 이미지 확장자(gif 포함)만 허용한다. 업로드 실패 파일은 재시도 가능하도록 멱등이어야 한다.
  10. 다운로드/업로드는 사용자 승인 후에만 실행(F2-3과 동일). dry-run에서는 네트워크 다운로드 없이 매핑과 대상 목록만 출력해도 된다.
- Edge case: 같은 이미지가 여러 글에서 참조됨(한 번만 업로드), 대소문자만 다른 파일명, 확장자 대소문자(`.PNG`), `?raw=true` 유무로 같은 파일이 다른 URL로 나타남, 참조는 있으나 파일과 이력 둘 다 없는 경우(경고), user-attachments URL이 만료된 경우(경고, 승인 직전 재확인), gif는 애니메이션이므로 변환/리사이즈 금지.

### F4. 공개 `/blog` 목록 (P0)

- 수용 기준:
  1. `/blog`는 published=true 글을 날짜 내림차순으로 20개씩 보여준다. 항목: 제목, 날짜, 카테고리(있으면). 클릭 시 `/blog/{slug}`로 이동.
  2. 페이지 이동은 `?page=N`. 범위를 벗어난 page(0, 음수, 비숫자, 마지막 초과)는 일관되고 안전한 동작(1페이지 또는 마지막 페이지)으로 처리하고 문서화한다.
  3. **부분 목록 표현**: "총 N개 중 a-b번째"처럼 전체 개수와의 관계를 보여준다. 글이 0개/필터 결과 0개면 빈 상태 문구.
  4. 카테고리 필터(P1): `?category=`로 필터링되고 해당 카테고리 총 개수 표시. 선택 해제 수단 제공. 존재하지 않는 카테고리는 빈 상태.
  5. 페이지 제목/메타데이터 설정, 기존 공개 페이지(about/contact) 레이아웃·디자인 토큰과 일관.
  6. 목록 읽기는 서비스 직접 호출. 쿼리 값은 서비스로 전달 전에 검증/정규화하고 파라미터화 쿼리로만 사용.
- Edge case: category 값에 한글/공백/특수문자, 여러 개 page 파라미터, 매우 긴 제목, 카테고리 없는 글.

### F5. 공개 `/blog/[slug]` 상세 (P0)

- 수용 기준:
  1. slug(퍼센트 인코딩 포함)로 조회해 제목, 발행일, 카테고리, 태그, 본문을 렌더링한다. 없는 slug, 디코딩 불가 slug, published=false 글은 404.
  2. GFM(표, 체크리스트, 취소선, 자동 링크) 지원, `rehype-sanitize`(allowlist)로 정화. 원문 `<script>`, 인라인 이벤트 핸들러, `javascript:` URL 제거.
  3. 본문 HTML `<img>`는 허용 속성(src, alt, width, height 등 최소 집합)만 통과. 외부 유지 이미지 중 `http:` 링크가 있으면 처리 방식(https 승격 또는 허용)을 구현 문서에 명시. 이미지 도메인 처리 방식은 개발자가 결정하되 `nextjs.md` 규칙 4(`<img>` 직접 사용 금지)와의 관계를 명시.
  4. 페이지의 `h1`은 글 제목 하나. 본문 `#` 제목은 한 단계 낮춰 h2로 렌더링한다.
  5. 외부 링크는 새 탭 + `rel="noopener noreferrer"`.
  6. 코드 문법 강조(P1): 언어 지정 코드 블록에 적용, 긴 줄은 가로 스크롤.
  7. 표와 이미지가 모바일 폭에서 넘치지 않는다. 이미지에는 의미 있는 alt가 있다.
  8. `/blog`로 돌아가는 링크 제공. 이전/다음 글, 관련 글은 만들지 않는다.
  9. 페이지별 title/description 메타데이터 설정.
- Edge case: 수백 KB 본문, 빈 본문, 깨진 마크다운, 닫히지 않은 코드 펜스(렌더 오류 없이 처리), 한글 slug 라운드트립, 이중 인코딩.

### F6. talks 경로 이동과 링크 갱신 (P0)

- 수용 기준:
  1. 현재 `/blog`의 talks 목록 화면이 `/talks`로 이동한다(내용 동일).
  2. navbar와 footer에 "Blog"(`/blog`)와 talks(`/talks`) 링크가 모두 있고 활성 상태 표시가 각각 올바르다. 라벨은 designer가 정한다.
  3. talks를 가리키는 `/blog` 참조를 전수 검색해 갱신한다(e2e, 단위 테스트, 홈 섹션 링크 등). 누락 없음을 grep 결과로 code-review에서 확인한다.
  4. 예전 `/blog`(talks) 주소 리다이렉트는 만들지 않는다(확정).
  5. admin `/admin/talks` 경로와 라벨은 변경하지 않는다.
- Edge case: navbar 활성화 로직이 `/blog/*` 하위에서도 Blog 항목을 활성화. `/talks`와 `/blog`가 접두사 중복 없이 구분.

### F7. admin 블로그 탭: 목록/수정/삭제/이미지 업로드 (P0)

- 기존 projects/talks 탭 패턴 재사용: `requireAdminPage()`, `AdminPageHeader`, `AdminButton`, `ConfirmDialog`, `useAdminForm`, `adminRequest`, `adminRoute`, `ok`/`fail`, Zod 스키마(`src/schemas/`).
- 수용 기준:
  1. `admin-nav.tsx`에 "블로그" 탭이 추가되고 `/admin/blog`에서 목록(제목, 발행일, 공개/비공개)이 날짜 내림차순, 페이지당 50개로 보인다. "총 N개 중 a-b번째"를 표시한다.
  2. "새 글" 진입점이 목록 상단에 있고, 각 행에서 편집으로 이동한다.
  3. 편집 폼 필드: slug(생성 시만 입력, 편집은 읽기 전용), 제목, 발행일, 카테고리, 태그, 공개 여부, 본문(마크다운 textarea). 필수/길이 상한은 Zod로 검증.
  4. 삭제는 `ConfirmDialog` 확인 후 수행하고 완료 시 목록으로 돌아가 "삭제했습니다." 메시지를 보인다.
  5. 저장/삭제 후 공개 `/blog`, `/blog/{slug}` 캐시가 갱신된다(기존 `revalidatePath` 방식).
  6. admin API: `src/app/api/admin/posts/route.ts`(생성)와 `src/app/api/admin/posts/[slug]/route.ts`(수정/삭제). 모두 `adminRoute`, HTTP 상태는 `HttpStatusCode` enum.
  7. 존재하지 않는 slug의 편집/수정/삭제는 404. slug 중복 생성은 409와 필드 오류 메시지. 한글 slug 경로의 인코딩/디코딩이 라운드트립으로 동작.
  8. 중복 제출은 저장 중 버튼 비활성(`useAdminForm`)으로 막고, 우회 시에도 DB unique 제약이 한 건만 생성함을 보장.
  9. 본문 크기 상한(예: 1MB 이하)을 서버에서 강제하고, 초과 시 413/검증 오류로 거부. 요청 본문 파싱 한도와 모순이 없어야 한다.
  10. **본문 이미지 업로드 API**: 기존 썸네일 업로드(`/api/admin/uploads/thumbnail`)의 검증(multipart 전용, 파일 1개, 빈 파일 거부, 확장자-시그니처-`file.type` 일치, Content-Length 상한, 실패 시 정리)을 재사용하는 admin 전용 업로드 엔드포인트를 둔다. `adminRoute`로 감싸 인증/Origin 검사를 받는다. 구체 구조(기존 라우트에서 공용 함수 추출 또는 별도 라우트)는 개발자가 정하되 썸네일 동작은 회귀하지 않는다.
      - 허용 형식: PNG, JPG, WebP는 썸네일과 동일. **GIF는 본문 이미지에 한해 허용**(원본 글에 애니메이션 gif가 있음, 시그니처 `GIF87a`/`GIF89a`로 검증). 썸네일 업로드의 허용 형식은 바꾸지 않는다(gif 불허 유지).
      - 크기 상한: 기존 썸네일과 같은 4MB(요청 본문 4.5MB 한도 포함). 초과 시 기존과 같은 PAYLOAD_TOO_LARGE 응답.
      - 저장 경로: Blob 공개 접근, `blog/images/` 하위, 랜덤 접미사로 충돌 방지(이관 스크립트의 결정적 경로와 구분). 응답은 `{ url }`.
      - 반환 URL은 허용된 Blob 호스트인지 검증하고, 아니면 삭제 후 오류(기존 `isValidThumbnail` 방식과 동등한 검증).
      - 클라이언트는 `src/lib/admin-client/`의 기존 업로드 호출 방식(`adminRequest` 등)을 재사용한다.
- Edge case: 두 탭에서 같은 글 동시 수정(마지막 저장 우선, 낙관적 잠금은 범위 밖), 삭제된 글을 다른 탭에서 저장(404 안내), 공개 상태를 false로 바꾸면 공개 목록에서 즉시 사라짐, 글 0개일 때 빈 상태와 "새 글" 진입점, 업로드는 성공했으나 글을 저장하지 않고 떠난 경우 고아 Blob이 남음(허용, 정리 기능은 범위 밖).

### F8. 마크다운 에디터 입력, 이미지 삽입, .md import (P0 입력, P1 미리보기)

- 수용 기준:
  1. 새 글/수정 폼에서 본문을 textarea에 직접 입력한다(P0). 같은 렌더러로 sanitize된 미리보기를 볼 수 있다(P1). 미리보기는 공개 상세와 동일한 정화 정책.
  2. **이미지 삽입(P0)**: 에디터에 이미지 업로드 버튼(또는 파일 선택)을 둔다. 파일을 고르면 F7-10 API로 업로드하고, 성공하면 **textarea의 현재 커서(선택 영역) 위치에** `![alt](url)`을 삽입한다. alt 초기값은 파일명(확장자 제외)이며 이후 직접 수정 가능하다. 선택 영역이 있으면 그 자리를 대체하지 않고 선택 끝에 삽입한다(기존 텍스트 보존).
  3. 삽입 후 커서는 삽입된 텍스트 뒤로 이동하고, 폼 입력 상태(본문 값)가 갱신되어 저장 시 포함된다. 업로드 중에는 업로드 버튼이 비활성화되고 진행 중임이 표시된다.
  4. 업로드 실패(형식/크기/인증/네트워크)는 본문을 변경하지 않고 오류를 같은 notice 영역에 표시한다(6절). textarea에 포커스가 없었던 경우(커서 위치 없음)는 본문 끝에 삽입한다.
  5. **.md import**: "새 글" 화면에서 `.md` 파일을 선택하면 frontmatter(`title`, `categories`, `tags`, `published`)와 본문을 읽어 폼에 채운다(즉시 저장하지 않음). 확인/수정 후 저장한다.
  6. slug 초기값은 파일명 규칙을 F2와 동일하게 적용해 제안하되 편집 가능. 파일명/frontmatter 모두 날짜가 없으면 발행일은 오늘.
  7. import 파일 검증: 확장자 `.md`(또는 `.markdown`), UTF-8 텍스트, 크기 상한(예: 1MB). 위반 시 폼을 변경하지 않고 오류 표시. 한 번에 한 파일만(대량 이관은 F2 스크립트).
  8. frontmatter가 없거나 일부만 있으면 존재하는 값만 채우고 나머지는 비움. 파싱 실패 시 본문 전체를 본문으로 채우고 경고 표시.
  9. import 후 저장 시 slug 충돌이면 409와 "이미 사용 중인 slug" 오류(덮어쓰기 없음). 폼 입력 유지.
  10. 이미 입력된 본문이 있을 때 import하면 덮어쓰기 전에 확인을 거친다.
  11. import한 .md 본문의 이미지 URL(로컬 상대경로 등)은 자동 변환하지 않는다. 필요한 이미지는 2번 업로드로 삽입한다.
- Edge case: 이미지 업로드 중 사용자가 본문을 계속 편집(삽입 위치는 업로드 시작 시점이 아닌 완료 시점의 커서를 기준으로 하거나, 업로드 중 textarea를 잠그는 방식 중 개발자가 택하고 문서화), 업로드 연속 클릭, 같은 파일 재선택(`change` 재발생), 파일명에 `]`, `)`, 공백 등 마크다운 특수문자(alt/URL 이스케이프), frontmatter `date` 키(있으면 발행일에 반영), BOM, CRLF, 빈 파일, 바이너리를 `.md`로 위장.

## 4. 비기능 요구사항

- 보안: 모든 렌더 경로(공개 상세, admin 미리보기)에서 `rehype-sanitize` allowlist를 통과한 결과만 렌더링한다. 본문은 신뢰하지 않는 입력으로 취급(이관 글 포함). admin 쓰기/업로드 API는 모두 `adminRoute` + 검증. .md import는 클라이언트에서 읽어 폼에 채우므로 별도 서버 파일 업로드 엔드포인트는 만들지 않는다(이미지 업로드 엔드포인트만 예외). 이관 스크립트의 외부 다운로드는 지정된 3개 URL로 제한.
- 성능: 목록은 필요한 컬럼만 조회(content 제외)하고 DB에서 페이징. 상세는 본문 1개만 조회.
- 접근성: 페이지당 h1 하나, 이미지 alt 필수, 페이지네이션은 `nav` + `aria-current`, 키보드 조작 가능. 이미지 업로드 버튼은 키보드/스크린리더로 조작 가능하고 진행/결과가 상태 문구로 전달된다.
- 일관성: Tailwind 토큰만 사용, spacing은 px 환산. 파일명 kebab-case, 서버 전용 모듈에 `import "server-only"`, 주석 규칙은 `project-structure.md`.
- 의존성: 마크다운 처리 패키지는 필요한 최소(remark/rehype 계열 + sanitize + 코드 강조 1종)로 하고 knip을 통과해야 한다.
- 테스트: slug 생성, frontmatter 파싱, 이미지 URL 매핑/치환(코드 펜스 제외), 깨진 외부 3개 매핑, 멱등성, sanitize, 페이지 범위 검증, slug 충돌 409 변환, 이미지 업로드 검증(gif 허용/썸네일은 gif 불허 회귀 없음, 크기 초과, 형식 불일치), 커서 위치 삽입 로직을 자동 테스트로 둔다. 기존 테스트의 `/blog`(talks) 기대값은 `/talks`로 갱신.

## 5. 배포와 운영 데이터

- 배포 경로: `feature/blog` -> `develop`(Preview) -> `main`(Production). 병합은 `--no-ff`만, 사용자 지시 후.
- **트리거 주체**: 글 생성과 이미지 업로드는 admin 사용자 액션이 유일한 트리거다. 크론/알림은 없다. 이관은 1회성 수동 스크립트.
- 환경변수: 스크립트에 `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`. 앱 런타임은 기존 값을 그대로 쓰며 신규 환경변수 없음(Blob 스토어는 썸네일과 공유).
- 마이그레이션 순서: ① drizzle 마이그레이션 적용 ② 스크립트 dry-run 검토 ③ 사용자 승인 ④ 이미지 다운로드/Blob 업로드 + DB 삽입 ⑤ 건수/치환 검증. 운영 DB와 Blob은 ③ 전에는 건드리지 않는다. 다른 세션이 DB 작업 중인지 확인하고 `git-safety.md` 조율 절차를 따른다.
- 롤백: 이관 글 삭제용 slug 목록과 업로드한 Blob 경로 목록을 보고서에 남긴다. 자동 롤백 기능은 만들지 않는다.
- Blob URL 호스트가 `next.config`의 이미지 허용 목록에 필요한지는 개발자가 확인한다.

## 6. Bug Team 피드백 반영

출처: `artifacts/bug-team/2026-10-13-admin-save-feedback/postmortem.md`.

- admin 블로그 폼의 저장 결과 피드백은 행동 버튼(저장/삭제)과 **같은 영역**에 보여야 한다. `FormStatus`를 쓰면 `FormActionBar`에 `notice`를 전달한다. 긴 본문 textarea 아래나 폼 맨 위처럼 버튼에서 멀어 스크롤해야 보이는 위치에 두지 않는다.
- 수용 기준:
  1. design-spec에 "결과 피드백 위치" 항목을 둔다(designer).
  2. 저장 성공, 검증 실패, slug 중복(409), 삭제 실패, import 경고, 이미지 업로드 실패가 모두 같은 영역의 notice로 보인다.
  3. code-review에서 이 항목의 확인 결과를 남긴다.
  4. 본문 textarea가 길어도(수천 줄) 버튼 영역이 화면에서 접근 가능해야 한다(고정/인접 배치는 designer 결정).
- 하네스 변경(designer.md, code-reviewer.md)과 lint 테스트 추가는 별도 브랜치(`feature/admin-form-feedback-guard`) 대상으로 이번 사이클 범위 밖. 포스트모텀 파일은 삭제하지 않는다.

## 7. 사용자 확인 필요

없음. 남아 있던 선택 확인 2건은 사용자 결정으로 확정되었다.

- admin 본문 이미지 업로드: 포함(F7-10, F8-2~4).
- 정상 응답 외부 이미지 6개: URL 유지(F3-6).
- 깨진 외부 이미지 3개: 원본 복구 후 Blob 업로드(F3-5).

게이트(진행 중 반드시 사용자 승인): 운영 DB 삽입과 Vercel Blob 업로드 실행, 커밋/병합.

## 8. 범위 밖

- 댓글, 검색(전문/제목), RSS/Atom, 사이트맵 신규 생성, 조회수, 좋아요, 공유 버튼
- 태그 필터, 태그 목록 페이지, 카테고리 관리 화면, 관련 글/이전-다음 글
- 목차(TOC) 렌더링
- 예전 `/blog`(talks) 주소 리다이렉트, slug 변경 시 리다이렉트
- 여러 파일 일괄 import, 초안 자동 저장, 버전 이력, 낙관적 잠금
- 에디터 이미지 드래그앤드롭/붙여넣기 업로드, 이미지 리사이즈/압축, 고아 Blob 정리
- 원본 GitHub Pages 블로그와 원본 저장소 수정, 원본과의 지속 동기화
- 수동 정렬 UI(날짜순 고정)
- 정상 외부 이미지 6개의 Blob 미러링
- `feature/admin-form-feedback-guard` 대상인 하네스/lint 변경
