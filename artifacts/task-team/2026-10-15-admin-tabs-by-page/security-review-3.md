# 보안 리뷰 3 (T08 재리뷰): admin 폼 react-hook-form 마이그레이션

## 판정

배포 승인. Critical/High/Medium 없음. Low 1건, Info 4건.

범위: 지시된 클라이언트 파일 전체와 서버 route/service 일부(profile, projects/[slug], resume-entries, posts/[slug], parse-body, portfolio-admin-service의 thumbnail 처리)를 Read로 직접 확인함. Bash가 없어 git diff는 쓰지 않았고 현재 파일 상태를 기준으로 검토함.

## 확인 항목별 결과

### 1. 서버 검증 스키마 약화 여부 (통과)

- 서버 route가 쓰는 `profileUpdateInputSchema`(portfolio.schema.ts:142), `projectUpdateInputSchema`(198), `resumeEntryCreateInputSchema`(166), `postUpdateInputSchema`(blog.schema.ts:48)는 정의가 그대로이고 폼 스키마 추가분이 이를 덮어쓰거나 재할당하지 않음.
- 폼 스키마는 모두 별도 이름으로 export됨: `profileSectionFormSchema`(256), `resumeEntryFormSchema`(267), `projectFormSchema`(271), `projectFormKeepThumbnailSchema`(276), `postEditFormSchema`(blog.schema.ts:83), `postCreateFormSchema`(88). `.extend()`는 새 객체를 반환하므로 원본 스키마는 불변.
- `src/` 전체에서 `FormSchema` 사용처를 검색한 결과 서버 쪽(route, services)에서 폼 스키마를 import하는 곳은 없음. route는 여전히 strictObject 기반 서버 스키마로 `parseJsonBody`에서 검증하므로 서버 검증이 최종 방어선임.
- 서버 검증 규칙(`isValidThumbnail`, strict, 길이 상한, https 전용 github 등)은 이번 변경에서 손대지 않음.

### 2. 전송 본문의 의도치 않은 키 (통과)

- profile: `profileSectionFormSchema`는 섹션 키만 골라 `z.object`로 만들어, 폼 값에 `...profile`(profile-form.tsx:22)로 다른 탭 항목이 있어도 출력은 섹션 키만 남음(미지 키는 strip). home은 name/title/tagline/description, about은 skills/tools, contact는 email/github. skills/tools는 `formStringList` 변환으로 `{value}` 객체가 문자열 배열로 되돌아감. 서버는 strict partial이라 다른 섹션 항목을 덮어쓸 수 없음.
- project: 폼 값은 `toValues`(project-form.tsx:32)가 만든 9개 키뿐이고 id가 없음(`toExperienceValues`도 id 제외, draft.ts:8). 썸네일 미변경 시 `const { thumbnail, ...rest } = input`으로 제외(82-86행). 서버는 `input.thumbnail !== undefined`일 때만 갱신(portfolio-admin-service.ts:215)하므로 기존 값 유지. useFieldArray의 `id`는 field key일 뿐 값에 포함되지 않음.
- blog 수정: `slug`를 구조분해로 제외(blog-form.tsx:82)하고 `rest`만 PUT. 서버 `postUpdateInputSchema`는 strict이므로 slug가 섞이면 400이 나지만 제외되어 해당 없음. 경로의 slug는 `encodeURIComponent` 후 서버가 `resolveSlug`로 재검증함.
- talk: 폼 스키마가 `talkUpdateInputSchema` 그대로라 서버와 동일 키.
- resume 생성: `{ kind, ...input }`(resume-entry-form.tsx:61). input은 strictObject 출력 4개 키뿐이라 kind를 덮어쓸 수 없음.
- 폼 전용 필드(`{value}` 래퍼, 점 표기 발행일)는 모두 resolver 출력 단계에서 서버 모양으로 변환됨. 발행일 `YYYY.MM.DD`는 `.`→`-` 변환 후 서버와 같은 `publishedAt` 규칙(실존 날짜 포함)을 재사용(blog.schema.ts:71-74).

### 3. 서버 오류의 setError 경유 HTML 주입 (통과)

- 서버 `fieldErrors`의 값은 `FieldShell`의 `오류: {error}`(text-fields.tsx:57-61), `ListInput`(164행), experience/list 편집기의 `오류: {listError}`에서 모두 JSX 텍스트 노드로 렌더되며 `dangerouslySetInnerHTML`은 쓰이지 않음. React가 이스케이프함.
- 알림(Toast) 문구는 `describeFailure`의 고정 상수 문자열이고 서버 메시지를 쓰지 않음. 알림 링크 href는 상수 경로 또는 `encodeURIComponent(window.location.pathname)`(use-admin-form.ts:47)뿐임.
- 서버 오류 경로 키(`issue.path.join(".")`, parse-body.ts:47)는 `applyServerErrors`에서 RHF 필드 이름으로 쓰임(Info-1 참고).

### 4. Blob URL 검증의 서버 유지 (통과)

- 썸네일: 클라이언트 `projectFormKeepThumbnailSchema`는 `thumbnail: z.string()`으로 형식을 따지지 않지만(276행), 이는 저장된 기존 값과 같을 때만 선택되고 그 경우 값을 서버에 보내지 않음(`thumbnail === savedThumbnail.current ? rest : input`). 값이 바뀌었으면 `projectFormSchema`(`isValidThumbnail` refine 포함)가 적용되고 서버 `projectUpdateInputSchema.thumbnail`도 같은 검증을 다시 수행함. 클라이언트를 우회해 직접 요청해도 서버가 거부함.
- 업로드 route(`uploads/thumbnail`, `uploads/post-image`)는 각각 `isValidThumbnail`/`isValidPostImage`를 서버에서 사용함. `isValidPostImage`는 클라이언트 폼 스키마에서 쓰이지 않으며(블로그 본문은 자유 마크다운), 이는 이번 변경 이전과 동일한 구조임.
- 클라이언트 번들에서 `NEXT_PUBLIC_BLOB_HOSTNAME`이 비어 있으면 `isBlobUrlUnder`가 항상 false라 새 썸네일이 거부될 뿐 보안 약화는 없음(안전 방향 실패).

### 5. resume 생성 kind 클라이언트 검증 누락 (영향 없음)

- 서버 `resumeEntryCreateInputSchema`가 `kind: z.enum(RESUME_KINDS)`를 검증하고 strict이므로 잘못된 kind는 400. `kind`는 서버 페이지가 prop으로 내려주는 값이고 폼 입력이 아님(읽기 전용 표시 칸 `TextField value={noun}`은 `name`이 없어 register되지 않음). 클라이언트 검증 부재는 UX에만 영향.

### 6. 새 의존성 공급망 (통과)

- `react-hook-form` 7.89.0, `@hookform/resolvers` 5.9.1이 package.json 35, 49행에서 `^` 없이 정확 버전으로 고정됨. 기존 zod, next 등 신규 추가 의존성과 같은 방식.
- pnpm-workspace.yaml: `minimumReleaseAge: 10080`(7일 숙성)과 `trustPolicy: no-downgrade`가 유지되고, 이번에 `trustPolicyExclude`를 추가한 흔적은 없음. 설치 시 이 정책이 새 패키지에도 적용됨.
- pnpm-lock.yaml: resolvers 5.9.1의 추가 런타임 의존성은 `@standard-schema/utils@0.3.0` 하나뿐이고 peer로 react-hook-form과 zod에 매핑됨. `ajv@8.20.0`은 resolvers의 optional peer 해석 표기이며 신규 설치 대상이 아님(트리에 이미 있는 버전).
- 미검증: 두 패키지의 npm provenance와 릴리스 시점은 Bash/네트워크가 없어 확인하지 못함. 위 정책(숙성, no-downgrade)이 설치 시 대신 강제함.

## 취약점 목록

| ID | 심각도 | 위치 | 내용 | 수정 방안 |
| --- | --- | --- | --- | --- |
| Low-1 | Low | project-form.tsx:64-73, 82-86 | 썸네일 변경 판정이 resolver에서는 원문(`values.thumbnail === saved`), save에서는 trim된 출력으로 서로 다른 값을 비교함. 앞뒤 공백만 다른 경우 resolver는 엄격 스키마를 선택하고 save는 같은 값으로 보아 제외함. 서버 신뢰 경계는 유지되고 기존 값이 비표준 URL이면 UX상 불필요한 검증 오류가 날 뿐임 | resolver와 save가 같은 비교(둘 다 trim 후)를 쓰도록 맞춤. 보안 영향은 없어 필수 아님 |
| Info-1 | Info | form-errors.ts:49-63 | 서버 오류 키를 그대로 `setError` 이름으로 사용함. 출처는 같은 오리진의 자체 서버(`issue.path.join(".")`)이고 값은 텍스트로만 렌더되므로 위험 없음. `__proto__` 류 키는 서버 스키마 경로에서 나오지 않으며 RHF 내부 set도 해당 키를 막음 | 조치 불필요 |
| Info-2 | Info | portfolio.schema.ts:256-265 | `profileSectionFormSchema`가 `as unknown as`로 타입을 단언하고 `z.object`(strict 아님)를 씀. 타입 안정성이 낮고 미지 키를 거부하지 않고 strip함. 서버가 strict partial로 최종 검증하므로 보안 영향 없음 | 필요 시 타입 단언 대신 `pick` 활용 검토(유지보수 사안) |
| Info-3 | Info | project-form.tsx:85, talk-form.tsx:59, 82 | 경로에 `savedSlug.current`를 인코딩 없이 삽입함(blog는 `encodeURIComponent` 사용). 값은 서버가 `slugSchema`(영문 소문자, 숫자, 하이픈)로 검증해 저장한 slug라 경로 주입 불가 | 일관성을 위해 `encodeURIComponent` 적용 가능 |
| Info-4 | Info | use-admin-form.ts:47-53 | 401 알림의 `from=` 쿼리는 인코딩되어 있으나 소비 측(`/admin/login`)의 `from` 검증은 이번 범위 밖. 보안 리뷰 2에서 이미 기록된 사항과 같음 | 별도 점검 권장 |

## 차단 조건 점검

- Critical 미수정: 없음.
- 인증 로직 확인 불가: 아님. `adminRoute`로 감싸진 route 구조는 이번에 바뀌지 않았고 서버 파일은 변경 없음.

## 미검증

- 런타임 동작은 실행하지 않았음(소스 읽기 기준).
- 서버 쪽은 projects POST, talks, posts POST, resume-entries/[id] route를 개별로 열지 않았음. 폼 스키마가 서버 코드에서 import되지 않는다는 것은 `src/` 전체 검색으로, 나머지 route의 스키마 사용은 같은 패턴(`*InputSchema`)이라는 검색 결과로 확인함.
- 새 의존성의 provenance와 릴리스 날짜.
