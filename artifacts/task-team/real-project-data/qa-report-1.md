# qa-report-1: real-project-data QA (T09)

- 대상: feature/real-project-data, HEAD 74e4ed0
- 신규 테스트: `tests/e2e/real-project-data.spec.ts` (id 목록, title, talks는 `src/constants/portfolio-data.ts`에서 import, 로직 재구현 없음, 제목 한국어)
- 소스(src/) 수정 없음, 커밋 없음

## 실행 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm build` | 통과 (`/work/[id]` 5개 SSG) |
| `pnpm type-check` | 통과 |
| `pnpm exec vitest run` | 5 파일 21 테스트 통과 |
| `vitest run -c __tests__/lint/vitest.lint.config.ts` (한국어 제목 규칙 포함) | 5 파일 21 테스트 통과 |
| `pnpm exec biome check` | 42 파일, 오류 없음 |
| `pnpm exec knip` | 출력 없음, rc=0 |
| `pnpm exec playwright test` | 58 통과 / 0 실패 (desktop+mobile, 기존 6종 + 신규 23종 x 2) |

참고: 신규 spec 초안에서 h2 개수 단언이 실패했으나(하단 CTA h2 "Let's work together" 1개를 빠뜨린 테스트 오류), 테스트를 고쳐 해결. 소스 결함 아님.

## 신규 e2e 커버리지

- `/work/{id}` 5개: 200, h1 = title, 경험 제목 h2 전부 표시(경험 수 + CTA 1), title `{title} | 이승현`, canonical 경로
- `/work/unknown`, `/work/kbhc`: 404 + "oops…"
- `/`, `/projects`: `main a[href^='/work/']`가 projects 순서대로 정확히 5개. 카드 클릭 이동
- 외부 링크(`a[href^=http]`): `/work/globber`, `/blog`, `/contact`, `/` 에서 전부 `_blank` + noopener + noreferrer
- `/blog`, `/` : talks 2건 표시(article 수 = techTalks 수), 제목·링크 일치
- `/`, `/projects`, `/about`, `/blog`, `/contact`: title과 canonical 경로가 페이지별로 다름(홈 canonical 상속 회귀 방지)
- CR3-F1 해소됨

## 수용 기준 대조

| 기준 | 판정 | 근거 |
| --- | --- | --- |
| `/work/{5개}` 200, h1 = title | 통과 | e2e |
| 홈·projects 모든 카드가 5개 상세로 이동 | 통과 | e2e (순서·개수·클릭) |
| experience 개수(SEMT 3, Globber/Endo Report 2, DPM/Endo Admin 1) 전부 표시 | 통과 | e2e가 data의 experiences 전체를 h2로 단언 |
| `/work/unknown`, `/work/kbhc` 404 | 통과 | e2e |
| 빈 rationale 숨김 | 부분 검증 | 스크린샷으로 Globber/semt 확인, Endo Report 빈 rationale은 전용 단언 없음(코드 `TextRow`/`TradeoffRow`의 trim 필터) |
| `\n`, "- " 줄바꿈 보존 | 통과(시각) | `whitespace-pre-line`, about/work 스크린샷에서 줄바꿈 확인. 자동 단언 없음 |
| 모바일 긴 문단 가로 넘침 없음 | 통과 | 7경로 x 4폭 scrollWidth == clientWidth, 넘치는 요소 0 |
| 외부 링크 새 탭 + rel | 통과 | e2e |
| hero skills 순환, 가짜 문구 제거 | 통과 | 기존 순환 e2e(React -> Vue 3 -> TypeScript), 홈 스크린샷 |
| about skills 9개, 통계/경력 없음 | 통과(시각) | about 스크린샷 9칸 |
| contact mailto/GitHub 새 탭, 폼 없음 | 통과 | 기존 e2e + 외부 링크 e2e |
| talks 2건, 명칭 통일, `/blog` 유지 | 통과 | e2e |
| `<html lang="ko">`, canonical, title | 통과 | title/canonical e2e. lang 속성은 자동 단언 없음(미검증, 코드 리뷰 확인에 의존) |
| Navbar `/work/*` projects 활성 | 미검증 | 전용 단언 없음(work 스크린샷에서 projects 강조 확인) |
| 11장 R6: 기존 섹션 spacing 변경 전후 동일 | 미검증(의도된 변화 있음) | 3ace956 리셋 제거로 버튼·navbar·카드 여백이 의도적으로 바뀌어 전후 computed style 비교는 무의미. 신규 코드의 1px 스케일은 code-review-3이 확인, 화면 점검으로 대체 |
| unit 테스트(vitest) | 해당 없음 | 이번 변경은 정적 데이터와 서버 컴포넌트라 e2e로 검증 |

## 화면 확인 (qa-screens/, 7경로 x 4폭 = 28장, 전체 페이지)

- 자동 점검: 28장 모두 가로 넘침 없음, 겹치는 요소 없음, padding 0인 버튼/링크 없음.
- 육안(대표 샘플 about-1440, contact-390, blog-810, work-globber-1440, home-390/1440): 잘린 텍스트·겹침·가로 넘침 없음.
- 전역 리셋 제거 효과: 버튼(`Get in touch`, `visit talks`, `visit project`)은 pill 형태로 적절한 padding, navbar 링크 간격 자연스러움, about stack 칸과 contact 카드 padding 자연스러움. 의도된 변화가 화면에서 자연스럽다고 판단.
- 어색할 수 있는 점(결함 아님, 참고):
  1. 모바일 홈 hero: eyebrow와 tagline은 가운데 정렬, h1(skills 단어)만 왼쪽 정렬이라 정렬이 섞임. 데스크톱은 모두 왼쪽 정렬.
  2. 큰 세로 여백: about의 hello와 stack 사이, 홈 hero 하단에서 첫 카드까지, `/work/*` 경험 섹션 사이가 크다(`section-spacing`). 의도된 여백으로 보이나 모바일 about은 길어 보임.
  3. 단색 카드(DPM Core 등)는 390 폭에서 90vh 높이에 텍스트가 하단에만 있어 상단이 넓은 빈 면. 디자인 의도(단색 배경)로 판단.
  4. Globber 카드 모바일은 object-cover로 가로 이미지가 세로로 크게 잘림. 로고 일부가 잘려 보임.

## 발견한 결함

- 차단/기능 결함 없음.
- 개선 제안(Low, 선택): 위 1번 정렬 일관성.

## 추가·수정한 테스트 파일

- 추가: `tests/e2e/real-project-data.spec.ts`
- 기존 `tests/e2e/navigation.spec.ts`는 수정 없이 통과

## 판정

통과. 미검증: `lang="ko"` 단언, Navbar work 활성 단언, Endo Report 빈 rationale 전용 단언, R6 전후 computed style 비교(의도된 변화로 대체).
