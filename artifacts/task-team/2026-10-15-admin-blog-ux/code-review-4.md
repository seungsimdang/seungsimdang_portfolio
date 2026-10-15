# 코드 리뷰 4 (T07 재리뷰, 최종 Low 수정분)

범위: triage-3의 CR3-L1, SEC2-L1, SEC2-L2, SEC2-L3 해결 여부와 `git diff f1e02c5..352ba6c`(src 4개 파일) 신규 코드.
CodeRabbit: 재작업 재리뷰 지시이므로 생략(자체 리뷰만).

## 판정: 통과 (Critical/High/Medium 없음, Low 2건은 선택)

## 자동 검사

- tsc --noEmit: 통과 (출력 없음)
- vitest run: 28 파일 / 393 테스트 통과
- biome check: 183 파일 통과
- knip: 출력 없음 (통과)
- harness:test: 6 파일 / 43 테스트 통과
- 주석 규칙: source-rules 테스트(em-dash, 종결어미) 통과. 신규 주석 모두 명사형·비종결 구절이며 한 줄 한 문장.

## 해결 여부

| ID | 결과 | 근거 |
|----|------|------|
| CR3-L1 | 해결 | `form-parts.tsx` 34행에서 `offsetHeight`를 `--admin-action-bar-h`로 노출, ResizeObserver로 줄 수 변화를 추적. `toast-provider.tsx` 220행이 변수 + 16px 위에 토스트를 배치. 기존 `bottom-96`과 동일한 80+16=96 기본값이라 바가 없는 화면에서도 위치 불변. |
| SEC2-L1 | 해결 | `use-leave-confirm.ts` 137행 `endLeaving()`이 `finally` 안으로 이동. `anchor.click()` 동기 예외 시에도 해제되고 예외는 그대로 전파. |
| SEC2-L2 | 해결 | `sortable-list.tsx` 210행이 `leavingRef` 직접 대입 대신 `allowLeaving()`을 호출해 5초 상한 타이머와 언마운트 정리를 얻음. 훅 반환에서 `leavingRef`가 사라졌고 src 내 다른 사용처 없음(grep 확인). |
| SEC2-L3 | 해결 | `bypassKeyRef`에 `targetKey`를 저장하고 `event.destination.key`가 일치할 때만 `bypassPopRef`를 소비(101-104행). 불일치 이동은 우회를 소비하지 않고 아래 확인 경로를 다시 탐. 소비 조건은 `bypassPopRef && key 일치`라서 stale key가 남아도 `bypassPopRef=false`면 무영향(`endLeaving`이 false로 되돌림). |

## 특별 확인 항목

- CSS 변수 라이프사이클: 현재 `FormActionBar`는 각 폼 화면에 하나씩만 렌더(resume-entry, talk, blog, profile, project 각 1곳). 라우트 이동 시 React가 이전 화면 cleanup(removeProperty)을 새 화면 effect(setProperty)보다 먼저 실행하므로 잔존·역전 문제 없음. 변수가 없을 때는 `var()` 폴백 80px가 적용됨.
- `allowLeaving` 반환 변경: 매 렌더 새로 만들어지는 일반 함수이나 내부는 ref와 안정된 `endLeaving`만 사용하고 호출처는 onClick 한 곳이라 stale 문제 없음. 타입 검사 통과.
- Tailwind: 아래 CR4-L1 참고.

## Finding

### CR4-L1 (Low) arbitrary value `bottom-[calc(var(--admin-action-bar-h,80px)+16px)]`

- 위치: `src/components/admin/toast-provider.tsx:220`
- `docs/agent-rules/tailwind.md` 3번은 CSS 변수 참조에 `[var(--x)]` 대신 괄호 표기를 요구하고, 2번은 반복 값을 `@theme` 토큰으로 두라고 한다. calc 합성은 괄호 표기만으로 표현할 수 없어 `[]`가 불가피하고(4번 1회성 예외 범위), `source-rules.test.ts`의 canonical 쌍 검사(`w-[Npx]` 등 고정 목록, `rounded-[Npx]`)에도 걸리지 않아 자동 검사는 통과한다. 따라서 위반은 아니고 권고 수준이다.
- 권고(선택): 폴백 80px와 여백 16px를 `globals.css`에 토큰으로 두거나, 바 높이 변수에 여백까지 포함해 `bottom-(--admin-action-bar-h)` 형태로 줄이면 규칙에 더 가깝다. 80px 폴백은 `form-parts.tsx`의 실제 한 줄 높이(py-16 x2 + 버튼)와 값이 따로 놀 수 있어 어긋남 위험이 있다.

### CR4-L2 (Low) SEC2-L3 우회 키 일치 조건에 대한 회귀 테스트 없음

- 이 diff는 테스트 파일을 변경하지 않았고, 기존 테스트는 통과한다. 연타 시 다른 키 이동이 다시 확인을 거치는 동작과 `finally` 해제는 신규 분기인데 직접 검증하는 테스트가 없다.
- 권고(선택): `use-leave-confirm` 테스트에 "다른 destination.key는 우회를 소비하지 않음" 한 건 추가.

## 후속(이번 변경 범위 밖 메모)

- 같은 화면에 `FormActionBar`가 둘 이상 동시에 마운트되는 구조가 생기면 먼저 언마운트되는 쪽이 `removeProperty`로 변수를 지워 폴백(80px)으로 돌아간다. 현재 구조에서는 해당 없음.
