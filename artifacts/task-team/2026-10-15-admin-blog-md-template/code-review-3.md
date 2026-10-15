# code-review-3 (T07 사이클 전체 최종 리뷰)

사이클 전체 최종 리뷰. 범위는 `git diff ced4e6f..3420e58 -- src` 전체(2파일: `src/components/admin/blog-form.tsx`, 신규 `src/lib/blog/post-template.ts`).
기준은 requirements.md(끝의 "사용자 확정" 우선), design-spec.md, project-structure.md, tailwind.md. code-review-1/2, triage-1에서 처리된 항목은 새 근거가 없어 다시 올리지 않는다.

## 판정: 통과

Critical/High/Medium/Low 없음. 재작업 불필요.

## 확인 항목

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| 왕복 로직 (템플릿 -> `parsePostMarkdown`) | 통과 | `post-template.ts:5-21`. 안내는 `#` 줄이라 `parse(..., {schema:"core"})`에서 버려지고, 안내 주석에 `---`가 없어 `FENCE`가 조기 종료되지 않는다. `date`는 따옴표 없는 `YYYY-MM-DD`라 core 스키마에서 문자열이 되어 `toDate`(`frontmatter.ts:33-40`)의 문자열 분기로 들어간다. `title`/`categories`/`tags`는 `toStringList`와 title 문자열 검사를 통과하는 형태다. `published`는 넣지 않았다(확정 1번). 본문은 안내 없이 자리 표시만이라 가져와도 공개 글에 섞이는 안내문이 없다. |
| 폼 상태 무영향 | 통과 | `blog-form.tsx:168-179` `downloadTemplate`는 `form`/상태 setter를 건드리지 않고 Blob 생성, 임시 URL, 앵커 클릭만 한다. 가져오기 입력(`importInputRef`)과도 분리돼 있다. |
| 재사용 | 통과 | 날짜는 기존 `todayInSeoul`(`post-editing.ts`)을 재사용하고 새 날짜 계산을 만들지 않았다. 파일명 상수와 빌더는 한 모듈에 두고 폼이 import한다. 새 의존성 없음. |
| 확정 사항 준수 | 통과 | 코드 상수, date만 Asia/Seoul 오늘, 고정 파일명 `blog-post-template.md`, 클라이언트 Blob 다운로드, 서버 변경 없음. 버튼은 `.md 가져오기` 블록(`!isEdit` 영역 안)에 있어 새 글 화면에만 노출된다. 안내 문구도 date를 포함하도록 갱신됐다. |
| 주석 규칙 | 통과 | `post-template.ts:3-4`, `blog-form.tsx:177`: 명사형 종결(`함`), 한 줄 한 문장, 문장 중간 줄바꿈 없음, em-dash 없음, 왜(펜스 조기 종료, 브라우저별 URL 무효화)를 서술. 사이클 식별자(F-1, 리뷰 번호, 확정 번호 등) 인용 없음. JSDoc 오용 없음. |
| Tailwind / 규칙 | 해당 없음 | 새 클래스는 기존 `AdminButton` 재사용뿐이라 arbitrary value 없음. kebab-case 파일명, 매직넘버 없음. |
| 이전 finding 반영 | 확인 | code-review-1 F-1은 `setTimeout(() => URL.revokeObjectURL(url), 0)`로 해결(code-review-2에서 확인). F-2 기각, F-3은 QA 위임 상태 유지. |
| props / 동시성 / CSRF / 서버 | 해당 없음 | 서버 변경과 새 prop이 없다. |

## Info (조치 불필요)

- I-1: `buildPostTemplate`의 왕복(파싱 결과가 title/date/categories/tags를 기대대로 반환)을 고정하는 유닛 테스트가 이번 diff에 없다. 요구사항에 테스트가 명시돼 있지 않고 로직이 단순해 재작업 사유는 아니다. 파서나 템플릿이 바뀔 때 어긋남을 잡고 싶다면 후속으로 `parsePostMarkdown(buildPostTemplate("2026-01-01"))` 검증 테스트를 추가하는 것을 고려한다.
- I-2: 실브라우저 다운로드(blob 해제 지연, CSP)는 코드 리뷰로 확인할 수 없어 triage-1대로 QA(T09) 확인 항목으로 남는다.

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --base-commit ced4e6f` (사이클 시작 커밋 기준, 워킹 트리 포함). 인증 정상, 무료 CLI 허용량으로 실행, 상태 `review_completed`.
- 결과: CodeRabbit 0건 중 0건 타당. 대상 파일은 `blog-form.tsx`, `post-template.ts`와 산출물 문서.
- 타당 판정 항목: 없음. 기각 항목: 없음.

## 결론

왕복, 폼 상태 무영향, 재사용, 주석 규칙 모두 충족하며 이전 finding이 모두 처리됐다. 통과. 다음 단계는 T09 QA(브라우저 다운로드와 CSP 확인 포함).
