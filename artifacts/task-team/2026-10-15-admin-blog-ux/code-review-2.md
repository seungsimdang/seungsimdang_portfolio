# code-review-2 (재작업 재리뷰, 범위 1eab77e..5555433)

판정: 통과 (배포 승인). 재작업 필수 항목 없음. Medium 1건은 사용자 판단 사항, Low 3건은 선택 보완.

자동 검사: tsc 오류 0, vitest 28 파일 393 테스트 통과, biome 131 파일 통과, knip 출력 없음(통과). 주석 규칙(em-dash, 명사형 종결, 사이클 식별자) 위반 없음(source-rules lint 테스트 통과).
CodeRabbit: 재작업 재리뷰 지침에 따라 생략.

## 이전 finding 해결 여부

| ID | 결과 | 근거 |
| --- | --- | --- |
| CR1-M1 | 대체로 해결, 잔여 CR2-L1 | `markdown-editor.tsx` 67-71행 렌더 중 setState는 React 공식 파생 상태 패턴이고, 같은 렌더 패스 안에서 tab이 write로 바뀐 뒤 커밋되므로 부모 포커스 effect 시점에 textarea가 보임. `tabRef`는 73행 effect로 동기화되어 업로드 완료 시점 판독도 맞음(171행 핸들러 동기 갱신과 중복이나 무해) |
| CR1-M2 | 해결 (지원 범위 조건부, CR2-M1) | popstate 대신 Navigation API `navigate`(traverse, cancelable, sameDocument)를 취소하고 `destination.key`로 `traverseTo`하므로 방향·단계 수와 무관하게 정확히 복원. push/replace/hash 이동은 navigationType·sameDocument 필터로 제외됨 |
| CR1-L1 | 해결 | `ignorePopRef` 자체가 제거됨. cleanup에서 `bypassPopRef` 초기화 |
| CR1-L2 | 해결 | 링크·뒤로 모두 `allowLeaving(LEAVE_MS)`로 문서 이동 완료까지 beforeunload 우회 유지 |

## 신규 finding

### CR2-M1 (Medium, 사용자 판단) Navigation API 미지원 브라우저에서 뒤로가기 보호 없음
- `use-leave-confirm.ts` 48행 `getNavigation()`이 undefined면 99행에서 리스너가 등록되지 않아 기록 이동이 무방비로 통과됨. requirements 7절 5항은 "안정적으로 만들 수 없으면 임의로 `window.confirm`을 남기지 않고 orchestrator에게 보고"라고 하므로 `confirm` 폴백을 두지 않은 것은 규칙과 일치. 다만 "미지원 브라우저는 보호하지 않음"이 수용 가능한지는 사용자 결정 사항이므로 summary에 명시해야 함.
- 브라우저 지원 현황: Chrome/Edge는 102부터 지원(확인 가능한 기억 기준). Safari와 Firefox의 지원 시작 버전은 이번 리뷰에서 출처를 열어 확인하지 못했음 -> 미확인. (WebFetch·문서 조회 도구가 없어 MDN/caniuse 확인 불가) T09 또는 사용자가 caniuse 확인 필요.
- 이탈 시 대안: 새로고침·탭 닫기는 beforeunload, 링크는 클릭 가로채기가 계속 보호하므로 손실 범위는 뒤로/앞으로 이동에 한정.

### CR2-L1 (Low) 오류가 유지된 채 미리보기 탭에서 재제출하면 작성 탭 복귀·포커스가 일어나지 않음
- `markdown-editor.tsx` 67-70행은 `Boolean(error)`가 false에서 true로 바뀔 때만 write로 되돌림. `use-admin-form.ts`의 클라이언트 오류는 `submitted` 이후 입력이 고쳐질 때까지 유지되므로, 본문 오류 상태에서 미리보기로 전환한 뒤 저장 버튼을 다시 누르면 error가 계속 truthy라 전환이 없고 숨은 textarea 포커스가 다시 실패함(원 CR1-M1 증상의 좁은 재현). 서버 오류는 submit 시 `setServerErrors({})`로 한 번 비워져 정상 동작.
- 방향: 부모의 `focusTick` 같은 제출 신호를 받아 오류가 있으면 write로 전환하거나, 미리보기 탭에서는 textarea 대신 탭 버튼에 `aria-invalid` 포커스를 주는 방식.

### CR2-L2 (Low) 확인 후 이동이 일어나지 않을 때 5초간 beforeunload 우회가 남음
- `use-leave-confirm.ts` 39-44, 114, 123행. 링크가 같은 경로라 라우터가 이동하지 않거나 `traverseTo`가 실패하면 `leavingRef`가 최대 5초 true로 남아 그 사이 새로고침·탭 닫기가 기본 경고 없이 통과. 미저장 변경이 남아 있는 경우의 좁은 창이라 Low. 뒤로 경로는 `finished` 거부 시 `bypassPopRef`만 풀고 `leavingRef`는 그대로 둠.
- 또한 `allowLeaving`의 타이머는 연속 호출 시 앞선 타이머가 뒤 호출을 일찍 풀 수 있음(5초 간격 내 재호출은 드묾).

### CR2-L3 (Low) stale key의 `traverseTo` committed 거부가 처리되지 않음
- 129-132행. `finished`에만 catch가 있고 `committed` 프라미스는 별도라, 기록 항목이 사라진 경우 unhandledrejection 콘솔 오류가 날 수 있음. 동작 영향은 없음. `finished`만 잡는 대신 두 프라미스를 함께 처리하면 해소.

## 구현자 보고 검증에 대한 의견
- Chromium 한 종류의 headless 확인이며 Firefox·Safari 실측은 없음. 지원 범위(CR2-M1)와 함께 T09에서 다룰 사항.
- 렌더 단계 setState와 effect 기반 tabRef 동기화는 정확성 문제 없음.
