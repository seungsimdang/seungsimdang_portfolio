# 보안 리뷰 5 (T08 사이클 전체 최종 리뷰)

## 판정

배포 승인. Critical/High/Medium 없음. Low 1건(신규), Info 4건.

범위: 지시된 서버, 인증·이동, 페이지, 폼·클라이언트, 의존성 파일을 Read로 직접 확인함. 1~4차에서 처리·기각된 항목(같은 탭 마지막 저장 우선, `requireAdminPage`의 `from` 없음, 썸네일 trim 불일치, 미저장 로그아웃 가드)은 다시 올리지 않음. Bash가 없어 diff, 런타임, `pnpm audit`는 실행하지 않았고 현재 파일 상태 기준임.

## 확인 항목별 결과

### 1. 새 admin 페이지 보호
- 5개 새 페이지 모두 첫 줄에서 `await requireAdminPage()` 호출: `(console)/page.tsx:12`, `about/page.tsx:18`, `about/resume/new/page.tsx:19`, `about/resume/[id]/page.tsx:20`, `contact/page.tsx:11`.
- 데이터 조회(`getProfile`, `getResumeByKind`)는 모두 가드 뒤에 있어 미인가 상태로 데이터가 읽히지 않음.
- `requireAdminPage`는 `requireAdmin`(세션 + allowlist, `require-admin.ts:16-31`)을 호출하고 실패 시 redirect. `proxy.ts`의 matcher(`/admin/:path*`, `/api/admin/:path*`)가 JWT 존재를 1차로 확인하며 `/admin/login`만 통과시킴. 새 경로는 모두 `/admin/` 하위라 matcher 범위 안.
- `resume/new`의 `kind`는 `RESUME_KINDS.find`로 화이트리스트 검증, 불일치 시 404 (`new/page.tsx:21-22`). `[id]`는 DB에서 읽은 목록에서 찾은 항목만 렌더하고 없으면 404 (`[id]/page.tsx:22-25`).
- 삭제된 구 경로(`resume/**`, `profile/page.tsx`)가 남은 곳이 없는지는 `src/app/admin/**/*.tsx` 목록으로 확인함. 구 경로 잔존 없음.

### 2. 로그인 callbackUrl/from 검증 (open redirect)
- `login/page.tsx:16-26` `safeCallbackUrl`: `/admin` 정확 일치 또는 `/admin/` 접두만 허용하고 `//`, `\` 포함 시 기본값 `/admin`. 절대 URL, `//evil.com`, `/\evil.com`, `javascript:` 모두 `/admin/` 접두 조건에서 탈락.
- 같은 값이 서버 redirect(`login/page.tsx:32`)와 `signIn("github", { callbackUrl })`(`login-panel.tsx:68`)에 쓰임. 클라이언트로 내려가는 값도 이미 검증된 값. next-auth v4의 기본 redirect 콜백도 동일 출처만 허용하므로 이중 방어.
- 클라이언트가 만드는 `from`(`use-admin-form.ts:47`)은 `window.location.pathname`을 `encodeURIComponent`로 인코딩하고 서버에서 다시 검증됨. `proxy.ts:34`의 `from`은 `pathname + search`로 `/admin` 하위만 도달하며 로그인 페이지에서 재검증됨.
- 판정: open redirect 없음.

### 3. 로그아웃 흐름의 세션 종료 보장
- `sign-out-button.tsx:15-29`: 일반 좌클릭만 가로채 `preventDefault` 후 `await signOut({ redirect: false })` 성공 뒤에만 `router.push("/")`. 세션 종료 전에는 이동하지 않으므로 "이동했는데 세션이 살아 있는" 상태는 생기지 않음.
- 보조 키 클릭(`event.button !== 0` 또는 modifier)은 링크 기본 동작으로 새 탭에 `/`만 열고 세션은 끝나지 않음. 의도된 동작이며 세션을 끝낸다고 가정하는 UI가 아님(버튼 라벨 logout이지만 새 탭 열기는 사용자가 명시적으로 선택한 우회). 보안 영향 없음.
- `signOut`은 next-auth가 CSRF 토큰으로 `/api/auth/signout` POST를 호출하므로 로그아웃 CSRF는 next-auth 기본 방어를 따름. 외부 사이트가 로그아웃을 강제하는 경로는 이번 변경이 새로 만들지 않음.
- 신규 Low-1 참조.

### 4. 부분 저장 API 입력 검증
- `route.ts:8-13`: `adminRoute`로 감싸 세션/allowlist/Origin 검사 유지, `parseJsonBody(request, profileUpdateInputSchema)`로 서버 재검증 후 `updateProfile`. 변경 없는 구조.
- `portfolio.schema.ts:130-147`: `profileInputSchema`는 `strictObject`이고 `.partial()` 후 `.refine`. 알 수 없는 키 거부는 zod 4의 `partial`이 catchall(strict)을 보존하는 동작에 기대며, 이번 단계에서 요청을 보내 실증하지는 않음(미검증).
- 빈 객체 `{}`와 값이 모두 `undefined`인 객체는 refine(`Object.values(v).some(value !== undefined)`)으로 400. JSON 경로에서 `undefined`는 키가 사라지므로 `{}`와 동일.
- `null`은 각 항목 스키마가 nullable이 아니라 400.
- 항목 규칙(`shortText`/`longText` trim+min+max, `email`, `httpsUrl`은 https만, 목록 50개 제한)이 전체형과 동일하게 적용됨. 서버 검증 약화 없음.
- 덮어쓰기: `portfolio-admin-service.ts:124-128`의 `set({ ...input, updatedAt })`에서 input은 zod 파싱 결과이고 보내지 않은 키는 존재하지 않아 drizzle이 갱신하지 않음. 파싱 결과는 strict라 `id` 등 임의 컬럼을 끼워 넣을 수 없음. `where(eq(profile.id, 1))` 고정.
- SQL은 drizzle 빌더 사용, 문자열 결합 없음. 행이 없으면 `PortfolioNotSeededError`(409).

### 5. 폼 스키마 추가가 서버 검증을 약화시키는가
- 폼 전용 스키마(`profileFormSchema`, `profileSectionFormSchema`, `resumeEntryFormSchema`, `projectFormSchema`, `projectFormKeepThumbnailSchema`, `blog`의 `postEditFormSchema`/`postCreateFormSchema`)는 별도 export이고 route는 서버 스키마(`profileUpdateInputSchema` 등)만 import함. 폼 스키마는 서버 스키마를 `extend`/`shape` 재사용하므로 규칙이 갈라지지 않음.
- `profileSectionFormSchema`는 `z.object`(비 strict)라 폼 값의 다른 키를 제거하고 해당 섹션 키만 전송. 클라이언트 완화는 UX일 뿐 서버는 항상 strict로 재검증.
- `projectFormKeepThumbnailSchema`(`portfolio.schema.ts:276-278`)는 `z.string().trim()`으로 형식 검증을 건너뛰지만, 값이 저장값과 같을 때만 서버로 보내지 않는 경로를 타고, 다른 값은 서버 `thumbnail` refine(Blob 호스트/경로, 사용자정보·포트·쿼리·해시 금지)이 막음. 4차 결론 유지.
- `isBlobUrlUnder`(`portfolio.schema.ts:19-39`)는 이번 사이클에서 약화된 흔적 없음.

### 6. XSS 경로
- `src/components/admin` 전체에서 `dangerouslySetInnerHTML`/`innerHTML` 없음(Grep 확인). 오류 문구, 알림, 항목 제목은 JSX 텍스트로 렌더됨.
- `href` 동적 값: `about/page.tsx:38`은 `kind`가 `RESUME_KINDS` 상수, `sortable-list.tsx:71-75`는 DB의 uuid/slug(slug는 `SLUG_PATTERN`으로 제한), `blog-form.tsx:92`는 `encodeURIComponent`. `toast-provider.tsx:148`의 `notice.link.href`는 코드 내 상수와 `encodeURIComponent` 조합만 사용. 사용자 입력이 `javascript:` 등 스킴이 되는 경로 없음.
- 공개 페이지의 마크다운은 기존 `rehype-sanitize` 경로이며 이번 사이클 변경 대상 아님.

### 7. 새 의존성
- `package.json`의 `@hookform/resolvers` 5.9.1, `react-hook-form` 7.89.0이 이번 사이클 추가분. 정확한 버전 고정이며 `pnpm-workspace.yaml`의 `minimumReleaseAge: 10080`(7일), `trustPolicy: no-downgrade`가 공급망 방어로 유지됨. `allowBuilds`(esbuild, sharp 비활성)는 변경 없음. 두 패키지는 주요 라이브러리이며 런타임에 외부 통신, `eval`을 하지 않는 폼 라이브러리.
- `pnpm audit` 등 취약점 DB 조회는 하지 못함(미검증).

## 취약점 목록

| ID | 심각도 | 위치 | 내용 | 수정 방안 |
| --- | --- | --- | --- | --- |
| Low-1 | Low | sign-out-button.tsx:27-28 | `signOut({ redirect: false })`가 네트워크 오류로 reject되면 `await`에서 예외가 올라가 처리되지 않은 rejection이 되고, 이동도 안내도 없이 버튼만 아무 반응이 없음. 세션은 살아 있으므로 보안 우위는 유지되나 사용자는 로그아웃된 줄 오해할 수 있음 | `try/catch`로 실패 시 안내 문구를 띄우거나 로그아웃 실패 상태를 표시. 보안상 필수 아님 |
| Info-1 | Info | portfolio.schema.ts:141-147 | `.partial()`의 strict 보존은 zod 4 동작에 기대고 이번에 실행 검증하지 못함 | 기존 테스트 408건에 포함된 `profileUpdateInputSchema` 계약 테스트(T09)로 확인 권장 |
| Info-2 | Info | login-panel.tsx:68 | `signIn`의 `callbackUrl`은 이미 `safeCallbackUrl` 검증값이며 next-auth도 동일 출처만 허용 | 조치 불필요 |
| Info-3 | Info | sign-out-button.tsx:16-25 | 보조 키 클릭은 세션을 끝내지 않고 `/`만 새 탭으로 엶 | 조치 불필요 |
| Info-4 | Info | proxy.ts:14 | proxy는 JWT 존재만 확인하고 인가는 `requireAdminPage`/`adminRoute`가 항상 재판정. 새 페이지 5개 모두 가드 호출을 확인함 | 조치 불필요, 새 admin 페이지 추가 시 가드 첫 줄 호출 유지 |

## 차단 조건 점검

- Critical 미수정: 없음.
- 인증 로직 확인 불가: 아님. `requireAdmin`, `requireAdminPage`, `proxy.ts`, `adminRoute` 호출 경로를 모두 읽음.

## 미검증

- 런타임 동작, `git diff`, `pnpm audit`, 실제 HTTP 요청(strict 키 거부, 빈 객체 400, next-auth redirect 콜백).
- `admin-route.ts`는 이번 사이클 변경이 없어 본문을 다시 열지 않았고, 구조와 기존 리뷰(1~4차) 결론에 의존함.
