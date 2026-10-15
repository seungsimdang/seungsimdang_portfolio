# code-review-1: admin 블로그 새 글 .md 템플릿 다운로드

- 범위: `git diff 9af750d..e9b7cb5` (`src/lib/blog/post-template.ts` 신규, `src/components/admin/blog-form.tsx`)
- 기준: requirements.md(사용자 확정 우선), design-spec.md, project-structure.md, tailwind.md
- CodeRabbit: 리뷰 대상이 /private/tmp 워크트리 미커밋 상태이고 1차 리뷰이므로 이번에는 실행하지 않음 (CodeRabbit 미실행: 워크트리 비교 범위 불확실, 자체 리뷰만으로 판정)

## 확인 결과 요약

- 템플릿 원문은 `parsePostMarkdown` 기준으로 `error` 없음, `unpublished` 없음, 프론트매터 4개 키(title, date, categories, tags)와 본문(`\n## 소제목\n\n본문을 작성하세요.\n`)으로 읽힘. 안내 `#` 줄은 YAML 주석이라 본문에 남지 않음. 프론트매터 영역에 연속 하이픈 3개 없음(날짜 `2026-10-15`, `YYYY-MM-DD`는 하이픈 단일).
- 고정 파일명 `blog-post-template.md`는 `parsePostFileName` 정규식(`^\d{4}-\d{2}-\d{2}-...`)에 맞지 않아 date가 null, 제목 `blog-post-template`. 따라서 `applyImport`에서 날짜는 frontmatter `date`가 쓰이고, slug는 `slugifyPostName("{date}-{title}")`로 제안됨. frontmatter 날짜를 고치면 반영되어 왕복 손실 없음(AC3-8 충족).
- 제목을 지우면 파일명(`blog-post-template`)이 제목이 되는 함정은 예시 문구 `글 제목을 입력하세요`로 완화됨. 요구사항 edge 1과 일치.
- 폼 상태: `downloadTemplate`은 `getValues`/`reset`/`setImportedName`/`notify`를 호출하지 않고 `AdminButton` 기본 type이 button이므로 제출·dirty·LeaveDialog 영향 없음. 새 prop 없음(3-5 해당 없음).
- 날짜: `todayInSeoul()` 재사용으로 폼 기본 발행일과 동일 기준(edge 4 충족). 템플릿 로직이 `lib/blog/`의 순수 함수라 테스트에서 파서에 바로 넣을 수 있음(F5).
- 배치(코드 기준): 컨테이너는 기존 `flex flex-wrap items-center gap-12` 그대로이고 버튼 하나만 추가. 767/768px 모두 wrap으로 처리되며 고정 폭·arbitrary value 없음. Tailwind canonical 위반 없음(새 클래스 없음).
- 주석: 구현 코드 주석에 요구사항 ID·AC 번호·리뷰 ID 인용 없음. 명사형 종결(`함`, `씀`), 한 줄 한 문장, em-dash 없음. 코드가 아닌 이유(펜스 조기 종료)를 설명해 주석 내용 기준에 부합.
- CSRF·동시성·Route Handler·revalidate·서버 상한 항목은 서버 변경이 없어 해당 없음.

## Findings

### F-1 (Medium) object URL을 클릭 직후 동기 해제

- 위치: `src/components/admin/blog-form.tsx:168-177` (`anchor.click(); URL.revokeObjectURL(url);`)
- 근거: 앵커가 DOM에 붙지 않은 채 `click()` 직후 같은 틱에서 revoke한다. 현행 Chromium·Safari에서는 다운로드가 `click()` 시점에 blob을 참조해 시작되므로 대체로 동작한다. 그러나 비동기로 blob URL을 해석하는 구현에서는 revoke된 URL로 요청이 나가 다운로드가 실패하거나 0바이트가 될 수 있고, 이를 피하려고 널리 쓰이는 FileSaver.js 등은 `click()` 후 revoke를 지연시킨다(FileSaver.js는 수십 초). 이 환경(브라우저별 실제 동작)은 코드 리뷰에서 실측하지 못했으며 QA의 실브라우저 확인이 필요하다.
- 영향: 일부 브라우저·버전에서 다운로드가 조용히 실패할 수 있다. 서버 호출이 없어 사용자가 원인을 알 방법이 없다. AC2-4(사용 후 해제)는 지연 해제로도 충족된다.
- 수정안: `setTimeout(() => URL.revokeObjectURL(url), 0)` 이상(안전하게는 수 초)으로 해제를 미루고 이유를 한 줄 `//` 주석으로 남긴다. 앵커를 `document.body`에 붙였다 제거하는 방식은 선택 사항.

### F-2 (Low) 불러온 본문이 빈 줄로 시작

- 위치: `src/lib/blog/post-template.ts:20-22` (닫는 `---` 뒤 빈 줄)
- 근거: `FENCE`가 닫는 `---` 줄의 개행까지만 소비하므로 `body`가 `"\n## 소제목..."`처럼 빈 줄로 시작한다. 기존 파서 동작이며 공개 렌더에는 영향이 없다.
- 영향: 본문 에디터 맨 위에 빈 줄이 한 줄 생긴다. 기능 영향 없음.
- 수정안: 선택 사항. 템플릿의 빈 줄을 제거해 `---\n## 소제목`으로 두면 본문이 바로 시작한다. 가독성을 우선하면 현행 유지도 무방하다.

### F-3 (Low) CSP 하에서 blob 다운로드 확인 필요

- 위치: `next.config.ts:9-20` (`default-src 'self'`, blob은 `img-src`에만 허용)
- 근거: `<a download>`로 blob URL을 내려받는 것은 내비게이션이 아닌 다운로드로 처리되어 `default-src`/`connect-src` 대상이 아닌 것이 일반적이다. 다만 코드만으로 프로덕션 확인은 못 했다.
- 영향: 막히면 프로덕션에서만 다운로드가 실패한다.
- 수정안: 코드 변경 없음. QA가 `pnpm build` 후 실브라우저에서 확인(AC2-5). 막히는 경우에만 CSP 조정을 논의한다.

## 판정

통과 (조건부). Critical/High 없음. 필수 수정은 없고 F-1(지연 revoke)을 권장하며 오케스트레이터 재검토 게이트에서 반영 여부를 결정한다. F-1 미반영 시 QA에서 Chrome/Safari/Firefox 다운로드 실측이 필수다.
