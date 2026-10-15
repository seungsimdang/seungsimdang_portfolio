# 보안 리뷰 4 (T08 재리뷰): 3차 재작업 확인

## 판정

배포 승인. Critical/High/Medium 없음. Low 1건(Low-1 부분 해결, 잔여), Info 2건.

범위: 지시된 파일을 Read로 직접 확인함. 서버 스키마(portfolio.schema.ts:110-118, 205, 271-278)와 service(portfolio-admin-service.ts:215, 244)도 함께 열었음. Bash가 없어 diff와 런타임 실행은 하지 않았고 현재 파일 상태 기준임.

## 핵심 질문: trim 비교로 공백만 다른 썸네일이 클라이언트 검증을 건너뛰어 서버로 가는가

있음. 단, 서버가 다시 검증하므로 보안 영향 없음.

1. resolver(project-form.tsx:72)는 `values.thumbnail?.trim() === savedThumbnail.current`이면 `projectFormKeepThumbnailSchema`를 고른다. 이 스키마의 thumbnail은 `z.string()`(portfolio.schema.ts:277)이라 trim도 형식 검사도 하지 않고 원문을 출력한다.
2. 따라서 입력이 ` <저장값> `(앞뒤 공백)이면 형식 검증 없이 통과하고 출력 thumbnail은 공백 포함 원문이다.
3. save(project-form.tsx:84-88)는 `thumbnail === savedThumbnail.current`(원문 비교)라 위 경우 false가 되어 `rest`가 아닌 `input` 전체, 즉 공백 포함 thumbnail을 PUT으로 전송한다.
4. 서버 `projectUpdateInputSchema.thumbnail`(portfolio.schema.ts:110-118, 205)은 `.trim()` 후 `max`와 `isValidThumbnail` refine을 다시 수행한다. 저장값이 유효한 우리 Blob URL이면 trim 결과가 저장값과 같아 통과하고(service:215의 blankToNull도 동일 값 저장, :244의 정리 비교도 trim된 값이라 기존 Blob이 지워지지 않음), 저장값이 레거시 비표준 URL이면 400으로 거부됨. 임의 외부 URL은 어느 경우에도 서버 refine을 통과하지 못함.
5. 빈 값 쪽도 같음: saved가 `""`일 때 입력 `"  "`는 keep 스키마를 거쳐 `"  "`가 전송되고 서버가 trim해 `""`(null 저장)로 처리함.

즉 3차 Low-1이 지적한 불일치는 resolver 쪽만 trim으로 맞춰졌고 save 쪽 비교(원문, keep 스키마가 trim하지 않는 출력)는 그대로여서 완전히 해소되지 않았다. 신뢰 경계(서버 검증)는 유지됨.

## 취약점 목록

| ID | 심각도 | 위치 | 내용 | 수정 방안 |
| --- | --- | --- | --- | --- |
| Low-1 (잔여) | Low | project-form.tsx:72, 84-88 / portfolio.schema.ts:277 | resolver는 trim 비교, keep 스키마 출력과 save 비교는 원문이라 공백만 다른 값이 "변경됨"으로 서버에 전송되고 클라이언트 형식 검증은 건너뜀. 서버가 trim 후 재검증하므로 우회·주입 불가. 영향은 레거시 비표준 URL 저장값일 때 공백만 붙여도 서버 400이 나는 UX 수준 | `projectFormKeepThumbnailSchema`의 thumbnail을 `z.string().trim()`으로 바꾸거나 save 비교를 `thumbnail.trim()`으로 맞춤. 보안상 필수 아님 |
| Info-1 | Info | form-errors.ts:44-50, 57-59 | 재귀 `inputName`이 서버 오류 경로를 `get(values, path)`로 따라 내려가 `setError` 이름으로 씀. 경로는 자체 서버의 zod issue path이고, 재귀는 값 객체의 키를 따라 한 단계씩 내려가며 배열/원시값에서 끝나므로 무한 재귀 없음(폼 값은 JSON 비순환). 오류 문구는 텍스트 노드로만 렌더됨 | 조치 불필요 |
| Info-2 | Info | list-editor.tsx:115-117, experience-list-editor.tsx:71-73, use-admin-form.ts:167-170 | 신규 `data-error-focus` 오류 문구는 `오류: {error}` JSX 텍스트로 렌더되어 이스케이프됨. `dangerouslySetInnerHTML` 없음. id는 `useId` 범위 또는 상수, 포커스 선택자 `'[aria-invalid="true"], [data-error-focus]'`는 정적 문자열이라 입력 유래 값이 섞이지 않음 | 조치 불필요 |

## 항목별 결과

- list-editor / experience-list-editor: DOM id가 `useId()` + index로 만들어지고 사용자 입력이 id에 들어가지 않음. 오류 문구 렌더는 위와 같이 안전.
- use-admin-form.ts: 포커스 선택자는 상수. 알림 문구는 고정 상수, `from=`은 `encodeURIComponent`(47행). 3차와 변동 없음.
- blog.schema.ts: `unique`(39행)는 `[...new Set(values)]`로 기존 중복 제거와 같은 동작이고 `labelList`/`formLabelList`가 공유함. `postUpdateInputSchema`(49-65)는 strictObject 정의와 규칙 그대로이며 categories/tags 출력(문자열 배열, 중복 제거)이 바뀌지 않음. 폼 스키마(`postEditFormSchema`, `postCreateFormSchema`)는 별도 export이고 서버 route가 import하지 않는 구조 유지.
- slug 모달 업로드 차단(project-form.tsx:220-224): `uploadingRef.current`면 메시지만 반환하고 submit하지 않아 업로드 가드 우회가 닫힘. 새 결함 없음.

## 차단 조건 점검

- Critical 미수정: 없음.
- 인증 로직 확인 불가: 아님. 서버 인증 구조(`adminRoute`)는 이번 재작업에서 변경되지 않음.

## 미검증

- 런타임 동작과 diff(소스 읽기 기준).
- 공백 포함 썸네일의 실제 서버 응답은 코드 경로로만 추정했고 요청을 보내 확인하지 않았음.
