# QA Report 2 - R7 Pretendard 폰트 통일 회귀 검증

- 대상: 변경 전 40e9309 / 변경 후 b725a52 (feature/real-project-data)
- 방법: 각 커밋을 scratch worktree(`git worktree add --detach`)에서 `pnpm build` 후 프로덕션 서버로 실행(전 3101, 후 3102). Playwright(Chromium)로 7경로 x 4폭(390/810/1024/1440) 캡처 및 자동 검사. 모든 측정은 `document.fonts.ready` + 800ms 후. 서버는 포트 지정 kill, worktree는 remove 완료. src 수정/커밋 없음.
- 스크린샷: `qa-screens/font-before/`, `qa-screens/font-after/` (각 28장, fullPage, 파일명 `home|projects|about|blog|contact|work-globber|work-semt-{폭}.png`)

## 판정: 통과 (결함 0, 경미한 관찰 2건)

## 1. 자동 검사 (변경 후, 전과 구분)

| 항목 | 결과 |
| --- | --- |
| 가로 넘침 (scrollWidth > innerWidth) | 28/28 조합 모두 없음 (전/후 동일) |
| 텍스트 잘림 (overflow hidden/auto + scrollWidth > clientWidth) | 실제 잘림 0건. 검출된 것은 전부 `span.sr-only`(1px 스크린리더 전용)로 오탐이며 전에도 동일 |
| WordCycler 단어 폭 vs 컨테이너 | 가장 긴 단어 "TanStack Query": 390px 322 < 342, 810px 435 < 714, 1024px 550 < 864, 1440px 698 < 1200. 변경 전 306/409/514/652 대비 약 5~7% 증가했으나 모든 폭에서 여유 있음. 컨테이너 높이는 전/후 동일(60/81/102/130px), 단어 잘림 없음 |
| 요소 겹침 | 후 기준 1건: 홈 h1 WordCycler 내부 "Vue 3"(다음 단어 슬롯) x hero 문구 `p`. 변경 전에도 동일 겹침 크기로 존재(342x12 등)하며 WordCycler가 `overflow:hidden`으로 숨기는 대기 슬롯이라 시각적 겹침 아님. 스크린샷에서 확인. nav/카드 제목/메타 겹침은 없음 |
| e2e `navigation.spec` 단어 순환 | 통과 |

## 2. 전후 비교

페이지 전체 높이 (px, 변화가 있는 것만. 나머지 22조합은 전/후 동일):

| 경로 | 폭 | 전 | 후 | 차이 | 원인 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| /blog | 390 | 2657 | 2629 | -28 | 본문 한 줄 감소 | 자연스러운 변화 |
| /work/globber | 390 | 4494 | 4466 | -28 | 본문 한 줄 감소 | 자연스러운 변화 |
| /projects | 1440 | 6956 | 7042 | +86 | 소개 문단이 6줄에서 7줄로(Pretendard 한글 폭 증가). 카드 높이는 전/후 동일 675px | 자연스러운 변화 |

줄바꿈 수가 바뀐 heading (전 28조합의 h1/h2/h3 비교, 변화는 1건뿐):

| 경로 | 폭 | heading | 전 | 후 | 판정 |
| --- | --- | --- | --- | --- | --- |
| /projects | 1440 | h3 "SEMT 제품 관리 시스템" | 1줄 | 2줄 ("...시스" / "템") | 붕괴 아님(카드 고정 높이 안에 수용, 겹침/잘림 없음). 단 마지막 1글자 "템"이 고아로 남아 미관상 아쉬움. 아래 관찰 1 |

- "Endo Admin Dashboard": 390/1024/1440 2줄, 810 1줄로 전/후 동일 (변화 없음).
- 홈 h1("Frontend Developer: ..."), 카드 제목, 나머지 heading: 전/후 줄 수 동일.
- 직접 열어본 대표 쌍: 홈 390(hero, 변화 미미, 줄 수 동일), /projects 1440(헤더 nav 폭이 약간 좁아지고 소개 문단 줄바꿈 위치만 달라짐, 정렬 유지), /projects 390 카드 메타/캡션(정상), /projects 1440 SEMT 카드(전/후). 레이아웃 붕괴 없음.

## 3. computed font-family

7경로 x (390, 1440), `body`와 모든 하위 요소 1704개: 전부 `"Pretendard Variable", Pretendard, -apple-system, "system-ui", system-ui, sans-serif` 한 가지. 다른 font-family 지정 요소 0건. `src` 내 font-family 정의는 `globals.css`의 `var(--font-sans)` 한 곳뿐. `document.fonts`에 `Pretendard Variable` loaded 확인. 변경 전 대비 한글/영문 모두 Pretendard로 렌더링됨.

## 4. `pnpm exec playwright test`

b725a52 worktree에서 실행(기본 포트 3100): 58 passed (desktop+mobile). 로그의 `NoFallbackError`는 `/work/unknown`, `/work/kbhc` 404 케이스에서 나오는 예상된 서버 로그.

## 관찰 (결함 아님)

1. SEMT 제품 관리 시스템 제목: 한글이 글자 단위로 줄바꿈되어 "템" 한 글자가 고아로 남음(1440). 390/1024에서는 변경 전에도 이미 같은 방식으로 2줄이었다(기존 스타일 특성). 개선하려면 제목에 `word-break: keep-all` 또는 `text-wrap: balance` 검토. R7 요구(자연스러운 줄바꿈 변화 허용) 범위 내라 통과 처리.
2. 작업 트리에 `.claude/hooks/enforce-commit-msg-style.sh` 미커밋 수정이 있음. 이번 QA가 만든 변경이 아니며(시작 시 git status는 clean) 다른 세션 작업으로 보임. 건드리지 않음.

## 미검증

- Safari/Firefox 렌더링 (Chromium만 검증). 실기기 폰트 로딩 지연(FOUT) 구간의 WordCycler 순간 높이 흔들림은 `fonts.ready` 재측정 코드로 처리되나 네트워크 스로틀 조건은 별도 측정하지 않음.
