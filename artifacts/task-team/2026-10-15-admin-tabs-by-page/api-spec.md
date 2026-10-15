# API 명세: 프로필 부분 저장

- 입력: `requirements.md` 8장(사용자 확정) 기준. D4(빈 객체 400), D5(낙관적 잠금 없음) 반영.
- DB 스키마 변경과 마이그레이션 없음. `profile` 테이블 id=1 단일 행 갱신 구조 유지.
- 표기: "확인"은 이번 단계에서 코드를 읽어 확인한 사실, "미확인"은 읽지 않은 것.

## 1. 엔드포인트

`PUT /api/admin/profile` 유지. 의미만 "전체 교체"에서 "보낸 항목만 갱신"으로 바꾼다.

### 메서드 결정: PUT 유지 (PATCH로 바꾸지 않음)

근거
1. 확인: 클라이언트 호출처는 `src/components/admin/profile-form.tsx:52`의 `adminRequest("PUT", "/api/admin/profile", ...)` 하나뿐이다 (`src`, `__tests__`, `tests` grep 결과). 이 컴포넌트는 T05에서 탭별 폼으로 분리되므로 호출처 수정은 어차피 발생한다.
2. 확인: `adminRequest`의 `method` 타입이 `"POST" | "PUT" | "DELETE"`라 PATCH로 바꾸면 공용 타입(`src/lib/admin-client/admin-request.ts:15`)까지 수정해야 한다. 서버 쪽 `adminRoute`의 `MUTATING_METHODS`는 PATCH를 이미 포함한다.
3. 요구사항 문서가 "PUT이 보낸 항목만 갱신한다"로 정의했다. 최소 diff 원칙상 메서드를 유지한다.
4. 의미상 PATCH가 더 정확하다는 점은 인정한다. 다만 유일한 소비자가 내부 admin 폼이고 외부 클라이언트가 없어 실익이 작다. PATCH를 원하면 서버 `export const PATCH`, `adminRequest` 타입 확장, 호출처 변경으로 끝나므로 나중에 바꿔도 비용이 낮다.

### 요청

- Content-Type: `application/json` (`parseJsonBody`가 검사, 위반 시 415).
- 본문: 아래 8개 키 중 1개 이상. 모든 키는 선택이다.

| 키 | 검증 (기존 항목 스키마 재사용) |
|----|-----|
| `name` | `shortText` |
| `title` | `shortText` |
| `tagline` | `longText` |
| `description` | `longText` |
| `email` | `z.email(...)`, `SHORT_TEXT_MAX` 이하 |
| `github` | `httpsUrl` |
| `skills` | `stringList` |
| `tools` | `stringList` |

규칙
- 알 수 없는 키는 거부한다(`strictObject` 유지). 미확인: zod 4에서 `.partial()`이 strict를 유지하는지 구현 시 확인 필요(유지되지 않으면 `z.strictObject(profileInputSchema.shape)`에 partial 적용 등으로 대체).
- 빈 객체 `{}`는 400 `VALIDATION_FAILED`로 거부한다. DB 쓰기와 `updatedAt` 갱신 없음.
- `null`은 거부한다. 항목 스키마가 nullable이 아니므로 별도 처리 없이 400이 된다. 삭제 의미로 쓸 수 없다.
- JSON 직렬화 시 `undefined` 값은 키 자체가 사라지므로, 모든 키가 `undefined`였던 요청은 빈 객체와 같이 400이다.
- 빈 문자열 등 값 규칙은 각 항목 스키마의 기존 규칙을 그대로 따른다(`shortText` 등의 세부 min/max는 이번에 미확인).
- 보낸 항목만 `set`에 들어가고 나머지 컬럼은 변하지 않는다. 보낸 항목은 값이 같아도 `updatedAt`이 갱신된다.

### 응답

성공: `200`, 본문 `CustomData<Profile>` = `{ data: Profile, status: 200 }`. 갱신 후 전체 프로필이며 `toProfile(row, true)` 결과로 기존과 동일하다.

### 상태 코드 (`HttpStatusCode`)

| 상태 | code | 조건 |
|------|------|------|
| 200 `Ok` | - | 갱신 성공 |
| 400 `BadRequest` | `VALIDATION_FAILED` | 잘못된 JSON, 항목 검증 실패, 알 수 없는 키, 빈 객체. `fieldErrors`에 키별 메시지, 빈 객체는 키 `""` |
| 401 `Unauthorized` | `UNAUTHORIZED` | 세션 없음 (`adminRoute`) |
| 403 `Forbidden` | `FORBIDDEN`, `FORBIDDEN_ORIGIN` | allowlist 외 계정, Origin 불일치 (`adminRoute`) |
| 409 `Conflict` | `NOT_SEEDED` | id=1 행 없음. `apiErrors.notSeeded()`가 409로 정의되어 있고 `admin-route.ts`가 `PortfolioNotSeededError`를 참조함. 매핑 코드 세부는 미열람 |
| 413 `PayloadTooLarge` | `PAYLOAD_TOO_LARGE` | 본문 256KB 초과 |
| 415 `UnsupportedMediaType` | `UNSUPPORTED_MEDIA_TYPE` | JSON이 아닌 Content-Type |

### 부수 동작

- `revalidatePath("/", "layout")` 호출 유지 (갱신 성공 후, 응답 전).
- 동시성(D5): 항목 단위 갱신이므로 서로 다른 탭이 보낸 항목은 덮어쓰지 않는다. 같은 항목은 마지막 요청이 이긴다. 낙관적 잠금 없음.

## 2. 스키마·서비스 변경 (최소 diff)

### `src/schemas/portfolio.schema.ts`

- `profileInputSchema`(전체형, 124행)는 그대로 둔다. 확인: 서버 사용처는 `route.ts`뿐이고 시드 등 다른 사용처는 없다(src, scripts, __tests__, tests grep). 클라이언트 `profile-form.tsx`는 T05에서 제거되지만 기존 스키마 테스트가 이 이름을 참조하고, 항목 규칙의 단일 원본으로 쓰이므로 유지한다.
- 추가: 부분 저장 스키마 하나.

```ts
export const profileUpdateInputSchema = profileInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "변경할 항목이 없습니다");
```

- 타입 `ProfileInput`(227행)은 확인상 소비자가 `updateProfile` 하나뿐이다. 이를 `ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>`로 대체한다. 전체형 타입을 남기면 미사용 export로 knip에 걸릴 수 있다.
- 이 스키마는 서버 전용이다. refine 이후에는 `.pick`을 쓰지 않으므로 클라이언트는 아래 3장대로 `profileInputSchema.pick`을 쓴다.

### `src/services/portfolio/portfolio-admin-service.ts`

- `updateProfile(input: ProfileUpdateInput)`로 시그니처만 변경. 본문 `set({ ...input, updatedAt: new Date() })`은 그대로 둔다. drizzle `set`은 `undefined` 값을 무시하므로 키가 없는 컬럼은 갱신되지 않는다(drizzle 동작은 미실행 검증, 구현 후 확인). 반환 `toProfile(row, true)`와 `PortfolioNotSeededError` throw 유지.
- import의 `ProfileInput`을 `ProfileUpdateInput`으로 교체.

### `src/app/api/admin/profile/route.ts`

- `profileInputSchema`를 `profileUpdateInputSchema`로 교체하는 것이 전부다. `adminRoute`, `parseJsonBody`, `ok`, `revalidatePath` 구조 유지.

## 3. 클라이언트용 항목 스키마 export 방식

신규 export를 만들지 않는다. T05가 각 탭 폼 파일에서 이미 export된 `profileInputSchema`로 직접 pick한다.

```ts
// 예: home 탭 폼
const homeSchema = profileInputSchema.pick({
  name: true, title: true, tagline: true, description: true,
});
```

- about: `skills`, `tools`. contact: `email`, `github`.
- 근거: 어느 항목이 어느 탭에 속하는가는 UI 결정이라 프론트 소유다. 스키마 파일에 탭별 export를 두면 소비자가 붙기 전까지 미사용 export가 되어 knip에 걸릴 수 있고, 항목 규칙은 `profileInputSchema` 한 곳에 남는다.
- `pick` 결과도 strict이므로 탭 폼의 `toInput`은 해당 탭 항목만 만들어야 한다.
- 서버는 탭을 모르고 8개 키의 임의 부분집합을 받는다.

## 4. T06 구현 파일 목록 (API·스키마·서비스만)

| 파일 | 변경 |
|------|------|
| `src/schemas/portfolio.schema.ts` | `profileUpdateInputSchema` 추가, `ProfileInput` 타입을 `ProfileUpdateInput`으로 교체 |
| `src/services/portfolio/portfolio-admin-service.ts` | `updateProfile` 시그니처와 import 변경 |
| `src/app/api/admin/profile/route.ts` | 스키마 교체 |

프론트(`src/components/admin/*`, `src/app/admin/**`)는 T05 범위이며 여기에 없다. `profile-form.tsx`가 `profileInputSchema`를 import하므로 전체형 스키마는 삭제하지 않는다. 메서드가 PUT 유지이므로 `admin-request.ts` 변경 없음.

## 5. 영향받는 기존 테스트 (새 테스트 담당 배정 없음)

| 파일 | 영향 |
|------|------|
| `__tests__/schemas/portfolio-schema.test.ts` (139~149, 206행) | `profileInputSchema` 전체형을 검증하며 전체형을 유지하므로 깨지지 않을 것으로 예상. 구현 후 전체 실행으로 확인 |
| profile 라우트·`updateProfile` 직접 호출 테스트 | 확인: `__tests__`, `tests` grep에서 `api/admin/profile`, `updateProfile` 참조 없음 |

## 6. 보안·검증

- 인증은 `adminRoute`(세션, allowlist, PUT의 Origin 검사)가 그대로 처리하며 변경 없음.
- 입력은 `strictObject` + 항목 스키마로 서버에서 재검증한다. 클라이언트 검증에 의존하지 않는다.
- SQL은 drizzle 쿼리 빌더를 쓰므로 문자열 결합 경로 없음.
