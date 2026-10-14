# triage-1: code-review-1 orchestrator 재검토 (9-1 게이트)

- 대상: `code-review-1.md` (기준 커밋 c0d0838, 범위 `ac2e26b..c0d0838`)
- 판정자: orchestrator. 각 finding은 해당 코드를 직접 열어 확인함.
- 상태: 재작업 대상 확정, 사용자 지시로 재작업 전 hold.

## 판정

| ID | 심각도 | 판정 | 근거 | 조치 |
| --- | --- | --- | --- | --- |
| F-1 | High | 기각 (T09 이관) | Task Team 계약상 T05/T06은 새 테스트를 작성하지 않고, 이번 변경의 신규 테스트는 T09 QA가 직접 작성함 (`task-team-orchestrator` Task 등록 계약). 구현 단계 결함이 아님 | T09에서 requirements 4절·F2-2 테스트 항목 작성 |
| F-2 | Medium | 타당 | `globals.css:409`의 `.markdown-body table`은 `display:block; overflow-x:auto`만 있고, `render-markdown.tsx:35`의 `components`에 table 래퍼가 없음. `pre`(`globals.css:323`)도 포커스 불가한 스크롤 컨테이너 | 재작업: table을 `role="region" tabIndex={0} aria-label` 스크롤 래퍼로 감싸고 table의 `display:block` 제거, `pre`에 `tabIndex={0}` |
| F-3 | Low | 타당 | `frontmatter.ts:73`이 빈 title을 `""`로 반환하고 `blog-form.tsx:183`의 `??`는 `""`를 유지함 | 재작업: `||`로 변경 |
| F-4 | Low | 타당 | `blog-form.tsx:136`이 `setLocalNotice`와 `return message`를 함께 해서 액션 바와 `ConfirmDialog`의 `role="alert"`(`confirm-dialog.tsx:81`)가 같은 오류를 두 번 낭독함. 기존 `talk-form.tsx` 등은 dialog 반환만 사용 | 재작업: 한 곳으로 통일 |
| F-5 | Low | 타당 | `(public)/blog/page.tsx:33`의 `category`에 길이 상한이 없고 스키마의 카테고리 상한(50자)과 불일치. 파라미터 바인딩이라 주입 위험은 없음 | 재작업: 상한 초과 시 필터 미적용 |
| F-6 | Low | 타당 | `scripts/migrate-blog.ts:84-114`와 `src/lib/api/image-upload.ts:30-70`의 시그니처 판별 중복. `image-upload.ts`가 `server-only`라 스크립트에서 import 불가 | 재작업: `server-only` 없는 모듈로 분리해 공유 |

## 재작업 범위 밖 기록

- e2e 서버 로그 `The destination stream closed early`: 리뷰어는 RSC 요청 중단 시 React Flight 서버 메시지로 보고 이번 변경 원인이 아니라고 판단함. 근거는 코드 읽기뿐이고 develop 기준 e2e 대조는 하지 않음. T09에서 develop 기준 e2e 로그와 비교해 확정.
- 결과 피드백 위치(Bug Team 피드백): 리뷰어가 충족으로 확인함. `FormActionBar` 옵션 미전달 시 기존 4개 폼 동작 동일.
- 주석의 사이클 한정 식별자: 0건.
