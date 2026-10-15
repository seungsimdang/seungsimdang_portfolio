# code-review-1: admin·블로그 UX 개선 (T07)

- 범위: `git diff 6aee747..754a208` (backend ec4d3f2, frontend 754a208), 브랜치 `feature/admin-blog-ux`
- 기준: `requirements.md`(7절 사용자 확정), `design-spec.md`, `api-spec.md`, `docs/agent-rules/`
- 자동 검사 결과(직접 실행): `tsc --noEmit` 통과, `vitest run` 28 파일 393 테스트 통과, `harness:test` 43 통과, `biome check src` 통과, `knip` 통과, `check-comment-line-breaks.mjs`(변경 src/scripts/tests 전체) 위반 없음
- 브라우저 실측은 하지 않았다(정적 리뷰). 런타임 판단은 "추정"으로 표시한다.

## 판정: 재작업

배포 승인 기준으로 High 1건(F6 마이그레이션 SQL 미생성)과 Medium 2건이 남아 있다. 나머지는 Low다.

| ID | 심각도 | 요약 |
| --- | --- | --- |
| CR1-H1 | High | `drizzle/0004_*.sql` 미생성, 스키마와 마이그레이션 불일치 (F6-7, F6-9) |
| CR1-M1 | Medium | 미리보기 탭에서 본문 검증 실패 시 포커스가 숨은 textarea로 가서 오류 필드가 보이지 않음 (CodeRabbit 타당, 자체 미발견) |
| CR1-M2 | Medium | 뒤로가기 가로채기가 "브라우저 앞으로 가기"와 다단계 뒤로가기를 뒤로 1단계로 가정함 (추정) |
| CR1-L1 | Low | popstate 연속 입력 경합 (추정) |
| CR1-L2 | Low | 링크 확인 후 이동의 `leavingRef` 해제가 `setTimeout 0`이라 일반 `<a>` 전체 이동에서 `beforeunload` 타이밍 의존 (추정) |
| CR1-L3 | Low | 중복 토스트 갱신이 요소를 재마운트해 포커스/호버 상태 유실 |
| CR1-L4 | Low | 구현 문서(적용 순서, 롤백 SQL, 캐시 확인 결과) 부재 |

## 1. Findings

### CR1-H1 (High) `drizzle/0004_*.sql` 미생성

- 위치: `src/db/schema/portfolio.ts:162-172`(컬럼과 인덱스 변경), `drizzle/`(최신 0003, `git diff --stat -- drizzle` 변경 없음)
- 근거: requirements F6-7은 `drizzle/0004_*.sql` 생성과 커밋, 인덱스 `(published_at desc, slug desc)` 재정의를, F6-9는 스키마와 SQL 일치를 요구한다. 현재 스키마 TS는 컬럼을 제거했지만 마이그레이션이 없어 `drizzle-kit generate`가 다음 실행에서 diff를 만든다. 로컬/e2e DB가 컬럼을 유지하는 한 동작은 하지만 스키마 단일 원본 원칙이 깨진다. 롤백 SQL(5.3)도 어디에도 기록돼 있지 않다.
- 배포 위험(함께 판단 필요): `package.json`의 `build`가 `scripts/migrate.mjs --build`를 실행하고, 이 스크립트는 `VERCEL_ENV`가 preview/production이면 빌드 중에 자동으로 적용한다(`scripts/migrate.mjs` 상단). 0004를 커밋하면 requirements 5.2의 "코드 먼저, 마이그레이션 나중" 순서와 5.3의 "운영 적용은 사용자 승인" 게이트를 우회해 빌드 단계에서 컬럼이 삭제된다. 새 빌드가 배포 전환되기 전 구간에서 이전 코드(published 조회)가 깨질 수 있다. Preview가 Production DB를 공유하는지는 확인하지 못했다(추정).
- 수정 방향: 0004를 `drizzle-kit generate`로 생성해 커밋하되, 자동 적용 경로와 5.2 순서의 충돌을 먼저 orchestrator가 사용자에게 보고해 결정을 받는다(예: 0004를 별도 후속 커밋/브랜치로 분리해 코드 배포 후 투입, 또는 승인된 방식으로 자동 적용 허용). 롤백 SQL과 `published = false` 0건 확인 쿼리를 구현 문서에 남긴다. 구현자가 의도적으로 보류한 것이라면 그 사유와 시점을 구현 문서에 적는다.

### CR1-M1 (Medium) 미리보기 탭에서 본문 오류 시 포커스 이동 실패 (CodeRabbit 교차검토에서 확인)

- 위치: `src/components/admin/markdown-editor.tsx:234-244`(작성 패널 `hidden`), `src/lib/admin-client/use-admin-form.ts:153-157`(`focusTick` 후 `[aria-invalid="true"]` 포커스)
- 근거: 미리보기 탭이 선택된 상태에서 본문이 검증에 실패(빈 본문, 300,000자 초과, 서버 필드 오류)하면 `aria-invalid` textarea가 `hidden` 패널 안이라 `focus()`가 무시된다. 오류 토스트는 "N개 항목을 확인하세요."만 말하고 필드 오류 문구도 보이는 상태는 FieldShell 안이지만 포커스가 이동하지 않아 키보드/스크린리더 사용자는 오류 위치로 안내받지 못한다. F9-10이 "검증 실패 시 첫 오류 필드로 포커스 이동" 유지를 요구한다.
- 수정 방향: `error`가 생기면 작성 탭으로 전환하는 처리를 `MarkdownEditor`에 둔다(`tabRef`와 `tab` 상태 함께 갱신). 포커스 effect가 탭 전환 렌더 이후 실행되는지(같은 `focusTick` effect가 먼저 돌 수 있음) 순서를 확인하고, 필요하면 전환을 `useLayoutEffect` 또는 error 변경 시점으로 앞당긴다.

### CR1-M2 (Medium, 추정) 뒤로가기 가로채기의 방향 가정

- 위치: `src/lib/admin-client/use-leave-confirm.ts:84-101`(`onPopState`), 주석 8-9행에 "되돌아온 이동을 뒤로가기로 가정함" 명시
- 근거: `popstate`는 방향을 알려 주지 않는다. 핸들러는 항상 `history.forward()`로 되돌린다.
  - 사용자가 브라우저의 앞으로 가기 버튼/제스처를 쓰면(목록에서 뒤로 갔다가 돌아오는 흐름에서 forward 항목이 존재) `forward()`는 한 칸 더 앞으로 가므로 원래 위치로 돌아오지 못하거나, forward 항목이 없으면 `forward()`가 무동작이라 URL만 바뀌고 화면은 그대로인 불일치가 남는다(Next 라우터는 `stopImmediatePropagation`으로 이벤트를 못 받음).
  - 히스토리 목록에서 여러 항목을 건너뛰는 이동(길게 눌러 선택)도 한 칸만 되돌려 원위치가 아니다.
  - 확인("이동") 시 `history.back()` 한 번만 수행하므로 위 경우 의도한 이동과 다르다.
- 판단 근거: History API로는 `popstate`에서 이동 거리를 알 수 없다는 것이 일반 지식이다. 구현자 검증이 Chromium 최소 페이지뿐이어서 앞으로 가기 경로는 검증되지 않았다고 판단한다.
- 수정 방향: 최소한 `history.state`에 심은 인덱스(예: 가드 활성화 시 `history.state`의 Next 내부 값은 건드리지 말고 별도 카운터를 `sessionStorage`나 모듈 변수로 보관)로 방향/거리를 계산해 되돌리거나, 한계를 주석과 구현 문서에 "앞으로 가기/다단계 이동 미보장"으로 명시하고 사용자(7-6 확정: 안정화 실패 시 orchestrator 보고)에게 보고한다. 보고 없이 현 상태로 두면 7-6의 "안정적으로 만들 수 없으면 보고" 조건을 우회한다.

### CR1-L1 (Low, 추정) popstate 연속 입력 경합

- 위치: `src/lib/admin-client/use-leave-confirm.ts:85-100`
- 근거: 뒤로가기를 빠르게 두 번 누르면 두 번째 이벤트가 `ignorePopRef` 분기에서 `forward()` 없이 소모되고, 이어 도착하는 첫 `forward()`의 popstate가 "새 뒤로가기"로 처리되어 `forward()`를 한 번 더 호출한다. 또한 effect cleanup이 `ignoreTimer`만 지우고 `ignorePopRef`는 지우지 않아, 되돌림 도착 전에 `active`가 꺼지면 플래그가 남아 다음 활성 구간의 첫 뒤로가기가 모달 없이 소모될 수 있다(확률 낮음).
- 수정 방향: cleanup에서 `ignorePopRef.current = false`로 초기화하고, 연속 입력 시 이미 되돌리는 중이면 추가 `forward()`를 하지 않도록 카운터 방식으로 바꾸는 방안을 검토한다. 우선순위는 낮다.

### CR1-L2 (Low, 추정) 확인 후 이동의 `beforeunload` 우회 타이밍

- 위치: `src/lib/admin-client/use-leave-confirm.ts:51-56, 106-117`
- 근거: 링크 확인 경로는 `allowLeaving(0)`으로 `leavingRef`를 켜고 `setTimeout(…, 0)`으로 끈 뒤 `anchor.click()`을 호출한다. `Link` 클라이언트 이동은 `beforeunload`를 발생시키지 않아 문제없다. 일반 `<a>`(전체 문서 이동)는 Chromium에서 클릭 활성화 동작 중 `beforeunload`가 동기적으로 처리되는 것으로 알고 있어 현재도 동작할 가능성이 높지만, 브라우저별로 보장되지 않는다(Firefox/Safari 미검증). admin 안의 내부 링크는 모두 `Link`이므로 실제 영향은 작다.
- 수정 방향: 일반 `<a>` 지원이 요구사항(F10-3 "일반 `a`도 가로챈다")이므로, 해제를 `setTimeout 0` 대신 `beforeunload` 핸들러에서 1회 소비하는 방식(플래그를 읽은 뒤 즉시 false)으로 바꾸면 타이밍 의존이 사라진다.

### CR1-L3 (Low) 중복 토스트 갱신 시 요소 재마운트

- 위치: `src/components/admin/toast-provider.tsx:157-163, 208-211`(`renderKey` 변경 시 `key` 변경)
- 근거: 같은 알림이 다시 들어오면 `renderKey`를 바꿔 재마운트한다. 의도(재낭독, 타이머 재시작)는 맞지만 사용자가 그 토스트의 닫기/행동 버튼에 포커스를 둔 상태이거나 포인터를 올린 상태면 포커스가 `body`로 빠지고 `hovered`가 false로 초기화되어 즉시 타이머가 재개된다. 같은 오류를 반복 제출하는 경로(검증 실패 연타)에서 닫기 버튼에 포커스를 두고 Enter를 연타하는 사용자는 드물어 영향은 작다.
- 수정 방향: 성공/비포커스 상태일 때만 `renderKey`를 바꾸거나, 재마운트 대신 타이머 리셋용 카운터를 effect 의존성에 넣는 방식을 검토한다. 설계 의도를 바꾸지 않는 선에서 후속 정리.

### CR1-L4 (Low) 구현 문서 부재

- 위치: `artifacts/task-team/2026-10-15-admin-blog-ux/`(구현 문서 없음)
- 근거: requirements가 구현 문서에 남기도록 요구한 항목을 코드만으로 확인할 수 없다: F1-2 `--spacing-header` 사용처 전수 확인 결과(코드상 `public-shell.tsx` 한 곳뿐임은 확인함), F3 이웃 글 상세 캐시 갱신 확인 결과, F9-6/F10-1 전수 검색 명령과 건수, 5.2-4 이전 번들 400 동작 기록, 롤백 SQL, 6절 5번 lint 불변식 소멸 사실 기록. 저는 대신 직접 검색해 확인했다(아래 2절).
- 수정 방향: T05/T06 완료 보고 또는 구현 문서에 위 항목을 기록한다. 블로그 상세는 `getPost`/`getPostNeighbors`를 요청마다 호출하는 서버 렌더이고 `(public)/blog`에 `revalidate`/정적 생성 선언이 없어 이웃 링크 캐시 문제는 코드상 보이지 않는다(추정, 런타임 미확인).

## 2. F1~F11 수용 기준 충족 표

범례: 충족 = 코드로 확인, 부분 = 일부 미충족/미확인, 미확인 = 정적 리뷰로 판정 불가(T09 QA 대상).

| 항목 | 판정 | 근거와 비고 |
| --- | --- | --- |
| F1 Navbar 모바일 간격 | 충족(레이아웃 실측 미확인) | `navbar.tsx` `gap-16`, 높이 97px, `public-shell.tsx` `pt-header-mobile md:pt-header`, `globals.css` `--spacing-header-mobile: 112px`. `--spacing-header` 사용처는 `public-shell.tsx` 한 곳뿐(grep)이라 다른 페이지 시작 위치 변화 없음. 320px 링크 6개 한 줄 수용은 `max-[359px]:gap-8 text-xs`로 대응했으나 실측 필요(T09) |
| F2 공개 카테고리 탭 행간 | 충족 | 공용 `category-tabs.tsx`: 모바일 `min-h-44`, `gap-y-4`(md `gap-y-8`), 활성 `aria-current` 유지 |
| F3 하단 링크와 이전/다음 | 충족 | 하단 "blog 목록으로" 제거, `nav aria-label="이전·다음 글"`, 제목+방향어, `encodeURIComponent`, `prefetch={false}`, 이웃 조회는 slug/title만 최대 2쿼리(`getPostNeighbors`), 비교 키 `(published_at, slug)` 튜플이 목록 정렬 `desc, desc`와 일치. 같은 날짜 3개 이상 테스트는 T09 |
| F4 admin 영어화 | 충족 | 탭 라벨 6개, 목록 5화면 h1·metadata, resume 안내 링크 `profile`, 하위 화면 한글 유지, `aria-label="관리자"` 변경 없음. e2e/단위 테스트에 탭 라벨 단언은 현재 없음(grep) |
| F5 admin 카테고리 탭 | 충족 | `?category=` 공용 `normalizeCategoryParam`, `CategoryTabs` 공유, Pagination `query` 유지, 필터 시 "{카테고리} 카테고리 총 N개 중 a-b번째", 빈 결과 "이 카테고리에 글이 없습니다." + 전체 보기. 집계 갱신은 `revalidatePath("/", "layout")`(posts 생성/수정/삭제 라우트)와 동적 페이지로 보장 |
| F6 공개 여부 삭제 | 부분 | UI/API 입력/서비스/frontmatter/스크립트/타입/테스트 정리 완료, `published` 의미 잔존 참조 없음(grep: frontmatter `unpublished` 판정과 경고 문구뿐). **마이그레이션 SQL 미생성(CR1-H1)**. 7-4 경고 토스트는 `warning` 톤으로 구현, `published` 키 없음/true면 일반 성공 |
| F7 작성/미리보기 탭 | 부분 | `role=tablist/tab/tabpanel`, `aria-selected/controls/labelledby`, roving `tabIndex`, 좌우/Home/End 자동 활성화, textarea 비언마운트, 이미지 삽입 버튼은 tablist 밖, 미리보기 중 업로드 완료 시 포커스 이동 안 함, `aria-pressed` 제거. 단 **미리보기 상태에서 본문 오류 포커스 실패(CR1-M1)** |
| F8 글자 수 | 충족 | `value.length.toLocaleString("ko-KR")` / `maxLength.toLocaleString`, `POST_CONTENT_MAX`를 `blog-form`이 전달, hint 제거, `describedBy(id, undefined, error)`, 초과 시 숫자 유지+`text-danger`, 다른 폼 counter 변경 없음 |
| F9 토스트 | 충족 | 아래 3절. `FormStatus` 삭제, `FormActionBar`에서 `notice`/`detailed` 제거, 5개 폼 전수 확인(profile/project/talk/resume/blog), `initialSaved`/`initialMessage`/`?saved`/`?deleted` 전수 제거(grep 0건), 의존성 추가 없음 |
| F10 모달 통일 | 부분 | `window.confirm/alert/prompt` 및 전역 호출 `src/` 전수 grep 0건. `ConfirmDialog` 기본값 유지+props 확장, 이탈(`LeaveDialog`), slug 확인(project/talk, 검증보다 먼저), .md 덮어쓰기 구현. 뒤로가기 경로는 동작하나 방향 가정 한계(CR1-M2, CR1-L1) |
| F11 저장 후 이동 유지 | 충족 | 생성 후 `router.push`, 편집 중 저장은 제자리, 삭제는 토스트 후 목록 이동, 새 이동 로직 없음. 토스트는 provider가 `(console)` 레이아웃에 있어 이동 후 유지 |

6절 Bug Team 기준의 추가 항목, 4절 비기능은 아래 3~4절에 정리한다.

## 3. 확인 결과 기록

### 3.1 결과 피드백 위치 (design-spec 3절, requirements 6절, Bug Team 포스트모텀 기준)

정적 확인 결과: 충족(실측은 T09 QA).

- 위치: `toast-provider.tsx:200-203`의 영역이 `fixed inset-x-16 bottom-96 z-40`(md 이상 `md:right-24 md:left-auto md:max-w-480`)이라 뷰포트 고정이다. 본문이 3,000줄이어도 스크롤 위치와 무관하게 하단에 보인다(design-spec 확인항목 a 충족).
- 저장바와의 관계: `FormActionBar`는 `sticky bottom-0`, 한 줄 높이 약 77px(`py-16` 32 + 버튼 `min-h-44` + 보더 1)이고 토스트 하단 오프셋이 96px이라 한 줄일 때 약 19px 간격으로 버튼을 가리지 않는다. 두 줄(업로드 중 `busyMessage` 줄바꿈) 시 버튼 행은 하단에서 약 16~60px 구간이라 여전히 토스트(96px 위) 아래에 있다. 단 둘째 줄의 `busyMessage` 텍스트가 토스트와 겹칠 수 있다(상태 문구만이고 버튼은 아님). 계산 근거는 design-spec과 같고 실측하지 않았다.
- `FormActionBar`에서 "저장됨/저장 실패" 요약이 제거돼 성공 토스트가 단독 표시된다(확인항목 d 충족).
- 375px 저장 직후 가시성(확인항목 b), 320px 업로드 중 줄바꿈 바(확인항목 c)는 코드 계산상 충족하나 브라우저 실측이 필요해 T09 QA 항목으로 남긴다.

### 3.2 이탈 확인 훅 `use-leave-confirm.ts`

| 항목 | 판정 | 비고 |
| --- | --- | --- |
| 링크 재클릭 방식 | 대체로 정확 | 캡처 단계 `document` 리스너가 `preventDefault`+`stopImmediatePropagation`으로 `Link`의 `onClick` 도달을 막고, 확인 시 `bypassClickRef`를 켠 채 같은 앵커를 `click()`해 Next `Link` onClick(라우터)과 일반 이동을 모두 처리한다. 수정키/`target=_blank`/`download`/`#`은 현재 가드 조건 유지. 이미 모달이 열려 있으면 추가 클릭 무시(`pendingRef`). 앵커가 DOM에서 사라지면 무동작(`isConnected`). `click()`은 동기라 `try/finally`로 우회 플래그가 안전하게 복구됨 |
| popstate 가로채기 | 부분 | `window` 캡처 + `stopImmediatePropagation`으로 Next 라우터 리스너(버블)보다 먼저 실행되는 구조는 현행 DOM 사양에서 타깃 단계 캡처 우선이라 맞지만 브라우저별 순서는 Chromium 외 미검증(추정). 방향 가정 한계 CR1-M2, 연속 입력 CR1-L1 |
| beforeunload 우회 플래그 | 대체로 정확 | `leavingRef`는 링크 확인(타이머 0), 뒤로가기 확인(타이머 1000ms), `SortableList` 새로고침 버튼(해제 없음, 직후 reload라 무해)에서만 켜진다. 일반 `<a>` 전체 이동의 타이밍 의존 CR1-L2 |
| 경합 | Low 수준 | 모달이 열린 동안 추가 클릭/뒤로가기는 `pendingRef`로 무시. 뒤로가기 확인 직후 1초 내 `bypassPopRef` 만료 타이머가 일부 경로에서 남을 수 있으나 영향 작음 |

`useLeaveConfirm(dirty)`는 `useAdminForm`에서 popstate 보호 없이(`guardBack` 기본 false) 쓰여 requirements F10-6(폼 뒤로가기 보호 추가 안 함)을 지킨다.

### 3.3 토스트 `toast-provider.tsx`

- 타이머: 성공 6초(`SUCCESS_VISIBLE_MS`), 호버/포커스 중 일시정지, 해제 시 처음부터 재시작(설계와 일치). 오류/경고는 타이머 없음.
- 일시정지: `onFocus`/`onBlur`는 React의 버블링 focus 이벤트라 내부 요소 간 이동에서도 동작. 내부 버튼 사이 이동 시 blur->focus 사이 한 틱 타이머가 재설정될 수 있으나 무해.
- 중복: `sameNotice`(tone/message/signOut/action label/link) 비교 후 `renderKey` 갱신(재낭독). CR1-L3 참고. `action.onClick`은 비교에서 제외(의도적이며 문제 없음).
- 상한: 최대 3개, 초과 시 가장 오래된 성공부터 제거, 성공이 없으면 가장 오래된 알림. 오류만 3개 쌓인 상태에서 새 오류가 오면 가장 오래된 오류가 사라져 행동 링크가 붙은 오류가 밀려날 수 있으나 설계 4.5와 일치.
- 라우트 이동 후 유지: provider가 `AdminConsoleShell`에서 `main`을 감싸고 `(console)` 레이아웃이 렌더하므로 `router.push/replace` 후에도 상태 유지. 토스트를 이동 전에 먼저 띄우는 순서(`use-admin-form.ts:187`, 각 폼 `remove()`)도 확인.
- 그룹 정리: 제출 시작 시 `clearGroup`, 성공 알림 시 같은 그룹의 이전 오류/경고 제거(`notify`), `SortableList`도 `move`/`saveOrder`에서 `clearGroup`. 설계와 일치.
- role/aria: 오류 `role="alert"`, 성공/경고 `role="status"`, 닫기 버튼 `aria-label="알림 닫기"`, 컨테이너 `section aria-label="알림"`, 접두어 `완료:/주의:/오류:` 유지, Esc로 닫기+포커스 이동. 알림 영역이 항상 마운트돼 빈 landmark로 노출되는 점은 설계 4.1 그대로. 상태 영역에 내용이 마운트와 동시에 삽입되면 일부 스크린리더가 낭독하지 않을 수 있다는 일반 지식이 있어 `role="status"` 성공 토스트의 낭독 보장은 T09/수동 확인 대상(추정, 낮은 위험).
- 포커스: 토스트 표시 시 포커스를 가로채지 않음. 검증 실패 `focusTick` 유지(단 CR1-M1 예외).
- 모달과의 관계: `showModal` 모달은 top layer라 토스트가 모달 뒤에 가려지지만, 모달 확인 동작들은 모달을 닫은 뒤 결과가 나오거나(`slug` 저장, 덮어쓰기) 모달 안에 오류를 두므로(삭제 실패) 결과가 가려지는 경로는 보이지 않음.

### 3.4 주석 규칙, 식별자 인용

- 이번 사이클 한정 식별자(F1~F11, 7-4, 요구사항/리뷰/BUG ID, design-spec 절 번호) 주석 인용: 변경된 src/scripts 라인 전체 grep 결과 0건. 통과.
- em-dash: 추가 라인 grep 0건. 통과.
- 명사형 종결/한 줄 한 문장: `scripts/check-comment-line-breaks.mjs`로 변경 파일 전체 검사 위반 없음. 통과. 단 `toast-provider.tsx`의 `// 같은 내용이 다시 들어오면 갱신해 다시 낭독하고 소멸 타이머를 처음부터 시작`은 명사형으로 끝나지 않지만("시작"), 검사기가 허용하는 형태다.
- Tailwind: canonical 위반 없음(spacing 토큰 `gap-16`, `bottom-96`, `max-w-480`, `min-h-44`, `rounded-md`, `shadow` 인라인 없음). 새 토큰 `--spacing-header-mobile`은 `@theme`에 정의. `max-[359px]:` 변형은 임의값이 필요한 브레이크포인트로 허용 범위. `text-danger`는 글자 수 초과 오류 지시라 tailwind.md 5번 의미 범위 안.
- 테스트 파일: 신규 테스트는 없고 수정된 두 테스트(`blog-schema`, `blog-frontmatter`)는 실제 소스를 import한다(가짜 테스트 패턴 없음).

## 4. 기타 확인 사항

- 3-3 CSRF: 이번 diff에 Route Handler 변경 없음.
- 3-4 동시성: 이번 diff에 read-then-write 신규 없음.
- 3-5 props 전달: `BlogForm`->`MarkdownEditor`의 `maxLength`(필수 prop), `FieldShell.counterOver`는 `MarkdownEditor`만 사용, `LeaveDialog`는 5개 폼+`SortableList` 모두에 렌더 확인(profile, project, talk, resume, blog, sortable). 누락 호출부 없음.
- 3-6 사용자 노출 메시지: 필터 시 "총 N개 중 a-b번째"로 전체와의 관계 명시됨.
- 3-8 다중 출처 배열: 해당 없음.
- 3-10 데이터 변경 후 화면 갱신: 이번 사이클에 Route Handler 신규/변경 없음. 기존 posts 생성/수정/삭제 라우트와 정렬 라우트가 `revalidatePath("/", "layout")`를 호출하고 있어 대칭성 문제 없음.
- 3-12 비즈니스 규칙 상수: `normalizeCategoryParam`을 공개/admin이 공유(복제 없음). 카테고리 길이 상한 `POST_LABEL_MAX`는 한 곳에서 import. 후속 항목 없음.
- 3-13 `UiRadioItem`: 해당 없음.
- admin `CategoryTabs`가 `prefetch`를 지정하지 않는다(공개는 동적 렌더링 이탈 시 중단 스트림 오류를 피하려 `false`). admin 목록도 동적이라 같은 증상이 가능하나, admin `Pagination`도 기존에 `prefetch` 미지정이라 기존 관행과 일치하며 영향은 admin 한 명뿐이다. 후속 검토 항목으로만 적는다(추정).
- 6절 5번(포스트모텀 미반영 항목): `FormStatus` 삭제와 `FormActionBar`의 `notice` 제거로 `feature/admin-form-feedback-guard`의 lint 불변식이 성립하지 않게 됨. 요약(summary)에 기록해 해당 브랜치에서 토스트 기준으로 재정의하도록 orchestrator가 전달해야 한다.
- 테스트 부재는 Task 계약상 finding으로 올리지 않았다. 기존 e2e fixture는 `published` 제거에 맞게 갱신됐고 vitest/harness 테스트는 통과한다.

## CodeRabbit 교차검토

- 실행 명령: `coderabbit review --agent --base main --committed` (인증됨, 무료 CLI 허용량으로 실행, `review_completed`)
- 결과: CodeRabbit 1건 중 1건 타당.

### 타당 판정 항목

| 위치 | 요약 | 심각도 | 자체리뷰 중복 |
| --- | --- | --- | --- |
| `src/components/admin/markdown-editor.tsx:234-239` | 본문 오류 시 작성 탭으로 전환해야 함(미리보기 탭이면 `useAdminForm`의 `focusTick`이 숨은 textarea에 포커스 못 줌). 직접 파일을 열어 `hidden` 패널과 `focusTick` effect 동작을 확인해 사실로 판정 | Medium (CR1-M1) | 자체 리뷰에서는 놓쳤고 CodeRabbit에서 발견 |

제안 diff의 `useEffect`는 방향이 맞지만 포커스 effect(`use-admin-form.ts`의 `focusTick` effect)와 실행 순서가 문제될 수 있어 위 수정 방향에 순서 확인을 포함했다.

### 기각 항목

없음.

## 5. 최종 판정과 재작업 목록

판정: **재작업**

1. CR1-H1 (High): `drizzle/0004_*.sql` 생성 또는 보류 사유 기록, 빌드 자동 마이그레이션과 5.2/5.3 게이트 충돌은 orchestrator가 사용자에게 보고 후 결정.
2. CR1-M1 (Medium): 본문 오류 시 작성 탭 전환과 포커스 이동 순서 보장.
3. CR1-M2 (Medium, 추정): 뒤로가기 방향 가정 한계를 해소하거나 7-6에 따라 orchestrator에 보고.
4. CR1-L1~L4 (Low): 재작업 범위에 포함할지 orchestrator가 판단. L4(구현 문서)는 T05/T06 산출 보완.

T09 QA 몫으로 넘길 항목: 375/320px 토스트와 저장바 비겹침 실측, Firefox/Safari에서의 이탈 모달 링크/popstate 동작, 이웃 글 정렬(같은 날짜 3개 이상) 테스트, `window.confirm` 재발 방지 lint 테스트(7-7), 토스트 타이머/일시정지 단위 테스트.
