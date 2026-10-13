# 결함 위치 분석 2026-10-13-admin-save-feedback

## 결함 위치
- 파일: `src/components/admin/form-parts.tsx`, `src/lib/admin-client/use-admin-form.ts`
- 함수/컴포넌트: `FormStatus`(알림 위치), `FormActionBar`(sticky 하단 버튼), `useAdminForm.submit`(성공/비필드 오류 경로에 스크롤·포커스 없음)
- 줄 번호: `form-parts.tsx` 9-29(`FormStatus`), 47(`sticky bottom-0`); `use-admin-form.ts` 229-240(`submit` 결과 처리), 199-204(`focusTick` 포커스는 `aria-invalid` 필드 전용)

## 근본 원인
알림은 DOM에 정상 렌더되지만, 폼 맨 위(`<form>` 첫 자식)에 있고 저장 버튼은 `sticky bottom-0`으로 하단에 있다. 저장 성공과 필드 오류가 없는 실패(5xx, 네트워크, 401/403/404, LIMIT_EXCEEDED 등)에서는 알림 위치로 스크롤하거나 포커스를 옮기는 코드가 전혀 없어, 스크롤을 내린 상태에서 저장하면 알림이 시야 밖에 남는다. 필드 오류가 있는 실패는 `focusTick`이 첫 `aria-invalid` 필드로 포커스를 옮기므로 알림이 아닌 필드로 스크롤된다.

"렌더되지 않음"이 아니라 "렌더되지만 시야 밖"으로 판정한다. 근거는 아래 증거 표 참조.

## 증거와 가설 구분

확인됨(코드 정적 근거):
- 세 폼(`profile-form.tsx` 59, `project-form.tsx` 177, `talk-form.tsx` 131) 모두 `<FormStatus>`를 `<form>` 첫 자식으로 렌더. 하단은 `FormActionBar`(sticky).
- `submit` 성공 경로(236-240)는 `setNotice` 뿐, `scrollIntoView`/`focus` 호출 없음. `src` 전체에서 `scrollIntoView|scrollTo` 사용처는 0건(Grep 확인, 해당 키워드 포함 파일은 notice 관련 7개뿐이고 스크롤 호출 파일 없음).
- 실패 경로(229-234)의 `focusTick`은 `[aria-invalid="true"]` 요소만 찾으므로, 필드 오류가 없는 실패(500/네트워크/401/403/404)는 포커스·스크롤 모두 없음.
- 레이아웃: 고정 헤더(`admin-console-shell.tsx` 37-39, `fixed top-0 z-50`)가 상단을 덮고 `main`은 페이지 스크롤. 알림이 스크롤 위쪽이면 보이지 않음.
- `notice` 초기화/리마운트로 인한 소실은 아님: 편집 폼은 `router.replace`를 slug 변경 시에만 호출. 생성 폼은 `router.push(...?saved=1)` 후 `[slug]/page.tsx`가 `initialSaved`를 넘겨 새 마운트에서 알림을 다시 띄움(상단에서 시작하므로 보임).
- `dirty` 숨김은 원인 아님: 성공 시 `setDraft(next)`와 `setBaseline(JSON.stringify(next ?? draft))`가 같은 배치에서 일어나 `dirty=false`. `next`가 없으면(생성) 화면을 떠남.
- `adminRequest` 200 + JSON 파싱 실패 -> `{ok:false,status:200}` -> `SAVE_FAILED`: 코드 경로는 있으나 이번 증상의 원인이라는 증거 없음(가설, 낮음).
- `SortableList`(순서 저장): `message`(`aria-live="polite"`)와 저장 버튼, `error`가 모두 목록 위쪽 같은 블록에 있어 저장 버튼 바로 옆에 표시됨. 이번 증상의 원인이 아님(위치 구조상 시야 내).

가설(런타임 미확인):
- 사용자 환경에서 실제로 폼이 뷰포트보다 길어 알림이 위로 밀려난다는 점. 짧은 폼(talk 신규 등)은 뷰포트 안에 알림이 보여 증상이 약할 수 있음. 브라우저 재현은 하지 않았음.
- 성공 알림 스타일(`border-white/25`, 배경 없음, 작은 글씨)이 시각적으로 약해 눈에 띄지 않을 가능성(보조 요인).
- `role="status"`가 알림과 함께 새로 마운트되어 일부 스크린리더가 읽지 않을 수 있음(접근성 보조 요인, 시각 증상과 별개).

## 이전 수정 이력
- 관련 fix 문서와 미해결 항목: 없음(이 파일 작성 시 `artifacts/bug-team/`의 기존 fix 문서 중 `use-admin-form`/`form-parts`를 다룬 것은 확인하지 않음. 필요 시 orchestrator가 확인).

## 영향 범위
- 영향받는 다른 모듈: `useAdminForm`/`FormStatus`를 쓰는 profile·project·talk 폼 전부(신규/편집). `SortableList`는 영향 없음.

## 수정 방향
모든 폼이 공유하는 `FormStatus`/`useAdminForm`에서 한 번에 고친다.
1. 알림이 새로 나타날 때(성공, 필드 오류 없는 실패 포함) 알림 요소를 시야로 가져온다. 가장 작은 변경: `FormStatus`에 ref와 `useEffect`(notice 변경 시) `scrollIntoView({ block: "nearest" })`, 고정 헤더에 가려지지 않도록 알림 div에 `scroll-mt-*` (헤더 높이 + 여유, Tailwind spacing은 px 단위) 부여.
2. 필드 오류가 있는 실패는 기존 필드 포커스를 유지(필드 쪽 오류 문구가 보임). 필요하면 알림 문구에 오류 개수가 이미 있으므로 그대로 둠.
3. (선택, 동일 지점) 저장 버튼 옆에 있는 `FormActionBar`에 짧은 상태 문구를 두는 방안은 범위가 커지므로 1번이 부족하다고 확인된 뒤에만 검토.
4. 검증: 긴 폼에서 스크롤 하단 상태로 저장 성공/500/네트워크 차단 시 알림이 뷰포트에 들어오는지 브라우저로 확인.

## 수정 대상 파일
- `src/components/admin/form-parts.tsx` (주 수정, `FormStatus`)
- `src/lib/admin-client/use-admin-form.ts` (필요 시만: 스크롤 트리거를 notice 변경이 아닌 submit 결과 기준으로 한정해야 할 때)

## 재발 가능성
- 유사 패턴이 다른 곳에 있는지: `ThumbnailField`의 업로드 상태 표시와 `ConfirmDialog` 삭제 실패 문구는 이번에 코드를 열어 확인하지 않음. 상단 알림 + 하단 액션 패턴은 `FormStatus`/`FormActionBar` 한 쌍에만 있음.
