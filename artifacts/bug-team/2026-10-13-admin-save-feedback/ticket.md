# 티켓: admin 저장 버튼 후 성공/실패 알림이 표시되지 않음

- 심각도: High (핵심 관리 기능의 결과 확인 불가, 저장 여부를 알 수 없어 재저장·이탈 판단이 어려움)
- 중복 여부: 신규 (기존 티켓 `2026-10-01-production-build`, `2026-10-13-image-fill-sticky-parent`와 무관)
- 상태: 문서 작성 완료, 원인 확정 전

## 사용자 설명 (보고 원문)

"어드민 페이지에서 저장 버튼을 누른 후 저장 되었다/안되었다는 메세지가 전혀 뜨지 않아서 저장 여부를 알 수가 없음"

## 코드 관찰 (사용자 설명과 구분, 정적 확인만 수행, 재현은 미실시)

- 알림 영역: `src/components/admin/form-parts.tsx`의 `FormStatus`가 폼 최상단(필드 위)에 렌더된다. 성공은 `role="status"`, 실패는 `role="alert"`.
- 저장 버튼: `FormActionBar`가 `sticky bottom-0`으로 하단에 고정된다. 알림은 상단, 버튼은 하단이라 긴 폼에서 버튼을 누른 시점의 시야에 알림이 없을 수 있다. 저장 후 알림 위치로 스크롤하거나 포커스를 옮기는 로직은 성공 경로에 없다(검증 실패 경로만 `focusTick`으로 첫 `aria-invalid` 필드에 포커스).
- 상태 흐름: `src/lib/admin-client/use-admin-form.ts`의 `submit`이 성공 시 `setNotice({ tone: "success", message: SAVED_MESSAGE })`를 호출하고, 실패 시 `describeFailure` 결과를 설정한다. 성공 알림은 `dirty`이면 `notice`가 `null`로 가려지는 조건이 있다(`notice?.tone === "success" && dirty ? null : notice`).
- 응답 해석: `src/lib/admin-client/admin-request.ts`의 `adminRequest`는 `response.ok`이고 JSON 파싱이 실패하면 `{ ok: false, status: 200 }`을 반환한다. 이 경우 `describeFailure`는 `SAVE_FAILED` 문구로 빠진다. 저장은 되었는데 실패 알림이 뜨는 경로가 될 수 있으나 실제 발생 여부는 미확인이다.
- 페이지 연동: 프로젝트 생성(`project-form.tsx`)과 발표 생성(`talk-form.tsx`)은 성공 시 `router.push(...?saved=1)`로 이동하고 `initialSaved`로 성공 알림을 다시 띄운다. 편집 화면의 slug 변경은 `router.replace`로 이동한다. 이동 후 알림이 사라지는 경로가 있는지는 미확인이다.
- 별도 저장 UI: 목록 순서 저장(`src/components/admin/sortable-list.tsx`)은 자체 `message` 영역을 가진다. 순서 저장 알림의 표시 여부는 이번 관찰에서 확인하지 않았다.

## 영향 화면 후보 (저장 버튼이 있는 admin 화면 전부)

- `/admin/profile` (`ProfileForm`, `FormStatus` + `FormActionBar`)
- `/admin/projects/new` (`ProjectForm`, 생성)
- `/admin/projects/[slug]` (`ProjectForm`, 편집, 썸네일 업로드/제거 포함)
- `/admin/talks/new` (`TalkForm`, 생성)
- `/admin/talks/[slug]` (`TalkForm`, 편집)
- `/admin/projects`, `/admin/talks` 목록 (`SortableList`의 순서 저장 버튼)

## 재현 단계 (사용자 설명 기준 추정, 재현 환경 미확인)

1. 관리자 로그인 후 `/admin/profile` 진입.
2. 필드 하나를 수정하고 하단 `저장` 버튼 클릭.
3. 상단과 하단 어디에도 "저장했습니다" 또는 "저장하지 못했습니다" 문구가 보이지 않는지 확인.
4. 같은 절차를 `/admin/projects/[slug]`, `/admin/talks/[slug]`에서 반복.
5. 긴 폼에서 스크롤을 내린 상태로 저장을 눌러 같은 현상이 나는지 확인.
6. 의도적으로 실패 조건(예: 중복 slug, 네트워크 차단)을 만들어 실패 알림도 뜨지 않는지 확인.

## 기대 동작

- 저장 성공 시 사용자가 보고 있는 위치에서 성공 알림이 보인다(성공 알림이 `role="status"`로 표시됨).
- 저장 실패 시 원인에 맞는 오류 알림이 보이고, 필드 오류가 있으면 해당 위치로 이동한다.
- 저장 중에는 버튼 상태와 함께 진행 상태가 보인다.

## 실제 동작 (사용자 보고)

- 저장 후 성공 또는 실패 메시지가 전혀 나타나지 않아 저장 여부를 판단할 수 없다.

## 환경 정보

- 관련 파일:
  - `src/components/admin/form-parts.tsx` (`FormStatus`, `FormActionBar`)
  - `src/lib/admin-client/use-admin-form.ts` (`submit`, `describeFailure`, `notice` 표시 조건)
  - `src/lib/admin-client/admin-request.ts` (`adminRequest` 응답 해석)
  - `src/components/admin/profile-form.tsx`, `project-form.tsx`, `talk-form.tsx` (`useAdminForm` 호출부)
  - `src/components/admin/sortable-list.tsx` (목록 순서 저장 알림)
  - `src/app/admin/(console)/` 하위 `profile/`, `projects/`, `talks/` 페이지
- 사용자 브라우저, OS, 계정 정보: 미수집
- 재현 브랜치: 보고 시점 `feature/projects-description-size` (작업 트리에 미커밋 변경 1건 존재, 이번 triage에서 건드리지 않음)

## 확인 필요

1. 실제 브라우저에서 위 재현 단계로 알림이 DOM에 생성되는지(`role="status"`/`role="alert"` 노드 존재 여부) 확인 필요. 생성되지만 화면 밖(상단)에 있어 안 보이는지, 아예 렌더되지 않는지 구분 필요.
2. 저장 요청의 네트워크 응답 상태(2xx/4xx/5xx)와 응답 본문 확인 필요.
3. 긴 폼에서 알림이 시야 밖에 있는지, 또는 성공 후 알림이 `dirty` 조건으로 즉시 숨겨지는지 확인 필요.
4. `/admin/projects/[slug]`, `/admin/talks/[slug]`의 `?saved=1` 이동 경로에서도 같은 현상인지 확인 필요.
5. 순서 저장(`SortableList`) 알림과 썸네일 업로드 상태 표시의 노출 여부 확인 필요.
6. 원인 분석과 수정 범위는 bug-localizer 단계에서 확정한다. 이 티켓의 관찰은 원인 확정이 아니다.
