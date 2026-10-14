# code-review-1: Jekyll 블로그 DB 이관과 블로그 기능

- 검토 범위: `git diff ac2e26b..HEAD` 코드 변경(`artifacts/` 제외), 브랜치 `feature/blog`
- 1차 판정: **재작업** (High 1건: 신규 로직 자동 테스트 전무)
- 코드 수정·커밋 없음

## 자체 발견

### F-1. 신규 로직에 대한 단위 테스트가 하나도 없음 (High, 이번 diff 안)

- 위치: `__tests__/` 변경 0건 (diff에 테스트 파일은 `tests/e2e/*` 4개뿐, 기존 `__tests__/api/thumbnail-upload-route.test.ts`는 미수정)
- 근거: requirements 4절이 slug 생성, frontmatter 파싱, 이미지 URL 매핑/치환(코드 펜스 제외), 깨진 외부 3개 매핑, 멱등성, sanitize, 페이지 범위 검증, slug 충돌 409 변환, 업로드 검증(gif 허용/썸네일 gif 불허 회귀/크기/형식), 커서 위치 삽입을 자동 테스트로 두라고 명시함. F2 수용 기준 2는 "멱등을 테스트로 보장"이라고 명시함
- 영향: summary의 vitest 247 통과는 기존 테스트 수치이며 이번 기능은 회귀 방어가 없음. 특히 `replaceImageUrls`, `resolveLegacyImage`, `parsePostMarkdown`, `slugifyPostName`/`decodePostSlug`, `insertImageMarkdown`, `parsePageParam`, `handleImageUpload`(gif 허용, 썸네일 gif 불허), `renderMarkdown` sanitize(script, onerror, javascript:, http img)가 무테스트
- 수정 제안: 위 순수 함수들을 `__tests__/`에서 실제 소스를 import해 검증(복사본 금지). 이관 스크립트 멱등은 `main`이 한 파일이라 직접 테스트가 어려우므로 `onConflictDoNothing` 경로와 `existing` skip 분기를 함수로 분리하거나 통합 테스트로 확인. 업로드는 썸네일 GIF 거부와 post-image GIF 허용을 한 쌍으로 테스트

### F-2. 표와 코드 블록 가로 스크롤의 키보드 접근 (Medium, 이번 diff 안)

- 위치: `src/app/globals.css` `.markdown-body table`(display:block; overflow-x:auto), `.markdown-body pre`(overflow-x:auto), 렌더러 `src/lib/markdown/render-markdown.tsx:36-72`의 `components`에 table/pre 래퍼 없음
- 근거(summary "재개 시 확인 사항" 2번 판단): 스크롤 컨테이너가 포커스 가능하지 않으면 키보드만 쓰는 사용자는 넘친 열을 볼 수 없음. 최신 Chromium과 Firefox는 스크롤 컨테이너를 기본 포커스 대상으로 삼지만 Safari는 아님. 또 `display:block`을 table에 주면 일부 보조기기에서 표 의미가 사라짐
- 영향: 폭 넘는 표(알고리즘/CS 글에 다수 추정)가 Safari 키보드 사용자에게 읽히지 않음. 표 시맨틱 손실 가능
- 수정 제안: `components.table`에서 `<div role="region" tabIndex={0} aria-label="표" className="overflow-x-auto">` 래퍼로 감싸고 table의 `display:block`은 제거. `pre`도 같은 방식(`tabIndex={0}`) 적용 검토. 차단 사유까지는 아니라 Medium

### F-3. .md import에서 빈 frontmatter title이 파일명 제목으로 대체되지 않음 (Low, 이번 diff 안, CodeRabbit과 중복)

- 위치: `src/components/admin/blog-form.tsx:183` `const title = frontmatter.title ?? name.title;`
- 근거: `parsePostMarkdown`이 title을 trim하므로 `title: ""`이면 빈 문자열이 되어 `??`로는 대체되지 않음. 이관 스크립트(`scripts/migrate-blog.ts`)는 `||`를 씀
- 영향: 빈 title 파일을 import하면 제목이 비고 slug 제안도 날짜만 남음(저장 시 검증에서 걸리므로 데이터 손상은 없음)
- 수정 제안: `||`로 통일

### F-4. 삭제 실패 notice가 ConfirmDialog 메시지와 바 notice에 중복 (Low, 이번 diff 안)

- 위치: `src/components/admin/blog-form.tsx:117-124` `remove()`가 `setLocalNotice`를 호출하고 같은 문구를 반환(다이얼로그에도 표시되는 구조로 보임)
- 영향: 다이얼로그 안과 바에서 오류를 두 번 낭독할 수 있음. 동작 오류는 아님
- 수정 제안: 다이얼로그가 닫히지 않는 경로라면 반환값만 쓰고 localNotice 설정 제거. 확인 후 필요 시 조정

### F-5. 공개 목록 category 쿼리 길이 상한 없음 (Low, 이번 diff 안)

- 위치: `src/app/(public)/blog/page.tsx:34-37`, `src/services/blog/blog-service.ts:55`
- 근거: 파라미터화되어 SQL 주입은 아니나 임의 길이 문자열이 `React cache` 키와 쿼리로 들어감. 카테고리 상한은 스키마상 50자
- 수정 제안: 50자 초과면 빈 결과로 처리하거나 잘라서 사용

### F-6. 이미지 시그니처 판별 로직 중복 (Low, 이번 diff 안)

- 위치: `scripts/migrate-blog.ts:84-114` vs `src/lib/api/image-upload.ts:30-70`
- 근거: `image-upload.ts`는 `server-only`라 스크립트에서 import 불가해 중복 자체는 이해됨. 다만 두 곳이 어긋날 위험(스크립트는 GIF 길이 가드 없음)
- 수정 제안: 시그니처 판별만 `server-only` 없는 `src/lib/` 순수 모듈로 분리해 공유(후속 가능, 이번 사이클 필수 아님)

## 요구 확인 결과

### 수용 기준 충족

- 공개 `/blog` 목록: 20개 페이지, `parsePageParam`(비정상 값은 1), 서비스 `listPosts`가 총 페이지로 clamp, "총 N개 중 a-b번째" 표시, 빈 상태, category 필터와 선택 해제(전체 링크) 충족
- 공개 `/blog/[slug]`: `decodePostSlug`+`postSlugSchema` 통과분만 조회, 미공개/없음/디코딩 실패는 404, h1은 글 제목 하나, 본문 h1->h2 매핑, 외부 링크 새 탭+`noopener noreferrer`, 메타데이터, 목록 링크 충족. `http:` 이미지는 `<span>` alt 텍스트로 대체됨(조용히 숨김, 코드에서 확인 가능)
- `/talks` 이동: navbar/footer 링크와 활성 판정(`/blog/*`는 Blog), e2e 기대값 갱신 충족. `grep`상 talks를 가리키는 잔존 `/blog` 참조 없음(남은 `/blog`는 모두 블로그 용도)
- admin CRUD: `adminRoute`, `ok`/`HttpStatusCode`, 생성/수정/삭제 모든 성공 경로에서 `revalidatePath("/", "layout")` 호출(대칭), 404/409(`getPgErrorCode` 재사용)/본문 상한(`POST_BODY_MAX_BYTES`와 `POST_CONTENT_MAX` 모순 없음) 충족. slug unique는 DB 제약(`posts_slug_unique`)과 check 제약으로 보장되어 read-then-write race 없음
- `.md` import, 본문 이미지 업로드(커서 삽입, 업로드 중 버튼 비활성, 실패 시 본문 불변, 중복 클릭 가드) 충족. import 확인창(`window.confirm`)은 본문이 있을 때만 동작
- 한글 slug 라운드트립: 링크 생성은 `encodeURIComponent(slug)`, 수신은 `decodePostSlug`(1회 디코딩+NFC), 형식 검증 후 조회. 디코딩 실패는 404. 이중 디코딩 위험 없음(slug 형식에 `%` 불허)
- 페이지네이션 경계: 0/음수/비숫자는 1, 7자리 이상 숫자는 1, 마지막 초과는 서비스에서 마지막으로 clamp. `Pagination`은 `nav`+`aria-current`+생략 처리 정상
- 이관 스크립트: 기본 dry-run. 쓰기 경로(`put`, `db.insert`)는 모두 `apply` 가드 안. dry-run의 다운로드는 `if (apply)` 안에서만 실행되고 DB는 SELECT만 수행. `--apply`는 `--report` 필수, 환경변수 사전 검증, DB 호스트 확인 프롬프트(`--yes`로 생략). 멱등은 선조회 skip과 `onConflictDoNothing`의 이중 방어, Blob은 결정적 경로+`allowOverwrite`. 다운로드 대상은 `RECOVERIES` 3건(파일명+호스트 일치)으로 제한. 종료 코드는 FAIL 또는 warning 시 1. 건수 검증 출력. 단 F-1처럼 자동 테스트가 없음
- URL 치환: `scan`이 remark AST의 `image`/`html` 노드만 보므로 코드 펜스와 인라인 코드는 자연히 제외됨. HTML `<img>`와 alt 규칙 처리. 뒤에서부터 치환해 오프셋 유지. `resolveLegacyImage`는 퍼센트 디코딩, NFC, `..` 차단, 두 저장소와 raw/blob 모두 처리
- 썸네일 업로드 리팩터링 회귀 없음: `git show ac2e26b:src/app/api/admin/uploads/thumbnail/route.ts`와 `handleImageUpload`를 비교하면 검증 순서(타입, Content-Length, formData, 단일 파일, 빈 파일, 크기, 시그니처, 확장자, `file.type`, put, URL 검증 후 del)와 에러 문구가 동일. 썸네일은 `allowGif:false`라 GIF 헤더가 `sniffImage`에서 undefined가 되어 거부됨(오류 문구는 "PNG, JPG, WebP"로 기존과 동일). 경로는 `thumbnails/image`, URL 검증은 `isValidThumbnail` 유지. 테스트가 없어 회귀 방어는 기존 `thumbnail-upload-route.test.ts`에만 의존
- `isValidPostImage`는 `/blog/images/` 접두사로 `isBlobUrlUnder` 재사용(기존 패턴 재사용 양호)

### 결과 피드백 위치 (Bug Team 피드백)

- 결과: **충족**
- `blog-form.tsx`가 `FormStatus`를 쓰지 않고 `FormActionBar`에 `notice={localNotice ?? form.notice}`와 `detailed`를 전달함(`blog-form.tsx:306-314` 부근). 저장 성공, 검증 실패, 409, 삭제 실패, 업로드 실패, import 성공/경고가 모두 같은 바(`sticky bottom-0`, 저장/취소/삭제 버튼과 같은 영역)에 `role=status`/`role=alert`로 표시됨
- 우선순위: `localNotice`(업로드, import, 삭제)가 `form.notice`보다 앞서고, `submit()`이 제출 시 `localNotice`를 비워 저장 결과가 가려지지 않음
- `saving` 중에는 notice를 숨기고 버튼의 "저장 중..."이 진행을 알림. 업로드 중에는 `busyMessage`로 상태 문구 표시 및 저장 버튼 비활성
- `FormActionBar` 옵션 추가의 기존 4개 폼 영향 없음: `detailed`/`busyMessage`/`saveDisabled`는 모두 optional이고 미전달 시 `disabled={saving || undefined}`, `!detailed && notice && !saving`로 기존 분기와 동일한 출력. `FormStatus`는 `NoticeMessage`로 내부 추출만 되었고 마크업/role 동일
- 참고: 업로드 성공 notice가 저장 전까지 남음(의도로 보임), F-4 중복 낭독만 Low로 기록

### 구현 코드 주석의 사이클 한정 식별자

- `src scripts tests`에서 요구사항 항목 ID(F1-F8), 태스크 ID(T0x), BUG ID, finding ID, 게이트 문구 인용을 grep으로 확인했으나 0건. 위반 없음

### e2e 로그 `The destination stream closed early`

- 판단: 이번 변경 로직의 결함으로 보지 않음(Low, 정보). 단 baseline e2e를 직접 재실행해 대조하지는 않았음
- 근거: 이 문구는 `next/dist/compiled/react-server-dom-turbopack/.../react-server-dom-turbopack-server.node.*.js`(React Flight 서버)가 클라이언트가 RSC 스트림 요청을 응답 완료 전에 끊을 때 내는 메시지임. 이번 diff에는 스트림을 직접 다루는 코드(`pipeline`, `ReadableStream`, `Response` 스트리밍)가 없고, 기존 develop 프록시(`src/proxy.ts`)와 라우트 구조도 바뀌지 않음. 이번 변경이 늘린 것은 navbar/footer의 링크 1개(`/blog`)와 라우트 수이므로, Playwright가 페이지 이동 중 `Link` prefetch 요청을 끊을 때 발생 빈도가 늘 수는 있으나 원인은 기존 구조의 공통 현상
- 확인 방법 제안: develop 체크아웃에서 `pnpm test:e2e:local`을 돌려 같은 digest 로그 유무 비교. 이번 사이클 차단 사유 아님

### 과설계, 죽은 코드, 패턴 재사용

- 기존 패턴 재사용 양호: `adminRoute`, `ok`, `parseJsonBody`(maxBytes 인자 추가만), `useAdminForm`, `describedBy` 공용화, `getPgErrorCode`/`SlugConflictError` 재사용, `isBlobUrlUnder` 추출
- 과설계 징후 없음. 마크다운 처리는 요구된 최소(remark/rehype+sanitize+highlight 1종). `rehypeHighlight`가 sanitize 뒤에 있으나 `hljs-*` 클래스만 추가하므로 보안 경계에 영향 없음(주석이 순서 경계를 명시함)
- 죽은 코드: `blog-form.tsx` `toUpdateInput`의 `_slug` 비구조화는 의도적 제외로 허용. 그 외 미사용 export 징후 없음(요약상 knip 통과)
- 이번 사이클 밖 후속: 없음

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --committed --base-commit ac2e26b` (`--base main`은 main이 develop보다 뒤처져 범위가 달라지므로 사이클 기준 커밋 사용), 상태 completed. 무료 CLI 허용량 사용
- 타당 항목 (1건)
  - `src/components/admin/blog-form.tsx:183` 빈 frontmatter title이 파일명 제목으로 대체되지 않음. Low. 자체 발견 F-3과 중복
- 기각 항목: 없음
- 요약: CodeRabbit 1건 중 1건 타당

## 최종 판정

- **재작업**: 기능 구현은 요구사항과 명세를 대체로 충족하고 보안 경계, 멱등, 회귀 점검도 양호하나, 요구된 자동 테스트가 전무함(F-1, High)
- 재작업 항목: F-1(필수), F-2(권장, Medium), F-3~F-6(Low, orchestrator 재검토 게이트에서 처리 여부 결정)
