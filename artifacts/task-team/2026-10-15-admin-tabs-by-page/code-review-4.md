# 코드 리뷰 4차: 3차 지적 재작업 확인 (T07)

- 범위: triage-3 재작업 결과 절에 적힌 부분만 (experience-list-editor, list-editor, profile-form, project-form, form-errors, use-admin-form, blog.schema)
- 확인 방법: 대상 파일 전문 열람, `confirm-dialog.tsx`·`draft.ts` 대조. 브라우저 미실행. CodeRabbit은 재작업 재리뷰라 생략 (지시문 기준)

## 판정: 통과 (Critical/High/Medium 없음, Low 1건은 선택)

## (a) 3차 지적 해결 여부

| ID | 결과 | 근거 |
| --- | --- | --- |
| M1 | 해결 | `experience-list-editor.tsx:31,85` id가 `useId()` 범위 + index. `key={item.id}`는 유지(`:87`). 서버와 클라이언트가 같은 값을 만듦. 항목 이동 시 id가 index를 따라가지만 label·describedby가 같은 렌더에서 함께 바뀌어 연결은 유지됨 |
| L1 | 해결 | `project-form.tsx:91` 주석이 실제 동작(기준값 갱신, 생성 후 이동)과 맞음. 명사형 종결 |
| L2 | 해결 | `blog.schema.ts:39-47` `unique` 한 곳으로 통합. 두 transform의 동작은 동일 |
| L3 | 해결 | `project-form.tsx:220-221` 업로드 중이면 `UPLOADING_MESSAGE` 반환. `confirm-dialog.tsx:61-63`이 null이 아닌 문자열을 `setError`하고 `role="alert"`로 `오류: ...` 표시, 대화상자는 닫지 않음. `:126-129`의 `submit` 가드와 같은 상수로 안내됨 |
| L4 | 해결 | `form-errors.ts:33-39` 재귀. 아래 경로 점검 참고 |
| L5 | 해결 | `profile-form.tsx:37-41` 모듈 상수. 단언은 `profileSectionFormSchema` 쪽에 그대로 남아 있으나 이번 지적(렌더마다 재생성)은 해소됨 |
| L6 | 해결 | 두 편집기의 오류 `<p>`에 `id`·`tabIndex={-1}`·`data-error-focus`, 컨테이너에 `aria-describedby`. `use-admin-form.ts:167-169` 선택자가 `[aria-invalid="true"], [data-error-focus]`라 DOM 순서상 첫 대상으로 포커스 |
| 보안 Low-1 | 해결 | `project-form.tsx:72` resolver가 `values.thumbnail?.trim()`을 saved와 비교. save의 `:88`은 스키마가 trim한 출력과 비교해 두 판정이 일치 |

## (b) 특별 점검 항목

- **inputName 재귀 도달성**: 실제 폼 값 모양별로 확인함.
  - 문자열 목록(`skills.0` 등): `{value}` 객체, 첫 키 `value`가 register된 칸.
  - 링크(`experiences.0.links.1`): `{label,url}`, 첫 키 `label`이 입력 칸.
  - 경험(`experiences.0`): 첫 키 `title`이 입력 칸. `experiences.0.tradeoff`: 첫 키 `advantages`가 입력 칸.
  - 배열 경로(`skills`, `experiences`, `...links`): `.root`가 되고 `useFieldError`가 `name`과 `name.root`를 모두 읽음.
  - 빈 배열은 `Array.isArray`로 `.root`, null·undefined·원시값은 `path` 그대로, 빈 객체는 `first === undefined`로 `path` 그대로. 모두 무한 재귀 없음(깊이는 값 트리 깊이로 유한).
  - 첫 키가 입력 칸이 아닌 객체는 현재 폼 값에 없음(경험·링크·tradeoff·`{value}` 모두 첫 키가 입력 칸). 폼 값에 `id` 같은 비입력 키를 앞에 넣으면 그 경로의 서버 오류가 칸에 안 보이므로 아래 Low-1에 기록.
- **ERROR_ID 고정 문자열**: `experience-list-error`·`experience-add`·`experience-heading`은 `ExperienceListEditor`가 프로젝트 폼에 1회만 렌더되어 중복 없음(grep으로 다른 사용처 없음 확인). `ListEditor`의 오류 id는 `useId` 범위라 안전. 이전 사이클부터 있던 `experience-heading`/`experience-add` 패턴과도 일관됨
- **ConfirmDialog 문자열 반환 처리**: 위 L3 행 참고. 삭제 모달의 `remove`도 같은 계약(null 성공, 문자열 오류)을 이미 사용 중이라 일관됨
- **aria-describedby 적절성**: 오류가 있을 때만 연결(`error ? id : undefined`). `fieldset`의 설명은 그룹 진입 시 읽히고, 오류 `<p>`가 포커스를 받으면 그 문구가 직접 읽힘. 두 경로가 겹쳐도 중복 낭독 외 해는 없음. `section`(경험)은 `aria-labelledby`가 있어 region 역할이 성립하므로 describedby 사용이 적절함. `오류:` 접두는 색에 의존하지 않는 표시로 유지됨

## Findings

### Critical / High / Medium
없음.

### Low

**Low-1 (선택). inputName의 "첫 키 = 입력 칸" 가정이 코드로 고정되어 있지 않음**
- 위치: `src/lib/admin-client/form-errors.ts:33-39`
- 시나리오: 훗날 `toExperienceValues` 등에 입력 칸이 아닌 키(예: 서버 id)가 객체 앞쪽에 추가되면, `experiences.0` 같은 객체 단위 서버 오류가 `experiences.0.id`에 걸려 어떤 칸에도 표시되지 않고 토스트만 남음. 현재 값 모양에서는 발생하지 않음
- 제안: 조치 불필요하거나, 가정을 한 줄 주석(왜 첫 키를 쓰는지)으로 남기는 정도. 테스트 추가는 M2 이월분(T09 QA 계약)으로 이미 분리됨

## 검증

- 코드 실행 검증은 생략하고 triage-3 기록(tsc, vitest 408, knip·biome·주석 검사 통과)을 신뢰함. 위 판정은 코드 열람 기준이며 브라우저 동작(hydration 경고 해소, 포커스 이동)은 미검증

## 요약

3차 지적 M1·L1~L6와 보안 Low-1은 모두 해결됐고, 재작업이 새로 만든 결함은 없음. 선택 사항 Low 1건만 남음. orchestrator가 심각도와 무관하게 최종 재작업 여부를 정함.
