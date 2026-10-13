# code-review-1: admin UI 개선 및 Blob 썸네일 업로드 (T07)

- 범위: `git diff 6fb558e..HEAD` 중 앱 코드, 스크립트, 설정 (하네스 훅, `artifacts/` 제외)
- 기준: `requirements.md`(F1-F11, 5절), `design-spec.md`, `api-spec.md`, `docs/agent-rules/`
- 보조 검증: `pnpm type-check`, `biome check .`, `knip`, `pnpm test`(11 파일 129 테스트) 모두 통과
- 판정: **재작업 (경미)**. Critical/High 없음. Medium 2건과 주석 규칙 위반 1건 수정 후 통과 가능.

## 요약

요구사항 F1-F11의 핵심 로직(draft 순서 저장, slug 변경, thumbnail 생략/빈값/URL 의미, Blob 정리, 마이그레이션 러너, 이전 스크립트)은 명세와 일치한다. 아래 finding은 모두 국소적이고 데이터 손상 위험은 없다.

## 자체 발견

### M1 (Medium) 뒤로 가기 취소 시 확인창이 두 번 뜨고, 두 번째에서 확인하면 경고 장치가 꺼짐

- 위치: `src/components/admin/sortable-list.tsx:100-109` (`onPopState`)
- 시나리오: 순서를 바꾼 뒤 브라우저 뒤로 가기, 첫 확인창에서 "취소" -> `window.history.forward()` 호출 -> 이 호출이 `popstate`를 다시 발생시켜 같은 확인창이 한 번 더 뜬다. 두 번째에서 "확인"을 누르면 `leavingRef = true`가 되지만 실제로는 페이지에 남아 있고, 이후 새로고침/탭 닫기의 `beforeunload` 경고(`:60-62`)가 영구히 꺼져 draft가 경고 없이 사라질 수 있다.
- 수정 제안: `forward()`를 부른 직후 발생하는 popstate 한 번을 무시하는 플래그(`restoring`)를 두고, 그 popstate에서는 확인창과 `leavingRef` 설정을 건너뛴다. (CodeRabbit과 중복, 아래 참조)

### M2 (Medium) 같은 원인으로 `leavingRef`가 한 번 true가 되면 되돌아오지 않음

- 위치: `src/components/admin/sortable-list.tsx:92-98` (`onClick`), `:106-108`
- 시나리오: draft가 있는 상태에서 헤더의 "프로젝트" 링크(현재 목록과 같은 URL)를 누르고 확인창에서 "확인" -> 소프트 내비게이션이 같은 URL이라 `SortableList`가 언마운트되지 않고 dirty draft가 남는데 `leavingRef`는 true로 고정된다. 이후 탭 닫기에서 경고가 나오지 않는다.
- 수정 제안: `leavingRef`를 true로 두는 대신, 확인 통과 후 다음 tick(예: `setTimeout(() => { leavingRef.current = false })`)에 복구하거나, `beforeunload` 억제는 실제 `window.location.reload()` 경로(`:195-198` 새로고침 버튼)에만 한정한다. 링크 클릭 확인은 클라이언트 내비게이션이라 `beforeunload`와 무관하므로 해당 경로에서는 `leavingRef`를 건드리지 않아도 된다.

### M3 (Medium) 본문 상단 간격이 사라짐 (인라인 `paddingTop`이 `py-48`의 위쪽을 덮어씀)

- 위치: `src/components/admin/admin-console-shell.tsx:61-63`
- 시나리오: `style={{ paddingTop: headerHeight }}`가 `className`의 `py-48` 위쪽 패딩을 대체해 본문이 헤더 하단 구분선에 바로 붙는다. 이전 레이아웃은 `py-48`로 48px 간격이 있었다. design-spec은 "실제 헤더 높이에 맞춰 본문 시작 위치 확보"만 요구하고 간격 제거를 의도하지 않는다.
- 수정 제안: `paddingTop: headerHeight + 48`. 클래스에서는 `pb-48`로 바꿔 의도를 분명히 한다. (CodeRabbit과 중복)
- 참고: 초기값 `useState(92)`는 SSR/하이드레이션 후 `useLayoutEffect`에서 보정되므로, 모바일(헤더가 두 줄)에서 첫 페인트 전 보정이 일어나는지만 확인하면 된다.

### L1 (Low, 프로젝트 규칙 위반) 구현 주석에 이번 사이클 한정 식별자 `F11` 인용

- 위치: `src/services/portfolio/portfolio-service.ts:15`
  - `// F11 이전 전까지 남아 있는 로컬 썸네일 경로, 이전 완료 후 함께 삭제`
- 문제: 사이클 종료 후 의미를 알 수 없는 요구사항 ID를 코드에 남김. 그 외 `src/`, `scripts/`, `tests/`, `__tests__/`, 설정의 추가된 주석에서는 F/Q/A/AC/BUG/finding ID 인용을 찾지 못했다.
- 수정 제안: `// 썸네일을 Blob으로 이전하기 전까지 DB에 남아 있는 로컬 경로, 이전 완료 후 함께 삭제` 처럼 사유만 서술.

### L2 (Low) 썸네일 입력의 `aria-describedby`가 존재하지 않는 id를 가리킴

- 위치: `src/components/admin/thumbnail-field.tsx:117` (`aria-describedby="project-thumbnail-hint project-thumbnail-error"`), 오류 `<p id="project-thumbnail-error">`는 `:129-133`에서 오류가 있을 때만 렌더됨
- 시나리오: 오류가 없을 때 존재하지 않는 id 참조. 보조기기에서 무해하게 무시되지만 정확하지 않다.
- 수정 제안: 오류가 있을 때만 error id를 이어 붙인다.

### L3 (Low) 이전 스크립트가 일부 행 실패에도 종료 코드 0

- 위치: `scripts/migrate-thumbnails.mjs:136-148` (마지막 요약 출력 이후 `process.exitCode` 미설정)
- 시나리오: `--apply` 중 일부 행이 `failed`여도 exit 0이라 호출 쪽(orchestrator, CI)이 실패를 놓칠 수 있다. 출력 로그에는 남으므로 영향은 낮다.
- 수정 제안: 실패 행 개수를 세어 있으면 `process.exitCode = 1`.

### L4 (Low, 정보) 빌드 마이그레이션 대상 DB 안전 장치 없음

- 위치: `scripts/migrate.mjs:9-15`
- 내용: Preview 환경 `DATABASE_URL` 교체를 놓친 배포는 Production DB에 마이그레이션을 적용한다. requirements F10 edge case가 "개발자 검토"로 남긴 항목이며 현재는 additive 마이그레이션 원칙과 사전 작업(교체 완료)에 의존한다. 이번 사이클은 마이그레이션 파일이 없어 실해는 없다. 후속으로 `VERCEL_ENV=preview`일 때 호스트가 Production 엔드포인트가 아닌지 확인하는 가드를 고려할 만하다.

## 요구사항 대조 (통과 항목)

- F1/F2/F3: `layout.tsx`는 html/body만, 공개 쉘은 `(public)/layout.tsx` + `PublicShell`, 루트 `not-found`도 `PublicShell`을 써 이전 동작 유지. `/admin` -> `/admin/projects` 리다이렉트, 로그인 `from=/admin` 처리 일치.
- F4/F5: 공개 `Button` 제거, `icon`/`danger` variant 분리, `--danger` 토큰을 `@theme`에 추가해 규칙 준수.
- F6: 이동은 로컬 상태만, 저장 1회 PUT, 실패 시 draft 유지, `ORDER_MISMATCH` 새로고침 제공, 삭제 시 draft/기준 목록 동시 갱신, 연타 방지(`savingRef`). 단 이탈 경고 M1/M2 참조.
- F7: 서버에서 시그니처+확장자+MIME+크기 검증, `addRandomSuffix`로 덮어쓰기 방지, 반환 URL을 `isValidThumbnail`로 재검증하고 실패 시 `del`. `updateProject`는 `thumbnail` 생략 시 기존 값 유지(`/images` 값 보존), 빈 문자열은 null, 저장 성공 후에만 이전 Blob 삭제(`deleteBlobIfUnused`가 DB 참조를 확인하고 실패는 로그만). `deleteProject`도 동일. 읽기 경로는 레거시 `/images`와 Blob URL을 모두 허용하며 관리자 raw 모드는 그대로 통과.
- F9: 수정 스키마에 `slug` 추가, `updateProject`/`updateTalk` 모두 PG unique 위반을 `SlugConflictError`(409, slug 필드 오류)로 매핑해 사전 조회 없이 DB 제약으로 경합 해결. 폼은 변경 시 확인창, 저장 후 `router.replace`로 새 slug URL 이동, `savedSlug` 기준으로 PUT/DELETE.
- F10: 러너가 `pg_advisory_xact_lock`과 마이그레이션 적용을 같은 트랜잭션에서 수행(api-spec 계약 일치), drizzle 이력 테이블 형식과 해시 방식 호환, `--build`는 Vercel preview/production, `CI=true`, `MIGRATE_ON_BUILD=1`에서만 동작. `run-e2e-local.sh`와 `ci.yml` 반영 확인.
- F11: 기본 dry-run, `--apply` 명시 시에만 업로드, 업로드 성공 후 `WHERE thumbnail = 원본` 조건으로 갱신(경합 안전), 경로 탈출/심볼릭 링크/크기/시그니처 검증, 행별 실패 격리, 원본 경로 출력. 통화/동시성 해당 없음.
- 중복 `Blob` 호스트 검증: 서버 업로드 route, 스키마, 이전 스크립트 3곳에 호스트 비교가 있으나 서로 다른 런타임(Route/스크립트)이라 허용 범위.

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --base 6fb558e --committed` (인증됨, 무료 CLI 한도 사용), 상태 완료, finding 3건

### 타당 판정 (2건)

| 파일:라인 | 요약 | 심각도 | 자체리뷰 중복 |
| --- | --- | --- | --- |
| `src/components/admin/sortable-list.tsx` (`onPopState`) | 뒤로 가기 취소 후 `forward()`가 popstate를 다시 발생시켜 확인창 재노출 | Medium | M1과 중복 |
| `src/components/admin/admin-console-shell.tsx:61` | 인라인 `paddingTop`이 `py-48` 위쪽을 상쇄 | Medium | M3과 중복 |

### 기각 (1건)

| 요약 | 기각 사유 |
| --- | --- |
| 업로드 route가 브라우저가 보낸 `file.type` 불일치/빈 값을 거부하지 말 것 (`src/app/api/admin/uploads/thumbnail/route.ts`) | requirements F7 edge case가 "확장자와 MIME 불일치 거부"를 명시하고, 서버가 시그니처로 실제 형식을 확정한 뒤 일치만 추가 확인하는 것은 명세 준수. 일부 OS가 빈 MIME을 보내는 실제 사례가 나오면 후속 검토. |

CodeRabbit 3건 중 2건 타당(모두 자체 발견과 중복).

## 판정

**재작업 (경미)**. 수정 필요 항목: M1, M2, M3, L1. L2-L4는 같은 수정 시 함께 처리하거나 후속으로 둬도 무방하다. 재작업 후 sortable-list 이탈 경고 동작과 admin 본문 간격만 재확인하면 된다.
