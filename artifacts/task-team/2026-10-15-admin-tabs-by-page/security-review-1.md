# 보안 리뷰 1차 (T08)

판정: 통과 (배포 승인). Critical 0, High 0, Medium 0, Low 2(참고), 코드 수정 없음.

## 검토 범위

profile route, `profileUpdateInputSchema`, `updateProfile`, login page `safeCallbackUrl`, login-panel, sign-out-button, console layout, 새 admin 페이지 5종, `src/proxy.ts`, `admin-route.ts`, `parse-body.ts`, `require-admin.ts`, profile-form, resume-entry-form, admin-nav. 삭제된 `resume/`, `profile/` 페이지와 `about-section.tsx`는 잔존 참조 위험만 확인했다.

## 확인 항목별 결과

### 1. 부분 저장 입력 검증 (통과)

- `profileInputSchema`가 `z.strictObject`이고 `.partial()` 뒤에도 strict가 유지되므로 알 수 없는 키(`id`, `updatedAt`, `__proto__` 포함)는 400으로 거부된다.
- `null`은 각 필드가 string 또는 배열 스키마라 거부된다. JSON에는 `undefined`가 없다.
- 빈 객체는 `refine(keys > 0)`로 거부된다.
- `updateProfile`은 `{ ...input, updatedAt: new Date() }`를 `.set`에 넘긴다. input 키가 화이트리스트(name, title, tagline, description, email, github, skills, tools)로 제한되므로 mass assignment로 `id`나 `updatedAt`을 덮어쓸 수 없다.
- where는 `profile.id = 1`로 고정이라 대상 행을 바꿀 수 없다.
- 본문 크기 256KB 상한, Content-Type 검사, 필드별 길이 상한(shortText, longText, stringList, URL_MAX)이 유지된다.

### 2. 인증, 인가, Origin (통과)

- `PUT /api/admin/profile`은 `adminRoute`로 감싸져 있다. 변경 메서드에서 Origin 검사, `requireAdmin`(세션과 allowlist, 401/403), 쓰기 쿼터 소모 순서가 그대로다.
- `proxy.ts` 1차 방어(JWT 존재 확인)와 matcher(`/admin/:path*`, `/api/admin/:path*`)는 변경이 없다.

### 3. 새 admin 페이지 인증 (통과)

- `(console)/layout.tsx`가 `requireAdminPage()`를 호출한다.
- `page.tsx`, `about/page.tsx`, `about/resume/new/page.tsx`, `about/resume/[id]/page.tsx`, `contact/page.tsx`가 각자 `requireAdminPage()`를 호출한다. 인증 누락은 없다. 이는 layout과 page가 별도 렌더 경로일 수 있다는 점을 고려한 이중 방어로 적절하다.
- `getProfile(true)`(비공개 포함 읽기)는 모두 가드 뒤에서만 호출된다.
- `new` 페이지의 `kind`는 `RESUME_KINDS.find`로 화이트리스트 검증 후 `notFound()`로 처리된다. `[id]` 페이지는 DB 조회 결과 안에서만 찾아 임의 입력이 쿼리로 가지 않는다.

### 4. Open redirect (통과)

- 로그인 `from`: `/admin` 정확 일치 또는 `/admin/` 접두만 허용하고 `//`와 `\`를 포함하면 기본값 `/admin`으로 대체한다. 항상 같은 오리진의 `/admin` 하위 경로라 외부 도메인으로 이동할 수 없다. `/admin/../x` 형태도 같은 오리진 내부로만 해석된다.
- 로그아웃 `callbackUrl`은 상수 `"/"`로 고정이라 사용자 입력이 없다.
- 이미 인증된 상태에서 login 페이지가 `redirect(callbackUrl)`을 쓰지만 같은 검증을 거친 값이다.
- proxy가 만드는 `from=${pathname}${search}`는 `loginUrl` 파라미터로 인코딩되어 들어가고, 소비 측에서 위 검증을 다시 거친다.

### 5. XSS (통과)

- `src/` 전체에 `dangerouslySetInnerHTML`, `innerHTML` 사용이 없다.
- 새 페이지와 폼의 값(이름, 제목, 이력 title 등)은 모두 React 텍스트 노드와 속성으로만 렌더된다.
- `new?kind=${kind}` 링크는 서버 상수(`RESUME_ADMIN_SECTIONS`)로 구성된다.
- `github` URL은 `httpsUrl` 스키마로 서버에서 스킴이 제한된다.

### 6. 시크릿, 의존성 (통과)

- 이번 변경에 시크릿, 키 노출이나 새 외부 의존성 추가는 없다.

## 취약점 목록

| 심각도 | 건수 |
|--------|------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 2 (참고) |

### L-1 (Low, 참고) 탭 간 마지막 저장 우선

탭별 부분 저장으로 다른 탭의 항목을 덮어쓰는 문제는 해소되었다. 같은 탭을 두 브라우저 창에서 편집하면 마지막 저장이 이긴다. 단일 관리자 전제에서 허용 가능하며 보안 결함은 아니다. 수정 불필요.

### L-2 (Low, 참고) requireAdminPage의 redirect에 from 없음

`requireAdminPage`는 `/admin/login`으로만 보내고 원래 경로를 넘기지 않는다. 보안 영향은 없고 편의성 문제이며 proxy가 대부분 `from`을 붙인다. 수정 불필요.

## 배포 판정

승인. Critical, High 취약점이 없고 인증 로직을 모두 확인했다.
