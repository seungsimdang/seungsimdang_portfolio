# qa-report-1: 블로그 DB 이관 QA (T09 1차)

- 브랜치: `feature/blog`, 메인 체크아웃에서 작업, 커밋 없음
- 소스 코드 수정 없음. 신규 테스트 파일 9개만 추가

## 판정

조건부 통과. 자동 검증은 모두 통과했고, 결함 2건(Low)과 미검증 항목이 있다.

## 신규 테스트 (9개 파일, 137건, 전부 실제 소스 import)

| 파일 | 건수 | 대상 |
| --- | --- | --- |
| `__tests__/utils/blog-slug.test.ts` | 13 | `slugifyPostName`, `parsePostFileName`, `decodePostSlug` |
| `__tests__/schemas/blog-schema.test.ts` | 31 | `postSlugSchema`, `postCreateInputSchema`, `postUpdateInputSchema` |
| `__tests__/utils/blog-frontmatter.test.ts` | 14 | `parsePostMarkdown` |
| `__tests__/utils/blog-image-migration.test.ts` | 24 | `resolveLegacyImage`, `collectImageUrls`, `replaceImageUrls` |
| `__tests__/utils/render-markdown.test.ts` | 14 | `renderMarkdown` sanitize 회귀 |
| `__tests__/utils/blog-image-signature.test.ts` | 7 | `sniffImage` |
| `__tests__/api/post-image-upload-route.test.ts` | 7 | 본문 이미지 라우트(gif 허용), 썸네일 라우트(gif 불허) |
| `__tests__/utils/blog-post-editing.test.ts` | 8 | `insertImageMarkdown`, `todayInSeoul` |
| `__tests__/utils/blog-excerpt-page.test.ts` | 19 | `parsePageParam`, `postExcerpt` |


호출 확인: 위 표의 모든 식별자가 각 테스트에서 직접 호출된다. 로직 복사 테스트는 없다.

## 검증 명령 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm type-check` | 통과 |
| `pnpm exec vitest run` | 28 파일 / 384건 통과 (신규 137건 포함) |
| `pnpm check` | 통과 (179 files) |
| `pnpm knip` | 통과 (출력 없음) |
| `pnpm harness:test` | 6 파일 / 43건 통과 (주석 규칙 검사 포함) |
| `pnpm test:e2e:local` | 50건 통과, 종료 코드 0 (E2E 전용 DB 사용) |

`The destination stream closed early` 로그: 이번 e2e 실행에서 31건 출력. develop 기준 대조는 orchestrator 몫이며 e2e는 모두 통과했다.

dev 서버는 띄우지 않았다(e2e 스크립트가 자체 서버를 띄우고 종료함). 금지 명령은 사용하지 않았다.

## 수용 기준 분류

| 기준 | 판정 | 근거 |
| --- | --- | --- |
| F1-3 slug 형식/길이/`new` 금지 | 통과 | blog-schema 테스트. DB check 제약 자체는 미검증 |
| F1-2 unique 위반 409 변환, F1-4 인덱스 | 미검증 | 서비스가 DB 의존. 단위 테스트 범위 밖이고 e2e에 블로그 시나리오 없음 |
| F1 한글 slug 디코딩, 실패 시 null | 통과 | blog-slug 테스트 |
| F2-1 dry-run 기본 | 부분 검증 | `--apply`에 `--source`/`--report`가 없으면 쓰기 전에 종료코드 2로 거부됨을 실행 확인. dry-run 본 동작은 원본 저장소·DB 필요로 미실행 |
| F2-2 멱등 | 미검증 | `scripts/migrate-blog.ts`가 `main()` 단일 함수이고 export가 없어 순수 함수 분리 부분이 없음. 테스트하려면 소스 분리 필요 |
| F2 slug 생성, frontmatter, 날짜 파싱 | 통과 | slug/frontmatter 테스트 |
| F3-1 자기 저장소 URL 변형 매핑 | 통과 | github blob/raw, raw.githubusercontent, 두 owner, `?raw=true`, 한글/공백/NFD |
| F3-8 코드 펜스 제외, HTML img 치환 | 통과 | blog-image-migration 테스트 |
| alt 규칙(빈 값, `image`, 순번) | 통과 | 동일 |
| F3-4/5 git 복원, 외부 3개 다운로드, Blob 업로드 | 미검증 | 네트워크/Blob/운영 DB 금지와 스크립트 비분리 |
| F4/F5 공개 목록·상세 렌더 | 부분 검증 | `parsePageParam`, `postExcerpt` 통과. 페이지 렌더, 404, 페이지네이션 UI는 e2e 시나리오 부재로 미검증 |
| F5-2~5, 7 sanitize, h1 강등, 외부 링크 rel, 표 래퍼, pre tabIndex | 통과 | render-markdown 테스트 |
| F5-3 http 이미지 | 통과 | img 제거, alt 텍스트만 남김 |
| F6 talks 경로 이동 | 통과 | 기존 e2e `/talks` 시나리오 통과. `/blog` 목록 e2e는 없음 |
| F7-10 본문 이미지 업로드 API | 통과 | gif 허용, 시그니처/확장자/MIME 불일치 400, 4MB 초과 413, 인증/Origin 거부, 잘못된 URL 삭제 후 500, 썸네일 gif 불허 회귀 |
| F7 admin 화면(목록/편집/삭제/notice) | 미검증 | GitHub OAuth 필요로 자동화 불가, 단위 대상 아님 |
| F7-6 posts API 라우트 CRUD, 409, 404 | 미검증 | 라우트/서비스 테스트는 DB 모킹이 필요해 이번에 작성하지 않음 |
| F8-2 커서 위치 삽입, 이스케이프 | 통과 | blog-post-editing 테스트. 아래 결함 1 참조 |
| F8-5/8 .md import 파싱, BOM/CRLF/깨진 YAML | 통과 | frontmatter 테스트 |
| F8 에디터 UI(업로드 버튼, 미리보기, 덮어쓰기 확인) | 미검증 | 컴포넌트 테스트 미작성, admin은 OAuth 필요 |
| 접근성 h1 하나, nav aria-current | 부분 검증 | 본문 h1 강등만 검증. 페이지 단위는 미검증 |

## 발견한 결함 (소스 미수정, 테스트는 현 동작 기준으로 통과 상태)

### 결함 1 (Low): `insertImageMarkdown` URL의 괄호가 이스케이프되지 않음

- 위치: `src/lib/admin-client/post-editing.ts`의 `escapeUrl`
- 의도: `/[\s()]/`를 `encodeURIComponent`로 인코딩
- 실제: `encodeURIComponent("(")`는 `(`를 그대로 돌려줘서 괄호가 인코딩되지 않음. 공백만 `%20`이 됨
- 재현: `insertImageMarkdown("", 0, "a", "https://x/a b(1).png").text`가 `![a](https://x/a%20b(1).png)`를 반환
- 영향: 괄호가 짝이 맞으면 CommonMark가 허용해 렌더되지만 짝이 안 맞는 URL(`a).png`)은 이미지 문법이 깨짐. 현재 업로드 URL은 `image-<랜덤>.png` 형태라 실제 발생 가능성은 낮음
- 제안: 괄호는 `%28`/`%29`로 직접 치환

### 결함 2 (Low): `replaceImageUrls`가 꺾쇠 URL의 꺾쇠를 제거함

- 위치: `src/lib/blog/migration/replace-image-urls.ts`의 `rewriteMarkdown`
- 재현: `replaceImageUrls("![a](<https://old/a b.png>)", map, "글")`가 `![a](https://blob/a b.png)`를 반환(꺾쇠 소실)
- 영향: 새 URL에 공백이 있으면 이미지 문법이 깨짐. 이관 대상 새 URL은 Blob 경로로 안전 문자만 쓰므로 실제 영향은 없을 가능성이 높음
- 제안: 꺾쇠로 시작했으면 새 URL도 꺾쇠로 감싸 유지

## 기타 관찰

- 소스 `__tests__` 중 `/blog` 공개 목록·상세, admin 블로그의 e2e 시나리오가 없다. 렌더/404/페이지네이션 UI는 자동 검증되지 않는다.
- 이관 스크립트 순수 함수 분리(예: slug 충돌 접미사, 건수 검증, dry-run 가드)를 export하면 F2-2 멱등 테스트를 추가할 수 있다. orchestrator 판단이 필요하다.
- YAML 위험 태그(`!!js/function`)는 core 스키마로 경고만 내고 실행되지 않는다. 경고 로그가 테스트에 섞여 해당 케이스는 넣지 않았다.
