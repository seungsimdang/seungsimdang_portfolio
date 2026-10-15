# 코드 리뷰 3차: admin 폼 react-hook-form 마이그레이션 (T07)

- 범위: RHF 전환분(의존성, form-errors, use-admin-form, draft, 폼 5종, 목록 편집기 4종, text-fields, blog·portfolio 스키마)
- 확인 방법: 대상 파일 전문 열람, `git diff`, `node_modules/@hookform/resolvers/zod/dist/zod.d.ts`, RHF `generateId` 소스 확인. `pnpm exec vitest run` 30파일 408건 통과
- 한계: 브라우저 미실행. 아래 결함은 모두 코드 열람 기준

## 판정: 통과 (Critical/High 없음, Medium 2건·Low 6건은 후속 권고)

## 확인 항목별 결과

### 1. 동작 보존
- 클라이언트 검증 실패: `handleSubmit`의 invalid 콜백이 `N개 항목을 확인하세요.` 토스트를 띄우고 `focusTick`으로 첫 `aria-invalid="true"` 칸에 포커스함 (`use-admin-form.ts:164-176`, `:149-157`). 정상
- 서버 400 매핑: `inputName`이 `skills.0`을 `skills.0.value`, 배열 경로를 `.root`로 바꾸고 `useFieldError`가 `name`과 `name.root`를 모두 읽음 (`form-errors.ts:19-53`). 정상
- 401/403/404/429/NOT_SEEDED/LIMIT_EXCEEDED/SLUG_CONFLICT 문구는 `describeFailure`가 그대로 유지 (`use-admin-form.ts:46-114`)
- 이탈 확인: `useLeaveConfirm(formState.isDirty)`. 저장 성공 후 `reset(next ?? getValues())`로 기준값 갱신, create 경로는 `router.push` 전에 dirty가 false가 됨. 정상
- 변경 취소: `discard()`가 `reset()`과 토스트 정리 (`:201-204`). profile 3개 섹션 모두 동일
- 프로젝트 썸네일: 리졸버가 `values.thumbnail === savedThumbnail.current`일 때 `projectFormKeepThumbnailSchema`로 검증하고 save가 같은 비교로 PUT에서 제외 (`project-form.tsx:78-86`, `:99-105`). 바꿨다가 원복한 경우도 제외됨. 정상
- blog `.md` 가져오기: `reset(values, { keepDefaultValues: true })`로 기준값을 유지해 isDirty가 true가 되고 오류도 초기화됨 (`blog-form.tsx:124-142`). 정상
- 발행일: 폼은 `YYYY.MM.DD`, `formPublishedAt`이 trim 후 `.`을 `-`로 바꿔 서버 날짜 스키마에 `pipe`함 (`blog.schema.ts:70-74`). 정상
- profile: `profileSectionFormSchema`가 섹션 키만 골라 비엄격 `z.object`로 검증하므로 출력에 해당 키만 남아 그 키만 PUT됨 (`portfolio.schema.ts:253-262`). 정상
- resume 생성: `{ kind, ...input }` POST, 수정은 kind 없이 PUT (`resume-entry-form.tsx:53-61`). 정상

### 2. 스키마 조합
- 서버 규칙 재정의 없음. 폼 스키마는 서버 스키마를 `extend`하고 목록 항목만 `{ value }`로 바꿔 transform으로 되돌림 (`formStringList`, `formLabelList`, `formPublishedAt`)
- 폼 출력이 서버 입력과 같은 모양인지는 구조상(extend + transform) 맞지만 자동 검증이 없음. M2 참고

### 3. useFieldArray
- `key={item.id}`, 항목은 `{ value }` 객체로 원시값 배열 금지 규칙 준수
- 추가는 `append`의 기본 `shouldFocus`로 새 항목 첫 입력에 포커스 (이전의 `focusLater` 동작과 동일 결과)
- 삭제 포커스(`list-editor.tsx:37-47`)는 `Math.min(index, length-2)` 자리, 항목이 없으면 추가 버튼. 이전 `next[index] ?? next[index-1]`과 같음
- aria-live 문구는 이전과 동일 형식 유지

### 4. 타입 단언
- `schemaResolver`의 `as unknown as`: `zodResolver`는 zod3·zod4 오버로드가 섞여 있고 제네릭 `S`에서는 `z.input/z.output` 추론이 호출 쪽에서 고정되지 않아 타당함. 반환 타입을 `Resolver<z.input<S>, unknown, z.output<S>>`로 명시해 호출부 타입은 보존됨. 허용
- 그 외 단언 `defaultValues as never`(`use-admin-form.ts:139`), `methods.setError as unknown as UseFormSetError<FieldValues>`(`:186`), `profileSectionFormSchema`의 `as unknown as` 3곳이 제네릭 한계를 우회함. `any` 남용은 없음. L5 참고

### 5. 죽은 코드·마크업
- `moveItem`은 `sortable-list.tsx`가 계속 사용, `toValueItems`·`toExperienceValues`·`focusAfterRender` 모두 사용처 있음. 죽은 코드 없음
- 마크업·문구 변경 없음 (`FormActionBar`의 "변경 취소"는 이전 사이클분)

### 6. 주석
- 요구사항 ID·finding ID·게이트 ID 인용 없음 (grep 확인). 종결어미·줄바꿈 기준 위반 없음. 한 건의 낡은 주석은 L1

### 7. 미검증 영역 코드 점검
- project·talk slug 변경 모달: `submit`이 검증보다 먼저 모달을 열고 확인 시 `form.submit()`을 호출함. 취소 시 아무 변화 없음. 흐름 정상 (L3의 우회만 존재)
- blog 삭제·가져오기 덮어쓰기 모달, resume 폼: 결함 없음

## Findings

### Medium

**M1. 경험 카드의 DOM id가 `useFieldArray`의 랜덤 `item.id`에서 만들어져 SSR 하이드레이션 불일치 발생 가능**
- 위치: `src/components/admin/experience-list-editor.tsx:76` (`id = experience-${item.id}-${name}`), 사용처 `:90-153`
- 근거: RHF의 `generateId`는 `crypto.randomUUID()`라(`react-hook-form/dist/index.esm.mjs:672`) 서버 렌더와 클라이언트 첫 렌더의 `field.id`가 다름. 이 값이 `fieldset aria-labelledby`, `h3 id`, 각 입력의 `id`·`htmlFor`·`aria-describedby`로 렌더되어 프로젝트 수정 화면에서 경험이 1개 이상이면 dev에서 hydration mismatch 경고가 나고, prod에서는 서버가 낸 id가 DOM에 남아 클라이언트가 계산한 id와 어긋남(label·describedby 연결이 서버 id로 유지되므로 당장 깨지진 않으나 이후 재렌더에서 새로 생기는 요소와 id 체계가 섞임)
- 시나리오: 경험이 있는 프로젝트의 `/admin/projects/{slug}`를 새로고침
- 수정 제안: id에 `item.id` 대신 `useId()` 접두어와 `index`를 쓰거나, 폼 값에 SSR 안전한 안정 키(저장된 experience id)를 두지 않을 거면 `useId` + index 조합. `key`는 `item.id` 유지
- 브라우저 미실행이라 경고 발생 여부는 미확인

**M2. 이번 전환의 핵심 로직에 테스트가 없음**
- 위치: `__tests__/schemas/`에 `blog-schema.test.ts`, `portfolio-schema.test.ts`가 있으나 `postCreateFormSchema`·`postEditFormSchema`·`projectFormSchema`·`resumeEntryFormSchema`·`profileSectionFormSchema`·`profileUpdateInputSchema`·`form-errors.ts`를 import하는 테스트 없음 (`grep` 확인)
- 근거: 확인할 점 2번(폼 출력 = 서버 입력 모양)과 서버 경로 매핑(`skills.0`→`skills.0.value`, 배열→`.root`), `countErrors`가 자동 검증 없이 육안에 의존함. code-review-2 L2(`profileUpdateInputSchema` 테스트 부재)도 아직 이월 상태
- 수정 제안: 실제 소스 import로 (a) 폼 스키마 `parse` 출력이 서버 입력 스키마 `parse`를 통과하고 같은 모양인지(문자열 목록·발행일 변환·중복 제거), (b) `profileSectionFormSchema` 섹션별 출력 키, (c) `applyServerErrors` 경로 변환(`setError` 호출 인자), (d) `countErrors` 개수, (e) `profileUpdateInputSchema`의 `{}`·`{ name: undefined }` 거부를 한글 제목으로 추가

### Low

**L1. 낡은 주석**
- `src/components/admin/project-form.tsx:109`: "저장 응답의 새 experience id를 key로 삼아 폼 기준값을 갱신"인데 이제 key는 RHF `field.id`이고 서버 id를 쓰지 않음. 실제 동작(기준값 갱신, slug 변경 시 replace, 생성 시 이동)에 맞게 수정

**L2. blog 스키마의 중복 제거 transform 중복**
- `src/schemas/blog.schema.ts:38-46`: `[...new Set(...)]`가 `labelList`와 `formLabelList`에 각각 있음. 사소하나 `labelList`를 `formLabelList`의 항목 스키마 인자로 합치면 한 곳이 됨

**L3. 슬러그 변경 확인 경로가 업로드 중 가드를 우회**
- `project-form.tsx:130-137`, `:208-211`: 업로드 중이면 `submit`이 먼저 막지만, 모달을 연 뒤 업로드가 시작되면 확인 버튼이 `form.submit()`을 직접 호출해 `uploadingRef` 검사를 거치지 않음. 모달이 열린 동안 업로드를 시작하기는 어려워 실제 발생 가능성은 낮음

**L4. 서버 오류 경로가 객체 항목이면 칸에 표시되지 않음**
- `form-errors.ts:35-40`: `experiences.0.links.1`처럼 `{label,url}` 객체 경로는 `isValueItem`이 아니므로 그대로 `setError`되어 어떤 입력도 읽지 않음. 서버 zod는 보통 `links.1.url` 말단 경로를 내므로 객체 단위 오류(예: refine)가 생길 때만 해당. 토스트 "입력값을 확인하세요."만 보임

**L5. 폼 컴포넌트마다 리졸버·스키마를 렌더마다 재생성**
- `profile-form.tsx:55`의 `schemaResolver(profileSectionFormSchema(section))`는 렌더마다 zod 객체를 새로 만듦. 동작 문제는 없으나 `useMemo`나 모듈 상수 맵으로 한 번만 만들 수 있음. `profileSectionFormSchema`의 `as unknown as` 단언도 같은 맥락에서 키별 출력 타입을 포기한 결과라, 섹션별 스키마 3개를 상수로 두면 단언이 사라짐

**L6. 배열 전체 오류는 포커스 대상이 없음**
- `list-editor.tsx:101`, `experience-list-editor.tsx:66`: 배열 루트 오류는 `<p>`만 렌더하고 `aria-invalid` 요소가 없어 첫 오류 포커스가 건너뜀. 항목 수 상한(50)은 추가 버튼 비활성으로 이미 막혀 실제로는 서버 400 외에는 발생하지 않음

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --base main`, 상태 완료 (무료 CLI 허용량 사용)
- 결과: 0건, 타당 판정 항목 없음, 기각 항목 없음
- 한 줄 보고: CodeRabbit 0건 중 0건 타당

## 요약

동작 보존 항목은 모두 코드상 확인됨. 재작업이 필요한 Critical/High는 없음. 후속으로 M1(경험 카드 DOM id)과 M2(폼 스키마·경로 매핑 테스트)를 권고하며, orchestrator가 심각도와 무관하게 재작업 여부를 정함.
