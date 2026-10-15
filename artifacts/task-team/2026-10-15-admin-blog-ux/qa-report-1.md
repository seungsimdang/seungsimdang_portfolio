# QA 리포트 1: admin·블로그 UX 개선

- 브랜치: feature/admin-blog-ux (HEAD ef7d8ef), 커밋하지 않음
- 판정: 통과 항목은 모두 통과. 미검증 항목이 있어 admin 화면은 사용자 수동 확인 필요

## 전체 검증 결과 (실제 실행)

| 명령 | 결과 |
| --- | --- |
| `pnpm type-check` | 통과 |
| `pnpm exec vitest run` | 30 파일, 406 테스트 통과 |
| `pnpm check` | 통과 (186 파일) |
| `pnpm knip` | 통과 (출력 없음) |
| `pnpm harness:test` | 7 파일, 45 테스트 통과 |
| `pnpm test:e2e:local` | 최종 64 통과 (desktop/mobile). 로그 `destination stream closed early` 0건 |

e2e 1차 실행에서 신규 spec 1건이 실패했다(desktop/mobile 각 1). 원인은 코드 결함이 아니라 E2E 전용 DB에 픽스처에 없는 옛 행(`2024-12-30-fixture-draft`, 제목 "비공개 글")이 남아 있기 때문이다. seed가 "posts 이미 존재 시 건너뜀"이라 갱신되지 않는다. 공개 여부 삭제 후에는 이 행이 공개 목록에 나오는 것이 의도된 동작이다. DB를 건드리지 않고, DB 상태에 의존하는 "가장 오래된 글은 이전 글 없음" 단언을 spec에서 뺐다(미검증으로 분류).

## 추가·수정한 테스트와 import 대상

| 파일 | import하는 실제 소스 | 내용 |
| --- | --- | --- |
| `__tests__/lint/no-window-dialogs.test.ts` (신규) | 파일시스템으로 `src/**/*.ts(x)` 전수(테스트 파일 제외) 스캔 | `window/globalThis/self.confirm|alert|prompt(` 및 전역 직접 호출 금지. 감지 정규식 자체의 샘플 검증 포함 |
| `__tests__/utils/blog-category-param.test.ts` (신규) | `normalizeCategoryParam` (`@/services/blog/blog-service`), `POST_LABEL_MAX` (`@/constants/blog`) | 트림, NFC, 배열 첫 값, 빈 값, 상한 50자 통과/51자 필터 없음, 트림 후 길이 기준 |
| `__tests__/utils/blog-frontmatter.test.ts` (추가 2건) | `parsePostMarkdown` (`@/lib/blog/frontmatter`) | 문자열 "false"/0/no는 `unpublished` 없음, `published: true`와 키 없음은 `unpublished` 없음 |
| `tests/e2e/blog.spec.ts` (신규) | 픽스처 `tests/e2e/fixtures/portfolio.ts`의 `posts` | 아래 e2e 절 |

기존 테스트로 이미 충족되어 중복 작성하지 않은 항목: `parsePageParam` 경계값(`blog-excerpt-page.test.ts`), 스키마의 `published` 키 거부(`blog-schema.test.ts` 143행), `published: false`는 `unpublished: true`(`blog-frontmatter.test.ts`).

`no-window-dialogs` 실패 확인: `src/lib/tmp-qa-probe.ts`에 `window.confirm(...)`을 임시로 넣고 실행해 실패(`expected ['window.confirm('] to deeply equal []`)를 확인한 뒤 파일을 삭제했다. 현재 `git status`에는 임시 파일이 없다. 현 소스에서는 통과(`async function confirm()` 선언과 메서드 호출은 제외).

## e2e (E2E DB 픽스처 기준)

`tests/e2e/blog.spec.ts`, desktop/mobile 모두 통과.

- `/blog` 200, 카테고리 탭 "전체" `aria-current="page"`, 글 3개 링크 노출
- 카테고리 "Other" 선택 시 URL `category=Other`, 해당 글만 노출, "전체"로 복귀
- 상세에 "blog 목록으로" 링크가 정확히 1개(하단 링크 없음)
- 중간 글: 이전 글 = 더 오래된 글(한글 slug 글), 다음 글 = 더 최신 글, href 인코딩 확인
- 가장 최신 글: 다음 글 링크 없음, 이전 글 링크 1개
- 이전 글 클릭 시 해당 글로 이동
- 없는 slug 404

## 빌드 산출물 CSS

`.next/static/chunks/3-5spvhm9xf4_.css`에서 확인: `.bottom-\(--admin-toast-bottom\){bottom:var(--admin-toast-bottom)}`와 `:root{...--admin-toast-bottom:calc(var(--admin-action-bar-h,80px) + 16px)}`가 모두 생성됨.

## 화면 실측 (headless chromium, 빌드 서버 포트 3101, 이후 포트로 종료)

| 폭 | Navbar 링크 줄 scrollWidth/clientWidth | 링크 줄 수 | 이름-링크 간격 | Navbar 높이 | 문서 가로 넘침 |
| --- | --- | --- | --- | --- | --- |
| 320 | 234/234 | 1 | 16px | 93px | 없음 |
| 375 | 306/306 | 1 | 16px | 97px | 없음 |
| 390 | 306/306 | 1 | 16px | 97px | 없음 |
| 1440 | 466/466 | 1 | (가로 배치) | 77px | 없음 |

- 본문 시작: 모바일 `--spacing-header-mobile` 112px가 Navbar 93-97px보다 큼. 첫 요소(h1) top은 `/` 260, `/blog` 192, 상세 240px로 Navbar 아래에 있음.
- 카테고리 탭 터치 높이: 320/375/390에서 링크 44px, 1440에서 20px(데스크톱 `md:min-h-0`, 의도된 동작). 픽스처 카테고리가 3개라 한 줄이며, 줄바꿈 시 행 간격(gap-y-4)은 실측하지 못함(미검증).
- 이전/다음 카드: 모바일은 세로 쌓임(left 24, 폭 272/327/342, 간격 약 101px 단위로 2장), 데스크톱은 가로 2열(left 120/736, 폭 584). 넘침 없음.
- 1440 Navbar 77px: 비교 기준 이전 값이 없어 회귀 여부는 레이아웃 정상(가로 배치, 넘침 없음)만 확인.

## 미검증 항목과 사유

- 토스트 provider(자동 소멸 6초, hover/focus 일시정지, 오류·warning 유지, 상한 3개, 중복 처리, 그룹 정리): 테스트 환경에 jsdom/happy-dom/@testing-library/react-test-renderer가 없다(`vitest.config.ts` environment: node). 의존성 추가 금지 지시에 따라 작성하지 못했다. 로직이 컴포넌트 내부에 있어 순수 함수로 import해 검증할 수 없다. 대안은 jsdom 도입(별도 승인 필요).
- `use-leave-confirm`의 우회 키 일치 소비, finally 해제: 같은 이유(DOM과 Navigation API 필요)로 미검증.
- `getPostNeighbors` 정렬·동일 날짜 처리: DB 쿼리라 단위 테스트 불가. e2e로 3개 글(날짜 상이)의 중간·최신 경로만 검증했다. 같은 날짜 3개 이상, 가장 오래된 글의 이전 링크 없음은 E2E DB 정리(옛 `fixture-draft` 행 삭제 또는 픽스처에 같은 날짜 글 추가 후 재시드)가 필요해 미검증.
- 공개 `/blog` 페이지네이션의 category 유지: 픽스처 3개로는 페이지가 1개뿐이라 미검증.
- admin 화면 전체(GitHub OAuth 필요, 자동 경로 없음): 아래 체크리스트.
- 운영 DB 마이그레이션 `0004` 적용: 범위 밖(별도 승인).

## 사용자 수동 확인 체크리스트 (admin)

1. 토스트 위치: 320/375px에서 저장 성공/실패 시 토스트가 하단 저장바와 겹치지 않고 저장/삭제 버튼을 가리지 않는다. 본문을 길게 입력해 맨 위로 스크롤한 상태에서 저장 실패 시 스크롤 없이 보인다.
2. 토스트 동작: 성공은 약 6초 뒤 소멸, 마우스 올림/포커스 중 유지, 오류는 닫기 전까지 유지, 닫기 버튼과 Esc, 4건 이상 연속 발생 시 3개 유지, `다시 로그인`/`목록으로` 링크와 `logout`/`새로고침` 버튼 동작.
3. 목록 `?deleted=1`, 편집 `?saved=1` 도착 토스트가 새로고침·뒤로 가기에서 반복되지 않는다.
4. 이탈 모달: 폼 수정 후 링크 클릭 시 모달, 취소 시 유지, 이동 시 목적지로 이동하며 beforeunload 창이 추가로 뜨지 않는다. SortableList 순서 변경 후 링크, 브라우저 뒤로·앞으로 모두 모달로 처리되고 취소 시 URL과 화면 유지.
5. project/talk slug 변경 확인 모달(취소 시 저장 안 됨, 확인 시 저장).
6. blog .md 가져오기: 덮어쓰기 모달(취소/덮어쓰기), `published: false` 파일에서 공개 전환 안내 토스트, 키 없음/true에서는 안내 없음.
7. 에디터 작성/미리보기 탭: 방향키·Home/End, 탭 전환 시 값·커서 보존, 오류 시 포커스 이동, 미리보기 상태에서 이미지 업로드 후 삽입.
8. 글자 수 표시 `현재 / 300,000자`(천 단위), 초과 시 숫자 유지와 필드 오류.
9. admin 블로그 카테고리 탭(필터, 페이지네이션 category 유지, 없는 카테고리 빈 상태).
10. 영어 탭 `projects/talks/blog/resume/profile/logout`과 목록 제목, 브라우저 탭 제목(`blog - admin` 등), 375px에서 탭 줄 넘침 없음.

## 변경·추가 파일

- 신규: `__tests__/lint/no-window-dialogs.test.ts`, `__tests__/utils/blog-category-param.test.ts`, `tests/e2e/blog.spec.ts`, 이 리포트
- 수정: `__tests__/utils/blog-frontmatter.test.ts`
- 구현 코드와 의존성은 변경하지 않음
