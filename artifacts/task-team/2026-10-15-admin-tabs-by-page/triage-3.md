# triage-3: 3차 리뷰(RHF 마이그레이션) 재검토 (orchestrator 9-1 게이트)

대상: `code-review-3.md`(통과, M1 M2 L1~L6), `security-review-3.md`(배포 승인, Low-1, Info-1~4). 각 finding은 실제 코드를 열어 확인함.

| finding | 확인한 코드 | 타당성 | 처리 |
|---------|-------------|--------|------|
| T07 M1 경험 항목 DOM id가 RHF 랜덤 id | `experience-list-editor.tsx:76` `experience-${item.id}-...`, `react-hook-form/dist/index.esm.mjs:672` `generateId`가 `crypto.randomUUID()` | 타당 (SSR과 클라이언트 id 불일치, 담당자 프로브에서도 hydration 경고 1회) | 재작업: `useId` 범위 + index 기반 id로 교체 |
| T07 M2 폼 스키마·form-errors 테스트 없음 | `__tests__/`에 해당 import 없음 | 타당 | 재작업 아님. 신규 테스트는 T09 QA 계약 |
| T07 L1 낡은 주석 | `project-form.tsx:89` "저장 응답의 새 experience id를 key로" | 타당 | 사용자 결정: 포함 |
| T07 L2 중복 제거 transform 중복 | `blog.schema.ts:38-46` | 타당 | 사용자 결정: 포함 |
| T07 L3 slug 모달이 업로드 가드 우회 | `project-form.tsx:124` 가드, 모달 `onConfirm`의 `form.submit()` | 타당 (발생 가능성 낮음) | 사용자 결정: 포함 |
| T07 L4 객체 항목 경로 서버 오류 미표시 | `form-errors.ts` `inputName` | 타당 (현재 스키마로는 도달 경로 없음) | 사용자 결정: 포함 |
| T07 L5 렌더마다 섹션 스키마 생성 | `profile-form.tsx:47` | 타당 | 사용자 결정: 포함 |
| T07 L6 배열 루트 오류가 포커스 대상에서 빠짐 | `use-admin-form.ts:166` `[aria-invalid="true"]` 탐색 | 타당 | 사용자 결정: 포함 |
| T08 Low-1 썸네일 변경 판정 trim 불일치 | `project-form.tsx:64-73` 원문, `82-86` trim된 값 | 타당 (서버 검증 유지) | 사용자 결정: 포함 |
| T08 Info-1~4 | - | 위험 없음 | 처리 없음 |

## 재작업 결과 (2026-10-15)

- 수행자: frontend-developer(worktree 격리), orchestrator가 diff 추출 후 메인 반영.
- M1: `experience-list-editor.tsx` DOM id를 `useId()` 범위 + index로 교체, key는 `item.id` 유지.
- L1: `project-form.tsx` onSaved 주석을 "저장 응답으로 폼 기준값을 갱신, 생성 후에는 편집 화면으로 이동"으로 수정.
- L2: `blog.schema.ts` `unique` 헬퍼로 두 transform 통합.
- L3: slug 변경 모달 `onConfirm`이 업로드 중이면 "이미지 업로드가 끝난 뒤 저장하세요." 반환.
- L4: `form-errors.ts` `inputName`이 객체는 첫 키로, 배열은 `.root`로 재귀.
- L5: `profile-form.tsx` `SECTION_RESOLVERS` 모듈 상수.
- L6: 목록 root 오류 문구에 `id`·`tabIndex={-1}`·`data-error-focus`, 목록에 `aria-describedby`, 첫 오류 포커스 선택자에 `[data-error-focus]` 추가.
- 보안 Low-1: resolver 비교를 `values.thumbnail?.trim()`으로 맞춤.
- 검증(메인): tsc(.next/dev 제외) 통과, vitest 408 통과, knip·biome·주석 검사 통과.
