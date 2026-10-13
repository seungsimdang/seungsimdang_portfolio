# 포스트모텀 2026-10-13-admin-save-feedback

## 버그 요약
- 관련 티켓: `2026-10-13-admin-save-feedback/ticket.md`
- 결함 위치: `2026-10-13-admin-save-feedback/localize.md` 참조 (`src/components/admin/form-parts.tsx`의 `FormStatus`·`FormActionBar`, `src/lib/admin-client/use-admin-form.ts`의 `submit`)
- 증상: 저장 버튼을 누른 뒤 성공/실패 알림이 보이지 않아 저장 여부를 판단할 수 없음 (사용자 보고, 재현 미실시)
- 적용된 수정: 하단 액션 바에 짧은 결과 문구("저장됨" / "저장 실패 (상세는 위 알림 참고)")를 추가하고 3개 폼에서 `notice`를 전달함. 상단 `FormStatus`는 유지함 (`fix.md` 참조)
- 검증 상태: 정적 검증 통과 (type-check, vitest 188개, biome). 브라우저에서 긴 폼 시나리오 확인은 미실시

## 원인 유형
- 분류: 설계 문제
- 원인 한 줄: 결과 피드백(폼 최상단 `FormStatus`)과 사용자 행동(`sticky bottom-0` 하단 `FormActionBar`의 저장 버튼)의 위치가 떨어져 있어, 긴 폼에서 하단으로 스크롤한 사용자는 결과를 볼 수 없었음
- 판단 근거:
  - `localize.md`의 확인됨 항목 기준으로 알림 로직은 의도대로 동작했다. `FormStatus`는 상태가 있으면 DOM에 렌더되고, `dirty`로 숨겨지는 경로와 리마운트 소실 경로는 기각되었다.
  - 따라서 증상은 구현 오류가 아니라 두 요소의 배치가 만든 결과다.
  - 읽은 규칙 문서(`docs/agent-rules/*`)에는 결과 피드백을 어디에 두는지에 대한 기준이 없었다. 이 공백이 설계 단계에서 점검되지 않은 배경으로 보이지만, 설계 리뷰 기록이 없어 확정 원인으로는 기록하지 않는다.
- 분류 제외: 명세 모호성, 구현 오류, 테스트 누락은 원인으로 채택하지 않았다. 브라우저 확인 공백은 발견이 늦어진 경로에 관한 사실로만 기록하며, 대책은 수정 검증 잔여 항목에서 다룬다.

## 패턴 분석
- 이전 유사 사례: 없음. `artifacts/bug-team/*/postmortem*.md`는 존재하지 않음 (확인함)
- 비교 대상: `2026-10-13-image-fill-sticky-parent`도 sticky 요소가 관여하지만 원인은 next/image `fill` 부모의 위치 지정 문제이며 결과 피드백과 무관하다. 같은 패턴으로 보지 않는다. 해당 건은 postmortem이 생략되었다.
- 반복 여부: 첫 발생
- 패턴 범위: "상단 알림 + 하단 액션 바" 쌍은 `FormStatus`·`FormActionBar`에만 존재하며, 사용처는 `profile-form.tsx`, `project-form.tsx`(신규/편집), `talk-form.tsx`(신규/편집) 3개 파일이다.
- `SortableList`는 자체 `message` 영역이 저장 버튼 옆에 있어 이 패턴에 해당하지 않는다 (localize 확인).

## 재발 방지 항목

원인은 하나(결과 피드백 위치와 사용자 행동 위치의 분리)로 고정하고, 아래 두 항목은 모두 이 원인에 대응한다.

1. **설계 기준: 행동 버튼이 고정 영역에 있으면 결과 피드백도 같은 영역에 둔다**
   - 내용: 저장처럼 사용자가 누르는 행동 버튼이 sticky/fixed 영역에 있는 admin 폼은, 그 행동의 결과 표시도 같은 영역에 둔다. 다른 위치에 두는 설계는 설계 산출물에 그 이유를 적는다.
   - 담당: designer (설계 산출물 체크 항목 추가), frontend-developer (구현 시 준수)
   - 검증 기준:
     - 다음 admin 폼 Task Team 사이클의 설계 산출물에 "결과 피드백 위치" 항목이 있고, 행동 버튼과 같은 영역인지 기록된다.
     - code-reviewer 리뷰 기록에 같은 항목의 확인 결과가 남는다.
   - Task Team 후속 경로:
     - task-team-orchestrator에 "admin 폼 결과 피드백 위치 기준 추가" 요구사항으로 요청한다.
     - 브랜치는 `develop`에서 `feature/admin-form-feedback-guard`로 분기한다 (`docs/agent-rules/branch-strategy.md`).
     - 대상 파일: `.claude/agents/designer.md`, `.claude/agents/code-reviewer.md`. 하네스 파일 변경은 사용자 지시 후 진행한다.

2. **회귀 방지 유닛 테스트: `FormStatus`를 쓰는 파일은 `FormActionBar`에 `notice`를 전달한다**
   - 내용: `__tests__/lint/`에 파일 내용 검사를 추가한다. 불변식은 "`<FormStatus`를 쓰는 파일(정의 파일 `form-parts.tsx` 제외)은 `<FormActionBar`를 쓰고, 그 호출에 `notice=` 속성이 있다"이다.
   - 근거: `docs/agent-rules/enforcement-placement.md` 기준으로 파일 내용만으로 완결되고 전체 코드베이스에 항상 참이어야 하는 불변식이므로 유닛 테스트로 둔다. 현재 위반은 0건이라 즉시 켤 수 있다 (구현자가 현재 3개 파일로 재확인).
   - 담당: frontend-developer
   - 검증 기준:
     - 현재 코드에서 신규 테스트가 통과한다.
     - 구현자가 로컬에서 `profile-form.tsx`의 `notice=`를 임시로 제거했을 때 테스트가 실패하는 것을 확인한 뒤 원복한다. 이 임시 변경은 커밋하지 않는다.
     - 전체 `vitest run`이 통과한다.
   - 한계: 속성 존재만 검사하며, 문구가 뷰포트에 보이는지는 검사하지 않는다. 가시성은 아래 수정 검증 잔여 항목에서 확인한다.
   - Task Team 후속 경로: Task Team T05 frontend 경로 (항목 1과 같은 `feature/admin-form-feedback-guard`에 포함 가능). 형식 참고: `__tests__/lint/canonical-classes.test.ts`.

## 수정 검증 잔여 (재발 방지 항목 아님)
- 브라우저 확인 미실시. 관리자 화면은 GitHub OAuth 로그인이 필요하므로, 검증 전에 세션 준비 방법을 정한다. 브라우저 자동화는 headless로 실행한다.
- 검증 기준: `profile`, `projects/[slug]`, `talks/[slug]` 긴 폼에서 하단으로 스크롤한 상태로 저장했을 때
  - 성공 시 "저장됨" 문구가 저장 버튼과 같은 뷰포트에 보인다.
  - 서버 실패(500 또는 네트워크 차단) 시 "저장 실패" 문구가 같은 뷰포트에 보인다.
  - 두 경우 모두 상단 `FormStatus`가 함께 렌더된다.
- 티켓의 확인 필요 항목 중 2번(네트워크 응답 상태), 4번(`?saved=1` 이동 후 생성 폼 경로), 5번(`SortableList`·썸네일 상태 표시)은 미확인이다.
- 기록 공백: `2026-10-13-admin-save-feedback/verification.md`가 없다. `artifacts/bug-team/README.md` 계약상 필요하므로, orchestrator가 재검증 결과(type-check, vitest 188개, biome)를 이 파일에 기록한다.
- 잔여 위험: 실패 상세 문구는 여전히 상단에만 있어, 하단의 "저장 실패 (상세는 위 알림 참고)"를 보고 위로 스크롤해야 한다. 이는 사용자가 하단 바 방식을 선택하면서 수용한 범위다. 상세가 필요하다고 판단되면 `localize.md`의 수정 방향 1(알림 `scrollIntoView`)을 별도 검토한다.

## 참고 (부수 발견, 재발 방지 항목에 포함하지 않음)
- `src/lib/admin-client/admin-request.ts`: 응답이 2xx이지만 JSON 파싱에 실패하면 `{ ok: false, status: 200 }`이 되어 "저장하지 못했습니다"가 뜬다. 저장은 되었는데 실패 문구가 뜨는 경로가 될 수 있다. 증거는 없으며 별도 티켓 후보다.
- 성공 알림 스타일(`border-white/25`, 배경 없음, 작은 글씨)이 약해 눈에 덜 띌 수 있다. 시각 강조 문제로 별도 디자인 이슈다.
- 하단 요약은 `aria-hidden`이므로 스크린리더는 상단 `FormStatus`에 의존한다. 상단 `role="status"`가 새로 마운트될 때 낭독되는지는 미확인이다.
- `ThumbnailField`의 업로드 상태, `ConfirmDialog`의 삭제 실패 문구, `SortableList`의 순서 저장 알림이 같은 패턴인지 미확인이다. 이번 항목 2의 검사 범위는 `FormStatus` 쌍으로 한정된다.
- 커밋 상태: 이 포스트모텀 작성 중에는 git 명령을 쓰지 않았다. 대화 시작 시점 git status에 admin 폼 4개 파일(`form-parts.tsx`, `profile-form.tsx`, `project-form.tsx`, `talk-form.tsx`)이 수정 상태로 보였다. 병합 전 커밋 여부와 대상 브랜치는 orchestrator가 확인한다.
- 브랜치: 티켓의 재현 브랜치는 `feature/projects-description-size`(미커밋 변경 1건, triage에서 미접촉)이다. 수정이 적용된 브랜치와 다를 수 있으므로 병합 대상 확인이 필요하다.
