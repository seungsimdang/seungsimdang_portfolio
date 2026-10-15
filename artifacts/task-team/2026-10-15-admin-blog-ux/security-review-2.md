# 보안 리뷰 2차 (사이클 전체 최종)

- 대상 브랜치: feature/admin-blog-ux
- 판정: **배포 승인** (Critical 0, High 0, Medium 0, Low 3, Info 2)
- 범위: 재작업 파일 4종 정밀 + 1차 미정밀 파일 전부 + 공개/admin 블로그 페이지, 서비스, 스키마, frontmatter + 로그인 페이지의 `from` 처리

## 심각도별 목록

### Critical / High / Medium

없음.

### Low

**L1. 링크 이탈 우회 플래그가 예외 시 남을 수 있음** (`use-leave-confirm.ts` proceed, link 분기)
- `leavingRef = true` 설정 후 `anchor.click()`은 try/finally로 `bypassClickRef`만 복구하고, `endLeaving()`은 finally 밖이다. click이 동기 예외를 던지면 `leavingRef`가 true로 남아 언마운트까지 beforeunload 보호가 꺼진다.
- `click()`은 핸들러 예외를 던지지 않고 보고만 하므로 도달 가능성은 매우 낮다.
- 수정안: `endLeaving()`을 finally 안으로 이동.

**L2. 새로고침 action이 우회 플래그를 해제하지 않음** (`sortable-list.tsx` ORDER_MISMATCH action)
- `leavingRef.current = true` 후 `location.reload()`. reload가 성공하면 문서가 교체되어 무해하다.
- 오프라인 등으로 reload가 지연되면 그 사이 보호가 꺼져 있다. 사용자가 직접 누른 동작이라 위험은 낮다.
- 수정안: 일정 시간 후 해제하거나 `allowLeaving` 계열 공용 함수 사용.

**L3. 기록 이동 우회 기간의 경합** (`use-leave-confirm.ts` back 분기)
- `bypassPopRef`는 "다음 traverse navigate 하나"를 통과시키는 단일 플래그라, traverseTo 직후 사용자가 다른 뒤로가기를 연타하면 그 한 건이 확인 없이 통과할 수 있다.
- `traverseTo`가 동기 예외를 던지면 5초 타이머(`LEAVE_MS`)까지 beforeunload가 꺼진다. 우회는 최대 5초로 상한이 있어 영구 비활성 경로는 없다.
- 수정안: 우회 시 `event.destination.key === targetKey`일 때만 소비.

### Info

**I1. 로그아웃 중 미저장 변경**
- `SignOutButton`은 anchor가 아닌 button이고 `signOut()`이 `location.href`로 이동하므로 확인 모달 대신 브라우저 기본 beforeunload 창이 뜬다.
- 인증 흐름은 막히지 않고 보호도 유지된다. 보안 문제 아님.

**I2. Navigation API 미지원 또는 비취소 traverse**
- `!event.cancelable`이거나 Navigation API가 없으면 뒤로가기는 가로채지 않는다. 데이터 손실 UX 한계일 뿐 보안 영향은 없다.
- cross-document traverse는 `sameDocument` 검사로 건드리지 않고 beforeunload 기본 창이 담당한다.
- 기록 이동 가로채기(`guardBack`)는 `sortable-list`만 켠다. 폼 훅(`useAdminForm`)은 켜지 않는다.

## 중점 항목 검토 결과

**이탈 확인 우회 플래그**
- `leavingRef`, `bypassPopRef`는 `endLeaving`(타이머 clear 포함), 언마운트 effect, `active`/`guardBack` 변경 cleanup에서 해제된다. 링크 경로는 click 직후 동기 해제, 기록 경로는 `Promise.allSettled([committed, finished])` 후 해제하고 거부도 소비한다.
- 최악의 경우는 L1~L3로, 모두 상한이 있거나 도달 가능성이 낮다.

**기록 이동 취소와 재개, 외부 출처, 인증 흐름**
- `onNavigate`는 `navigationType === "traverse"`이면서 `destination.sameDocument`일 때만 취소하므로 다른 출처나 다른 문서로의 이동을 가로채거나 재개하지 않는다.
- 재개는 저장된 `destination.key`로 `traverseTo`만 하며, URL을 새로 만들지 않아 open redirect 면이 없다.
- 클릭 가로채기는 `target=_blank`, download, `#` 앵커, 수정키 클릭을 제외한다. 확정 시 같은 anchor를 재클릭한다. 로그인·로그아웃 링크가 dirty 상태에서 모달을 거치는 것은 의도된 동작이며 확인 후 정상 진행된다. 로그인 페이지에는 가드가 마운트되지 않는다.
- 저장 직후 `router.push`/`router.replace`는 anchor 클릭도 traverse도 아니라 가드 대상이 아니다.

**토스트 링크와 action 출처**
- `Notice.link.href`는 호출부가 고정한 값뿐이다. `/admin/login?reason=expired&from=${encodeURIComponent(pathname)}`는 인코딩되어 있고, login 페이지의 `safeCallbackUrl`이 `/admin` 하위, `//` 및 `\` 금지로 open redirect를 막는다. 목록 링크는 상수 `listHref`다.
- `action.onClick`은 코드 내 클로저이고 서버 응답 문자열이 href/action으로 흘러들지 않는다. 서버 메시지는 `describeFailure`가 고정 문구로 매핑한다. React 텍스트 렌더링이라 XSS 면이 없다.
- `CLOSE_LABEL` 셀렉터는 상수라 주입 면이 없다.

**category, 이전/다음 글 쿼리**
- category는 drizzle `sql` 태그 템플릿에서 `${category}`가 바인딩 파라미터로 처리되어 SQL injection이 없다. `normalizeCategoryParam`이 배열 첫 값, trim, NFC, 길이 상한을 적용한다. 공개와 admin이 같은 지점을 공유한다.
- 페이지 파라미터는 정규식으로 1~999999 정수만 허용한다.
- 이전/다음 글은 drizzle 연산자(`lt`/`gt`/`eq`)로 파라미터화되어 있다. slug는 `decodePostSlug`와 `postSlugSchema`를 통과한 값만 조회하고, 링크는 `encodeURIComponent`로 만든다.
- `CategoryTabs`의 href는 `encodeURIComponent(name)`이며 `basePath`는 호출부 상수다.

**비공개 글 노출**
- `src/` 어디에도 `published` 컬럼 참조가 없고 `blog-service`의 조회는 공개 필터 없이 전체 글을 대상으로 한다. 스키마 정의(`src/db/schema/portfolio.ts`)에서도 컬럼이 제거되어 있다.
- 운영 DB의 false 0건이 확인되었고, 마이그레이션(`0003`)상 컬럼 기본값이 `true`라 컬럼 제거 이전에도 신규 insert는 공개 상태가 된다.
- 컬럼 제거 전까지 DB에 수동으로 false를 넣으면 노출되므로, 별도 단계의 컬럼 제거 시 기존 `posts_list_idx`(published 포함)의 재정의가 마이그레이션에 포함되는지만 확인하면 된다.
- `.md` 가져오기의 `published: false`는 경고 토스트로 "저장하면 공개 글이 됨"을 고지한다.

**기타 파일**
- `frontmatter.ts`: YAML `core` 스키마만 사용해 위험 태그를 차단하고, 알 수 없는 키는 버린다. 입력 크기는 클라이언트에서 1MB로 제한하고 서버 스키마가 content 길이를 다시 검증한다.
- `blog.schema.ts`: `strictObject`, slug 정규식, `new` 예약어 거부, 날짜 실재 검증. 서버 측 검증이 유지된다.
- `markdown-editor.tsx`: 업로드는 확장자와 MIME 이중 검사 후 `/api/admin/uploads/post-image`로 전송하고, 서버가 최종 검증한다. 미리보기는 `renderMarkdown`을 거치며 렌더러 자체(raw HTML 처리 방식)는 이번 변경 범위 밖이다.
- `use-admin-form.ts`: 401/403/429 매핑이 고정 문구이며 출처 거부(`FORBIDDEN_ORIGIN`)를 로그아웃 유도와 구분한다. `savingRef`로 중복 제출을 막는다.
- `blog-form.tsx`: slug는 편집 시 readOnly이며 PUT 입력에서 제외되고 URL은 `encodeURIComponent`로 구성한다. 생성 후 `router.push`는 서버가 반환한 slug만 사용한다.
- `project-form`, `talk-form`: 편집 URL에 `savedSlug`(서버가 검증해 내려준 값)를 인코딩 없이 쓰지만 slug 스키마가 영문 소문자, 숫자, 하이픈으로 제한하므로 경로 조작 면이 없다(변경 전부터의 구조). 슬러그 변경 확인 모달은 `form.submit`을 그대로 이어가 서버 검증을 우회하지 않는다.
- `resume-entry-form`, `profile-form`: `useAdminForm` 공통 경로만 사용하고 서버 스키마 검증 후 저장한다. 신규 위험 요소 없음.
- `confirm-dialog`, `leave-dialog`, `sortable-list`, `form-parts`, `admin-console-shell`, `admin-nav`, `sign-out-button`, `toast-provider`: 인증·권한 판단은 서버에 있고 클라이언트는 UI만 담당한다. 삭제·순서 요청 경로의 `row.id`는 서버가 내려준 값이다. `admin/(console)/blog/page.tsx`는 `requireAdminPage()`를 선호출한다. 공개 `blog/page.tsx`, `blog/[slug]/page.tsx`는 위 쿼리 검증을 거친 값만 사용한다.

## 한계

- 정적 읽기만 수행했다. 브라우저별 Navigation API 취소 동작(Chromium/Safari 지원 차이)은 실행으로 확인하지 않았다.
- `src/proxy.ts`, `adminRoute`, `requireAdmin`, `text-fields`, `renderMarkdown`, API 라우트 핸들러 본문은 이번 변경 범위가 아니어서 다시 읽지 않았다. 1차 리뷰의 확인 결과를 전제로 한다. `requireAdminPage()` 호출 존재만 이번에 확인했다.
- 프로젝트·발표·이력·프로필 폼의 필드별 서버 스키마(`portfolio.schema`)는 이번 사이클 변경 범위 밖으로 보고 읽지 않았다.

## 판정

Critical/High/Medium 미수정 항목이 없고, 이번 사이클이 건드린 클라이언트 이탈 확인·알림·블로그 조회 경로에서 인증 우회나 주입 경로를 찾지 못했으므로 **배포 승인**. Low 3건은 후속 개선 권고이며 차단 사유가 아니다. orchestrator의 9-1 재검토 게이트에서는 L1~L3의 재작업 여부를 별도로 판단하길 권한다.
