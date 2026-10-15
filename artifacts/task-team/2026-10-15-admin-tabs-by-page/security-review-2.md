# 보안 리뷰 2 (T08 재리뷰)

## 판정

배포 승인. Critical/High/Medium 없음. Low 2건, Info 1건.

범위: triage-1.md "사용자 결정과 재작업"이 새로 만든 코드만 검토함. 재작업 파일 6개를 직접 읽었고, next-auth 4.24.15 `react/index.js`의 signOut 구현과 서버 라우트(`src/app/api/admin/profile/route.ts`, `portfolio-admin-service.ts`의 `updateProfile`)를 함께 확인함.

## 확인 항목별 결과

### 1. 로그아웃 후 세션 쿠키 삭제 (통과)

- `signOut({ redirect: false })`는 `getCsrfToken()` 후 `POST {baseUrl}/signout`(form-urlencoded, `csrfToken`, `json: true`)을 보냄 (react/index.js 291-324행).
- 쿠키 삭제는 서버 응답의 Set-Cookie가 수행하며 클라이언트 `redirect` 옵션과 무관함. `redirect:false`는 응답 처리 후 `window.location.href` 이동만 생략하고(337행), 대신 `_getSession({event:"storage"})`로 세션 상태를 갱신하며 브로드캐스트로 다른 탭도 로그아웃시킴(331-350행).
- 따라서 기존 redirect 방식과 서버 쪽 세션 종료 효과가 같음. CSRF 토큰 검증 경로도 그대로 유지됨.

### 2. signOut 실패 시 세션이 남은 채 홈으로 이동하는 경로 (없음)

- `await signOut(...)`이 reject(네트워크 오류, csrf fetch 실패, `res.json()` 파싱 실패)하면 `router.push("/")`에 도달하지 못해 이동하지 않음. 세션이 남은 채 홈으로 가는 경로는 없음.
- 단 반대로 실패 시 사용자 피드백이 없음(Low-1).
- 서버가 비정상 응답(HTTP 오류이지만 JSON 본문)을 주는 경우 signOut은 reject하지 않고 resolve하므로 이동이 일어날 수 있음. 이때 세션 쿠키가 남을 수 있으나 이동 대상이 공개 홈이라 노출 위험은 없고, 공개 페이지 이동 후에도 `/admin`은 proxy와 `requireAdmin`이 별도로 판정함. 보안 영향 없음(Info-1에 포함).

### 3. 이동 대상 고정 (통과)

- `href="/"`와 `router.push("/")` 모두 리터럴이며 사용자 입력, 쿼리, `from`을 쓰지 않음. open redirect 없음.
- signOut에 `callbackUrl`을 지정하지 않아 기본값 `window.location.href`가 서버로 전송되나, `redirect:false`에서는 응답의 `url`을 사용하지 않고 서버 redirect 콜백이 baseUrl 기준으로 검증하므로 영향 없음.

### 4. 클라이언트 검증 스키마를 profileUpdateInputSchema로 교체 (서버 영향 없음)

- 서버 `PUT /api/admin/profile`은 `adminRoute`(인증, 인가, Origin 검사) 안에서 `parseJsonBody(request, profileUpdateInputSchema)`를 사용함. 서버 스키마와 클라이언트가 같은 객체를 import하는 구조라 클라이언트 변경은 서버 검증을 약화하지 않음. 클라이언트 검증은 UX용이고 신뢰 경계는 서버임.
- `profileInputSchema`는 `z.strictObject`이고 `.partial()`이 strict(미지 키 거부)를 유지하며, 각 키의 형식 검증(trim, 길이 상한, `email`, `https` 전용 `github`, 배열 상한 50)은 값이 있을 때 그대로 적용됨. null, 비문자열은 거부됨.
- 부분 갱신 허용으로 필드 생략이 가능해졌으나 이는 의도된 변경이고, 생략된 키는 drizzle `.set()`에서 무시되어 기존 값이 유지됨. 인증된 admin만 호출 가능하므로 권한 상승 없음.

### 5. refine 변경의 빈 객체/undefined 거부 (통과)

- `Object.values(v).some((value) => value !== undefined)`:
  - `{}` 는 거부됨.
  - `{ name: undefined }` 는 거부됨 (JSON 직렬화 시 키 자체가 사라지므로 `{}`와 동일 처리).
  - 유효한 값이 하나라도 있으면 통과함.
- 이 거부는 `updateProfile`에서 빈 `.set({ updatedAt })`만 남아 불필요한 갱신/캐시 재검증이 일어나는 경로를 차단하는 데 도움이 됨. 개별 필드가 검증에 실패하면 object 단계에서 실패하므로 refine이 잘못된 값에 대해 실행되지 않음.

### 6. 나머지 재작업 파일

- `admin-button.tsx`: `href`/`onClick` 유니온 타입만 변경됨. 사용자 입력 기반 href 없음. 보안 영향 없음.
- `form-parts.tsx`: `cancelHref`/`onDiscard` 분기. 모든 호출부 href는 고정 경로 문자열. 보안 영향 없음.
- `profile-form.tsx`: 섹션별 키 화이트리스트(`SECTION_KEYS`)로 전송 항목을 제한함. 서버가 최종 판정하므로 보안 경계는 아님.
- `use-admin-form.ts`: 401 시 `from=encodeURIComponent(window.location.pathname)`로 인코딩됨. 쿼리 인젝션 없음. `from`의 소비 측 검증은 이번 범위 밖(기존 코드).

## 취약점 목록

| ID | 심각도 | 내용 | 수정 방안 |
| --- | --- | --- | --- |
| Low-1 | Low | `SignOutButton`의 onClick에 try/catch가 없어 signOut이 reject하면 unhandled rejection이 되고 사용자는 로그아웃 실패를 알 수 없음. 세션이 유지된 채 화면에 변화가 없어 로그아웃된 것으로 오인할 수 있음 | 실패 시 토스트 등으로 알리거나 `try/finally`로 처리. 실패 시 이동하지 않는 현재 동작은 유지 |
| Low-2 | Low | 링크 기반이라 JS 하이드레이션 전 클릭이나 가운데 클릭(새 탭)은 `onClick`을 거치지 않고 `/`로만 이동해 로그아웃되지 않음. 세션이 유지되며 공개 홈에 도달할 뿐이라 영향은 사용자 의도와 다른 동작에 한정됨 | 수용 가능. 필요하면 로그아웃을 button으로 되돌리고 가드 확인은 별도 처리 |
| Info-1 | Info | signOut이 HTTP 오류 상태이면서 JSON 본문을 반환하면 resolve되어 쿠키 삭제 확인 없이 `/`로 이동할 수 있음 | 필요하면 반환값(`data.url` 존재 등)이나 `useSession` 상태로 확인. 현 위협 모델에서는 불필요 |

## 차단 조건 점검

- Critical 미수정: 없음.
- 인증 로직 확인 불가: 아님 (proxy, `adminRoute`, `requireAdmin` 경로와 signOut 구현을 확인함).

## 미검증

- 런타임에서 실제 Set-Cookie 삭제를 브라우저로 확인하지 않음. 소스 구현 읽기 기준임.
- git 명령은 지시에 따라 사용하지 않았고, 변경 diff가 아닌 현재 파일 상태를 기준으로 검토함.
