# 코드 리뷰 1차: admin 탭 재구성 (T07)

- 대상: feature/admin-tabs-by-page 미커밋 변경 전체 (사이클 시작 c6c53b0)
- 기준: requirements.md 8장(사용자 확정), design-spec.md, api-spec.md
- 확인 방법: git diff 전체와 신규 파일 4개 직접 열람, 잔존 참조 grep, `biome check src`(통과), `knip`(출력 없음, 통과), `tsc`(src 오류 없음, `.next/dev/types` 생성물 구문 오류만 있어 이번 변경과 무관), zod 4 동작 직접 실행 확인

## 판정: 통과 (Critical/High 없음, Medium 1건·Low 3건은 후속 처리 권고)

## 요구사항 충족 확인

| 항목 | 결과 |
|------|------|
| 탭 6개 순서·라벨 (`admin-nav.tsx:8-15`) | 충족 |
| 탭 활성 판정 (`admin-nav.tsx:25-28`) | home은 정확 일치, 나머지는 정확 일치 또는 하위 경로. `/admin/about/resume/..`가 about 활성, home은 하위에서 비활성. 정확함 |
| home 4항목 / about skills, tools / contact 2항목 section별 전송 | `SECTION_SCHEMAS.pick`의 키로 `toInput`을 필터(`profile-form.tsx:41-68`). 전송 항목과 렌더 항목, 검증 항목이 일치. draft는 전체 8항목을 들고 있으나 전송은 section 키만이라 다른 탭 항목을 덮어쓰지 않음. 저장 응답(전체 Profile)으로 `toDraft` 재기준화도 정상 |
| 부분 저장 스키마 (`portfolio.schema.ts:136-138`) | zod 4에서 `strictObject().partial().refine()` 실측: `{}` 거부, 알 수 없는 키 거부, 일부 키 허용. 항목 규칙 재사용. API 상태 코드·`revalidatePath` 유지 |
| 이력 경로 이동 | `resume-entry-form.tsx` 3곳과 `cancelHref`, `sortable-list.tsx:71-75`, about 페이지의 추가 링크 모두 `/admin/about/resume/..`로 갱신. `/api/admin/resume-*` 호출 경로는 API라 정상 유지 |
| 삭제 경로 잔존 참조 | `src`, `tests`, `__tests__`, `docs`, `.claude/skills` grep에서 `/admin/resume`, `/admin/profile`, `AboutSection`, `about-section` 참조 없음. `admin-header-navigation`, `admin-nav-links` CSS 클래스도 참조·정의 모두 제거됨 |
| `safeCallbackUrl` (`login/page.tsx:15-26`) | open redirect 차단 조건(`//`, `\`) 유지, 기본값 `/admin`. `from === "/admin"` 별도 분기는 일반 분기가 흡수하므로 제거가 정당 |
| 로그아웃 `callbackUrl: "/"`, 탭과 DOM 분리 | 충족. `nav` 안에는 링크만 있고 구분선(`aria-hidden`)과 버튼은 nav 밖 |
| 헤더 이름 링크 `/admin` | 충족 |
| 홈 `.about` 삭제 | import와 렌더 제거, 파일 삭제. `profile`은 HeroSection에서 계속 사용 |
| 각 페이지 `metadata` | `"{탭} - admin"` 형식 유지 |
| `requireAdminPage()` | 신규 4개 페이지 모두 호출 |
| 주석 규칙 | 이번 사이클 한정 식별자(D1, P1, 요청 번호) 인용 없음(grep 확인). 새 주석은 명사형·비종결 구절 종결, em-dash 없음, 줄바꿈 기준 준수 |

## Findings

### Medium

**M1. 부분 저장 API 테스트 미추가**
- 위치: `__tests__/schemas/portfolio-schema.test.ts` (변경 없음), requirements.md 7장 4번
- 근거: 완료 기준이 "일부 항목, 빈 객체, 잘못된 값, 알 수 없는 키" 테스트 추가를 요구하나 `profileUpdateInputSchema`를 참조하는 테스트가 없음(`__tests__`, `tests` grep).
- 수정 제안: `portfolio-schema.test.ts`에 `profileUpdateInputSchema`를 실제 소스에서 import해 한글 제목 케이스 4건 추가. 구현 단계가 아직 남아 있다면 T05/T06 재작업 또는 QA 전에 반영.

### Low

**L1. 키가 있고 값이 `undefined`인 객체가 refine을 통과**
- 위치: `src/schemas/portfolio.schema.ts:136-138`
- 근거: `{ name: undefined }`가 검증을 통과함(실측 `true`). `Object.keys` 길이 기준이라 D4 "빈 객체 400"을 우회하며 `set({ updatedAt })`만 실행됨. JSON 본문에서는 `undefined`가 직렬화되지 않아 실제 요청으로는 도달 불가이므로 영향은 낮음.
- 수정 제안: 필요 시 `Object.values(v).some((x) => x !== undefined)`로 교체. 현 상태 유지도 수용 가능.

**L2. about 탭 폼의 취소 링크가 자기 자신을 가리킴**
- 위치: `src/components/admin/profile-form.tsx:52-56, 186`, `about/page.tsx:61`
- 근거: `SECTION_HREFS.about`가 `/admin/about`이라 about 페이지 안의 폼에서 취소는 같은 페이지로 이동(미저장 가드 후 새로고침 효과). home, contact도 동일하게 자기 탭이므로 일관되지만, 요구사항 7번의 "취소 링크를 해당 탭 경로로"는 충족. 동작상 오류는 아니고 UX 의미만 약함.
- 수정 제안: 변경 불필요. 의도 확인용 참고.

**L3. `toInput`의 이중 변환과 타입 단언 성격의 제네릭**
- 위치: `src/components/admin/profile-form.tsx:36, 58-68, 86`
- 근거: 전체 8항목 객체를 만든 뒤 section 키로 필터하고 `validateWith<Partial<ProfileInput>>`로 타입을 좁힘. 동작은 정확하나 `Object.fromEntries`가 타입을 잃어 제네릭으로 보정하는 구조. `SECTION_SCHEMAS[section].shape` 키 추출도 section별 3개 스키마의 union이라 읽기 부담이 있음.
- 수정 제안: 동작 결함 아님. 후속 정리 시 `SECTION_KEYS` 배열 상수 하나로 단순화 가능.

## 죽은 코드·중복
- `profileInputSchema`는 서버에서 `profileUpdateInputSchema`의 원본, 클라이언트에서 section `pick` 원본으로 사용되어 미사용 export 아님. 전체형 `ProfileInput` 타입은 서비스에서 제거되고 `profile-form.tsx:36`에 지역 타입으로만 남음(knip 통과).
- `ProfileDraft`와 `toDraft`는 8항목 전체를 유지하는 설계이며 section 폼 3개가 공유하므로 중복 아님.

## Tailwind canonical 확인
- 신규 클래스에 w/h/p/m/gap 계열 arbitrary value 없음(`h-24 w-px`, `max-w-480`, `min-h-44`, `py-48` 등 토큰형). `w-px`는 1px 구분선이며 `--spacing: 1px`에서 `w-1`과 같은 값이나 Tailwind 기본 유틸이라 문제 없음. `border-l-2`, `pl-12` 정상. 규칙 위반 없음.

## CodeRabbit 교차검토

- 실행: 미실행. 이번 요청이 로컬 미커밋 변경 리뷰이고 시간 제한상 자체 리뷰로 판정함(요청 지시문에 실행 요구 없음, `--base main` 기준 실행은 사이클 최종 리뷰에서 수행 권고).
- 타당 판정 항목: 없음
- 기각 항목: 없음
- 한 줄 요약: CodeRabbit 0건 중 0건 타당(미실행)
