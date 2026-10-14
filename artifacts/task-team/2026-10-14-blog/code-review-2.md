# code-review-2: T07 재리뷰 (재작업 커밋 3bf60c3)

- 검토 범위: `code-review-1.md`/`triage-1.md`의 F-2~F-6 해결 여부와 `git show 3bf60c3`가 새로 만든 코드. F-1은 T09 이관으로 범위 밖.
- CodeRabbit: 재작업 재리뷰 지시이므로 생략(자체 리뷰만).
- 코드 수정·커밋 없음.

## finding 해결 판정

| ID | 판정 | 근거 |
| --- | --- | --- |
| F-2 | 해결 | `render-markdown.tsx:36-52`에서 `pre`에 `tabIndex={0}`, `table`을 `aria-label`과 `tabIndex={0}`을 가진 `section.table-scroll`로 감쌈. `globals.css:409-416`에서 table의 `display:block`을 제거하고 스크롤을 `.table-scroll`로 이동해 표 시맨틱 유지. 지시안의 `div role="region"` 대신 `section`+`aria-label`(암묵적 region)이며 biome `useSemanticElements` 사유가 타당함 |
| F-3 | 해결 | `blog-form.tsx:182` `frontmatter.title \|\| name.title`로 빈 문자열도 파일명 제목으로 대체 |
| F-4 | 해결 | `blog-form.tsx:134-136`에서 `setLocalNotice`를 제거하고 메시지 반환만 남겨 ConfirmDialog 한 곳에만 표시 |
| F-5 | 해결 | `(public)/blog/page.tsx:34-37`에서 `POST_LABEL_MAX`(50) 초과 시 필터 미적용. 상한 상수는 `constants/blog.ts:7`로 올리고 `blog.schema.ts`가 같은 상수를 사용해 단일 원본. 길이 판정은 zod `.max`와 같은 UTF-16 단위로 일치 |
| F-6 | 해결 | `src/lib/blog/image-signature.ts`로 분리해 `image-upload.ts:6,75`와 `migrate-blog.ts:17,175,440`이 공유. 분리 모듈에 `server-only` 없음 확인. 이관 스크립트의 GIF 길이 가드 부재도 공유로 해소됨 |

## 확인 항목

- 보안 경계: 변경 없음. `components`는 `toJsxRuntime` 단계라 `rehypeSanitize`(`render-markdown.tsx:94`) 이후이며 sanitize 순서(`:89-95`)와 순서 경고 주석은 그대로. 원문 HTML의 class 등은 sanitize에서 제거되므로 `table-scroll`을 외부 입력이 위조할 수 없음.
- 썸네일 GIF 불허/본문 GIF 허용: `sniffImage`의 `allowGif` 로직이 원본과 바이트 단위로 동일(PNG/JPEG/WebP/GIF 분기, GIF는 `allowGif && length>=6`). `image-upload.ts:75-83` 호출부와 기존 오류 문구는 diff에서 변경 없음.
- 스크립트 `extension` 필드: 구 `sniff`의 `ext`를 쓰던 곳(`migrate-blog.ts:441,449`)이 모두 `detected.extension`으로 갱신됨. `sniff(` 잔존 호출 0건. 스크립트는 항상 `allowGif=true`라 기존 동작과 동일. `loadRepoImage`의 반환 `extension`(`:177`)은 파일 확장자 기반으로 기존과 동일하며 시그니처와의 일치 검증은 기존에도 없던 부분(변경 아님).
- 주석 규칙: 신규 주석 모두 명사형 종결(`~함`, `~포커스`), em-dash 없음, 사이클 한정 식별자 인용 없음. `// 카테고리·태그 글자 수`도 규칙에 부합.
- 포커스 표시: `globals.css`에 `outline` 초기화가 없어 브라우저 기본 포커스 링이 표시됨.

## 새 finding

### N-1. 스크롤이 필요 없는 pre/표도 항상 탭 정지점이 됨 (Low, 재작업 diff 안)

- 위치: `src/lib/markdown/render-markdown.tsx:36-52`
- 근거: `tabIndex={0}`을 무조건 부여하므로 넘치지 않는 짧은 코드 블록과 표도 탭 순서에 들어가고, 표는 매번 "표, 가로로 스크롤 가능"으로 낭독됨(실제로는 스크롤 불가일 수 있음)
- 영향: 코드 블록이 많은 글에서 키보드 탭 이동이 길어지고 낭독이 부정확할 수 있음. 동작 오류는 아님
- 수정 제안: 필수 아님. 필요하면 라벨을 "표"로 단순화(스크롤 가능 여부 문구 제거). 넘침 감지 후 조건부 tabIndex는 클라이언트 컴포넌트가 필요해 과설계이므로 권장하지 않음

차단 사유가 되는 새 finding 없음.

## 최종 판정

- **통과**: F-2~F-6 모두 해결, 재작업 diff에서 Critical/High/Medium 신규 finding 없음. N-1은 Low로 처리 여부를 orchestrator 재검토 게이트에서 결정.
- 남은 항목: F-1(T09 이관), 사이클 전체 최종 리뷰 시 CodeRabbit 실행 필요.
