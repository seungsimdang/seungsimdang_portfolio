# code-review-3: 사이클 전체 최종 리뷰

사이클 전체 최종 리뷰. 범위 `git diff 6aee747..00e738b` (구현 ec4d3f2·754a208, 재작업 5555433·00e738b), 브랜치 `feature/admin-blog-ux`.

## 판정: 통과 (배포 승인)

Critical·High·Medium 없음. Low 1건, Info 2건. 이전 리뷰의 기각 항목(CR1-H1, CR1-L3, CR1-L4, CR2-M1)은 재론하지 않았다.

## 자동 검사 (직접 실행)

| 검사 | 결과 |
| --- | --- |
| `npx tsc --noEmit` | 오류 0 |
| `npx vitest run` | 28 파일 393 테스트 통과 |
| `npx biome check` | 183 파일, 수정 사항 없음 |
| `npx knip` | 출력 없음 (미사용 export·의존성 없음) |
| `npm run harness:test` | 6 파일 43 테스트 통과 |

## F1~F11 수용 기준 충족 표

| 기능 | 판정 | 근거 (파일:줄) |
| --- | --- | --- |
| F1 Navbar 모바일 간격 | 충족 | `navbar.tsx:33` gap-8 -> gap-16, `public-shell.tsx:11` `pt-header-mobile md:pt-header`, `globals.css:19-20` 112px. `--spacing-header`/`pt-header` 사용처는 `public-shell.tsx` 하나뿐이라 다른 페이지 시작 위치 변화 없음. md 이상 클래스 불변. 320~390px 실측은 T09 |
| F2 공개 카테고리 탭 행간 | 충족 | `category-tabs.tsx:13-14,34` 모바일 `min-h-44` + `gap-y-4`, md 이상 `gap-y-8`, `md:min-h-0`로 데스크톱 불변. 활성 표시·`aria-current` 유지 |
| F3 하단 링크·이전/다음 | 충족 | 하단 "blog 목록으로" 제거, `blog/[slug]/page.tsx` `nav aria-label="이전·다음 글"`, 링크 이름에 방향어+제목, `prefetch={false}`, `encodeURIComponent`. `blog-service.ts` `getPostNeighbors`가 `(published_at, slug)` 튜플 비교로 목록 정렬과 동일 키, 이웃당 `slug,title`만 조회, 쿼리 2개. 글 변경 시 `revalidatePath("/", "layout")`가 모든 posts 라우트에 있어 이웃 상세 캐시도 갱신됨 |
| F4 admin 영어화 | 충족 | `admin-nav.tsx` 5개 + `sign-out-button.tsx` `logout`, 목록 5개 화면 h1·metadata, resume 안내 링크 `profile`. 하위 화면 제목·`aria-label` 불변, 활성 로직 불변 |
| F5 admin 카테고리 탭 | 충족 | `admin/(console)/blog/page.tsx` `CategoryTabs` 공용 컴포넌트, `normalizeCategoryParam` 한 곳 공유, Pagination `query={{category}}`, 필터 건수 문구("N 카테고리 총 N개 중"), 빈 결과 + "전체 보기". 페이지가 `requireAdminPage`로 동적이라 집계 캐시 없음 |
| F6 공개 여부 삭제 | 충족 (DB는 의도된 후속) | UI·스키마·서비스·`PostSummary`·frontmatter에서 `published` 제거, 저장소 grep(`-w published`) 잔존은 테스트 단언 1건, `unpublished` 경고용 필드, 안내 문구뿐. `blog.schema.ts` strictObject로 `published` 400. `db/schema/portfolio.ts` 컬럼 제거 반영, `drizzle/0004`는 triage-1 CR1-H1 판정대로 B 단계 |
| F7 에디터 탭 | 충족 | `markdown-editor.tsx` `tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`, roving `tabIndex`, 방향키(선택=이동)·Home/End, textarea는 `hidden`만 하고 언마운트 안 함, "이미지 삽입"은 tablist 밖, 미리보기 탭에서 업로드 완료 시 포커스 안 옮김(`tabRef`), `aria-pressed` 제거 |
| F8 글자 수 | 충족 | `markdown-editor.tsx:183` `toLocaleString("ko-KR")` `현재 / 상한자`, 상한은 `BlogForm`이 `POST_CONTENT_MAX` 전달, hint 제거, `describedBy(id, undefined, error)`, 초과해도 입력은 안 막고 `counterOver`로 표시. 호출부는 `BlogForm` 하나 |
| F9 토스트 | 충족 | `toast-provider.tsx` 단일 영역, 성공 `status` 6초 소멸 + 닫기 + hover/focus 일시정지, 오류 `alert` 유지, 행동 링크·버튼, 최대 3개, 포커스 가로채지 않음, 애니메이션 없음. `useAdminForm`이 notice 상태를 들지 않고 `notify`. `FormStatus` 삭제, `FormActionBar`의 `notice`/`detailed` 제거, 5개 폼 전수 정리. `?saved`/`?deleted` 쿼리와 `initialSaved`/`initialMessage` 전부 제거(grep 0건), 삭제·생성 토스트는 이동 전에 띄우고 provider가 `AdminConsoleShell`에 있어 라우트 이동 후에도 유지 |
| F10 모달 통일 | 충족 | `src/` 전체 `window.confirm/alert/prompt` 0건(`confirm(` 매치는 `confirm-dialog.tsx`의 내부 함수명뿐). `ConfirmDialog` props 일반화(기본값=삭제 동작), `LeaveDialog`, slug 변경(project·talk)·.md 덮어쓰기 모달, popstate는 Navigation API `navigate` 이벤트 취소 + `traverseTo(key)`. CR1-M2·L1·L2, CR2-L2·L3 해결 확인 |
| F11 저장 후 이동 | 충족 | 편집 중 저장은 같은 화면, 생성은 `router.push` 편집 화면, 삭제는 목록, 모두 토스트. 새 이동 로직 없음 |

## 재작업 간 상호작용 확인

- 이탈 확인 훅 x 토스트: 토스트의 "다시 로그인"·"목록으로" 링크도 문서 클릭 가로채기 대상이라 미저장 상태에서 모달이 뜬다. 입력이 남아 있으니 올바른 동작이다. `새로고침` 행동은 `leavingRef`를 세운 뒤 reload하므로 기본 창이 한 번 더 뜨지 않는다.
- 이탈 확인 훅 x use-admin-form: 생성 후 `router.push`와 slug 변경 후 `router.replace`는 클릭도 `traverse`도 아니라 가로채이지 않는다. 저장 직후 baseline이 갱신되어 dirty가 풀린다. 삭제도 같다.
- 이탈 확인 훅 x 에디터 탭: 탭 전환은 `button`이라 가로채기 대상이 아니다. 탭 전환·업로드 중에도 dirty 판정은 draft 기준이라 영향 없다.
- 에디터 탭 x use-admin-form(CR2-L1 재작업): `focusTick` prop으로 오류가 남은 채 재저장해도 렌더 중에 작성 탭으로 복귀하고, 같은 커밋에서 부모 effect가 보이는 textarea를 찾는다. `serverErrors`/`submitted`/`focusTick` 갱신이 같은 배치라 `error`가 비어 있는 틈은 없다.
- 토스트 x 모달: 토스트는 일반 레이어(`z-40`), `dialog.showModal()`은 top layer라 포커스 흐름이 깨지지 않는다.
- 토스트 그룹: 성공 시 같은 폼의 이전 오류·경고만 치우고, 성공끼리는 서로 유지한다. `useId` 그룹이 폼 인스턴스별이라 생성 후 이동한 새 폼에서 이전 성공 토스트를 지우지 않는다.

## 결과 피드백 위치 (Bug Team 기준 확인)

- 토스트는 `fixed bottom-96`(`toast-provider.tsx` section), `FormActionBar`는 `sticky bottom-0`에 한 줄일 때 높이 약 77px(py-16 x 2 + 버튼 44 + 테두리). 한 줄 레이아웃에서는 19px 여유로 겹치지 않는다.
- 뷰포트 고정이라 본문이 길어도 스크롤 없이 보인다. 단, 아래 CR3-L1처럼 액션 바가 두 줄이 되는 좁은 폭 조합은 겹칠 수 있다(추정). 375px 실측은 T09.
- `FormStatus` 삭제로 `feature/admin-form-feedback-guard`의 lint 불변식("`FormStatus` 사용 파일은 `FormActionBar`에 `notice` 전달")은 더 이상 성립하지 않는다. 해당 브랜치에서 토스트 기준으로 재정의 필요(후속 항목).

## 주석 규칙 확인

사이클 diff의 추가 라인(`src/`, `scripts/`, `__tests__/`, `tests/`)에 대해 em-dash 0건, 사이클 식별자(CR/F번호/T번호/요청 번호/산출물 파일명) 인용 0건. 신규 주석을 직접 읽었고 명사형·비종결 구절로 끝나며 한 줄 한 문장이다. `harness:test`의 `source-rules`가 통과한다.

## Findings

### CR3-L1 (Low, 추정) 좁은 폭에서 액션 바가 두 줄이 되면 토스트가 저장 버튼 행을 가림

- 위치: `src/components/admin/toast-provider.tsx` section `bottom-96`, `src/components/admin/form-parts.tsx:25` (`flex flex-wrap`, 업로드 중 `busyMessage` + `ml-auto` 삭제 버튼)
- 근거: 블로그 편집 화면(삭제 버튼 있음)에서 375px 폭에 "이미지 업로드 중..." 문구가 나타나면 저장·취소·문구·삭제 버튼이 두 줄로 줄바꿈될 수 있다. 그러면 액션 바 높이가 약 129px로 `bottom-96`을 넘어, 떠 있는 토스트가 위쪽 줄(저장·취소)을 덮는다. 요구사항 F9-12·6절 2번(저장 영역과 겹치지 않음)의 좁은 폭 예외다. 발생 조건이 업로드 중이면서 토스트가 떠 있는 경우로 좁다.
- 방향: 실측(T09 375px)으로 확인. 겹치면 토스트 하단 오프셋을 액션 바 높이에 맞추거나(CSS 변수), 업로드 문구를 다음 줄이 아닌 버튼 안으로 두는 방식을 검토. 사용자 결정 대상.

### CR3-I1 (Info) slug 변경 모달의 `busyLabel`이 표시되지 않음

- 위치: `project-form.tsx`, `talk-form.tsx`의 slug 변경 `ConfirmDialog` (`onConfirm`이 `void form.submit()` 후 즉시 `null` 반환)
- 근거: 모달이 저장 시작과 동시에 닫히므로 `busyLabel="저장 중..."`은 노출되지 않는다. 저장 중 표시는 `FormActionBar`의 "저장 중..."이 담당하고 requirements F10-7("모달이 닫히고 저장이 진행")과 일치한다. 동작 결함이 아니라 죽은 prop 값이며, 결과는 토스트로 보인다. 조치 불필요.

### CR3-I2 (Info) 브라우저 런타임 동작은 정적 검토 범위 밖

- Navigation API `traverseTo`/`navigate` 취소, 확인 후 일반 `<a>` 문서 이동에서 `beforeunload` 기본 창 미표시(`proceed`가 클릭 직후 `endLeaving` 호출)는 코드 논리로만 확인했다. 실제 브라우저 동작은 추정이며 T09 E2E에서 확인 필요(CR2-M1 판정에 따라 지원 범위는 재론하지 않음).

## 후속 항목 (이번 사이클 결함 아님)

1. B 단계: `drizzle/0004`(컬럼 삭제 + `posts_list_idx` 재정의)는 A 배포 후 별도 커밋, `main` 병합 직전 `published=false` 0건 재확인과 사용자 승인(triage-1).
2. `feature/admin-form-feedback-guard`: `FormStatus` 불변식을 토스트 기준으로 재정의.
3. T09: `window.confirm/alert/prompt` 금지 lint 테스트 작성(requirements 7-7), 토스트 소멸·유지·일시정지 타이머 테스트, 이전/다음 정렬 테스트, 320/375/390px 실측.

## CodeRabbit 교차검토

- 실행 명령: `coderabbit review --agent --base develop --committed` (사이클 시작 브랜치 기준이 `develop`이고 `main`과 차이가 이전 사이클 포함이라 `develop`을 base로 사용. 병합 기준점 8bd8030, 8커밋)
- 상태: 완료(free CLI allowance), findings 0건, 48개 파일 검토.
- 타당 판정 항목: 없음
- 기각 항목: 없음

CodeRabbit 0건 중 0건 타당.
