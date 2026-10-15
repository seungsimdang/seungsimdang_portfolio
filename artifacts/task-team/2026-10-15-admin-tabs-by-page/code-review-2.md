# 코드 리뷰 2차: admin 탭 재구성 재작업 (T07)

- 범위: code-review-1의 L1·L2·L3 해결 여부와 재작업이 새로 만든 코드
- 확인 방법: 변경 파일과 `use-leave-confirm.ts`, `node_modules/next/dist/client/app-dir/link.js:317-345`, `confirm-dialog.tsx`, FormActionBar 사용처 5곳 직접 열람. `biome check`(admin, admin-client, schemas) 통과
- CodeRabbit: 재작업 재리뷰 지시이므로 생략(자체 리뷰만으로 판정)

## 판정: 통과 (Critical/High 없음, Medium 1건·Low 2건은 후속 권고)

## 이전 finding 해결 여부

| 항목 | 결과 |
|------|------|
| L1 `{ name: undefined }` 통과 | 해결. `portfolio.schema.ts:136-142`가 `Object.values(v).some((value) => value !== undefined)`로 판정 |
| L2 취소 링크가 자기 자신 | 변경 불필요로 결정됐고, 요청에 따라 탭 폼은 "변경 취소" 버튼으로 대체. 의도에 부합 |
| L3 `toInput` 이중 변환·SECTION_SCHEMAS | 해결. `SECTION_SCHEMAS`는 src에 잔존 없음. `SECTION_KEYS`(`profile-form.tsx:44-48`)는 `satisfies Record<ProfileSection, readonly (keyof ProfileInput)[]>`로 키 오타를 컴파일에서 잡음. `Object.fromEntries ... as Partial<ProfileInput>` 단언은 남았으나 키가 satisfies로 보장되어 수용 가능 |

## 확인 사항별 결과

### (1) 미저장 로그아웃 흐름

- 가드 우선 차단: `use-leave-confirm.ts:115`가 `document` 캡처 단계에 등록되고 `:87-88`에서 `preventDefault` + `stopImmediatePropagation`. React 이벤트는 root 컨테이너 버블 단계에서 처리되므로 `SignOutButton`의 onClick과 `signOut`은 실행되지 않고 LeaveDialog만 열림. 정상
- proceed: `:131-134`에서 `bypassClickRef`를 켜고 `anchor.click()`. 캡처 리스너는 `:66`에서 통과, Link onClick(`link.js:327-328`)이 사용자 onClick을 호출해 `event.preventDefault()` 후 signOut 실행. 정상
- Link 이동 억제: `link.js:336`에서 `e.defaultPrevented`면 `linkClicked`를 호출하지 않고 반환. 이중 이동 없음. 정상
- beforeunload: `signOut({ redirect: false })`는 문서 이동이 없고, `router.push("/")`는 클라이언트 전환이라 beforeunload가 발생하지 않음. `proceed`의 `endLeaving()`이 클릭 직후 우회를 끄지만(`:138`) 이 경로에는 영향 없음. 정상
- 미저장 아닐 때: `active=false`라 리스너가 없고 Link onClick이 바로 실행됨. 정상
- login-panel forbidden 상태: `LoginPanel`에는 폼이 없어 가드가 비활성이고 같은 경로로 signOut 후 `/` 이동. 이전 `callbackUrl: "/"`과 결과가 같음. 정상
- toast-provider(`toast-provider.tsx:154`)의 403 안내 로그아웃도 같은 컴포넌트라 미저장 상태에서는 LeaveDialog를 거침. 의도에 부합

### (2) discard

- `use-admin-form.ts:218-223`: `setDraft(baseline)`로 draft가 baseline 객체와 같은 내용이 되어 `JSON.stringify` 비교(`:161`)가 같아짐. dirty는 false가 됨
- `setSubmitted(false)`로 클라이언트 오류, `setServerErrors({})`로 서버 필드 오류, `clearGroup`으로 해당 폼 토스트를 초기화. 누락 없음
- 저장 성공 후 `setBaseline(next ?? draft)`(`:214`)로 baseline이 재기준화됨. profile은 `onSaved=toDraft`라 `next` 사용
- `StringItem`의 id는 baseline과 draft가 같은 객체에서 오므로 복원 후 key 안정. 문제 없음

### (3) FormActionBar 타입 영향

- `form-parts.tsx:7-10`의 `CancelAction`은 두 분기 합집합이며, 기존 사용처 4곳(resume-entry-form, talk-form, blog-form, project-form)은 `cancelHref`를 그대로 전달해 첫 분기에 해당. 이들은 `useAdminForm`의 새 반환값(`dirty`, `discard`)을 쓰지 않아 영향 없음
- 분기 조건 `onDiscard ?` 와 두 분기가 서로 배타적이라 둘 다 없는 호출은 컴파일 오류. 적절

## Findings

### Medium

**M1. 수정키 클릭이 가드를 우회해 확인 없이 로그아웃**
- 위치: `src/components/admin/sign-out-button.tsx:15-19`, `use-leave-confirm.ts:69-77`
- 근거: 가드는 Ctrl/Meta/Shift/Alt 클릭과 `button !== 0`을 통과시켜 브라우저 기본 동작(새 탭)에 맡김. 그런데 `SignOutButton`의 onClick은 수정키 여부와 무관하게 `preventDefault()` 후 signOut과 `router.push("/")`를 실행함. 미저장 상태에서 Ctrl+클릭하면 LeaveDialog 없이 세션이 종료되고 현재 탭이 `/`로 이동해 변경이 사라짐
- 수정 제안: onClick 맨 앞에 `if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;`을 두어 기본 동작(새 탭으로 `/` 열기, 로그아웃 없음)에 맡김. 한 줄 가드로 가드 조건과 일치

### Low

**L1. signOut 실패 시 피드백 없음**
- 위치: `sign-out-button.tsx:17-18`
- 근거: `await signOut(...)`이 거부되면 unhandled rejection이고 화면은 그대로임. 세션이 남은 채 `router.push`도 실행되지 않으므로 데이터 손상은 없고, 이전 `signOut({ callbackUrl })`도 같은 실패 경로였음
- 수정 제안: 필요 시 try/catch로 토스트 안내. 현 상태 유지 수용 가능

**L2. 스키마 refine 테스트 부재(code-review-1 M1 이월)**
- 위치: `__tests__/schemas/portfolio-schema.test.ts`
- 근거: `profileUpdateInputSchema`를 import하는 테스트가 `__tests__`·`tests`에 없음. 이번 L1 수정(값이 undefined인 키)도 회귀 검증이 없음
- 수정 제안: 일부 항목 허용, `{}` 거부, `{ name: undefined }` 거부, 알 수 없는 키 거부, 잘못된 값 거부를 실제 소스 import로 추가(한글 제목)

## 참고(결함 아님)

- `use-admin-form.ts:214`의 `setBaseline(next ?? draft)`에서 `next`가 없을 때 `draft`는 제출 시점의 값. 저장 중 입력이 바뀌었다면 dirty가 true로 남아 오히려 안전한 쪽
- `ConfirmDialog`의 `onConfirm`이 동기 작업에 async 래퍼를 쓰지만 인터페이스 요구에 따른 것이라 문제 없음

## 요약

수정키 클릭 우회(M1)는 한 줄 가드로 닫을 수 있어 배포 차단 사유는 아님. 재작업 권고는 M1, 테스트(L2)는 QA 전 반영 권장.
