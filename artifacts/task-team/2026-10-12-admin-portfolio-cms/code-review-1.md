# Code Review 1 (T07, 1차)

대상: `git diff 5490c9e 3206169` (feature/admin-portfolio-cms). CodeRabbit: 미실행(지시문 범위가 자체 리뷰, 실행 안 함). 코드 수정 없음.

## 판정: 조건부 통과 (재작업 권장 2건: CR1-01, CR1-02)

Critical 없음. 서비스 원자성, slug 충돌, 가드 fail-closed, revalidate 위치, 주석 규칙은 대체로 양호.

## Findings

### CR1-01 High - 서비스/스키마/가드에 대한 단위 테스트 없음
- 근거: 사이클 diff에서 테스트 변경은 `tests/e2e/real-project-data.spec.ts` import 경로 1건뿐. `__tests__/`에 admin 관련 추가 없음.
- 영향: requirements 12절이 요구한 "가드 함수 단독 검증", env 미설정 fail-closed(`admin-allowlist.ts`, `require-admin.ts`), `adminRoute` Origin 검사/에러 변환, zod 스키마 경계값이 회귀 보호 없이 배포됨.
- 제안: `isAllowedGithubId`(빈 env, 비숫자 토큰), `adminRoute`(Origin 누락 403, 401/403, 에러 매핑), `parseJsonBody`(415/413/400), 스키마(thumbnail `..`, slug `new`, talk date) 최소 유닛 테스트를 소스 import 방식으로 추가.

### CR1-02 High - DB 미연결/미seed 시 빌드와 모든 공개 페이지가 실패, generateStaticParams의 catch는 효과 없음
- 근거: `src/app/layout.tsx:11-14,29`가 `getProfile()`을 호출(없으면 `PortfolioNotSeededError` throw, `DATABASE_URL` 없으면 `db` Proxy가 throw). `src/app/work/[id]/page.tsx:19-25`는 DB 실패를 `[]`로 삼켜 빌드를 보호하려 하지만, 같은 빌드에서 root layout/각 페이지가 어차피 throw.
- 영향: CI(`pnpm build`/`verify`)나 Preview에 `DATABASE_URL`이 없으면 빌드 실패. 요구사항 8절의 "배포 순서가 어긋나도 공개 페이지가 깨지지 않게" 위반. catch 주석의 의도와 실제 동작이 불일치.
- 제안: (a) 빌드/배포 문서에 `DATABASE_URL` 필수와 migrate+seed 선행을 명시하고 generateStaticParams catch는 제거하거나, (b) layout/페이지에서 not-seeded를 처리하는 폴백을 둠. 어느 쪽이든 의도를 하나로 통일.

### CR1-03 Medium - `PortfolioNotSeededError`가 adminRoute에서 500으로 처리됨
- 근거: `src/lib/auth/admin-route.ts:55-65`에 매핑 없음. `updateProfile`(`portfolio-admin-service.ts` updateProfile)이 throw.
- 영향: seed 전 profile 저장 시 "서버 오류"로만 보임. 
- 제안: 404 또는 명시 코드로 변환하거나 이 경로는 의도된 500임을 주석화.

### CR1-04 Medium - 순서 변경이 동시 삭제를 감지하지 못함
- 근거: `portfolio-admin-service.ts` reorderProjects/reorderTalks는 집합 일치 확인(SELECT)과 batch UPDATE가 분리. 확인 후 삭제된 slug의 UPDATE는 0행이라 에러 없이 성공.
- 영향: 단일 편집자라 확률 낮고 결과도 무해(남은 항목 순서는 정상, 간격만 생김). `OrderMismatchError` 보장이 엄밀하지 않음.
- 제안: 허용 가능하면 주석으로 한계 명시. 엄밀히 하려면 UPDATE에 `returning`으로 행 수 검증 후 불일치 시 롤백 불가이므로 현 구조에선 수용 권장.

### CR1-05 Medium - 미저장 이탈 가드가 앵커 클릭만 처리
- 근거: `src/lib/admin-client/use-admin-form.ts` 이탈 가드 useEffect. `a[href]` capture 클릭만 가로채며 `#admin-main` 스킵 링크, 수정키 클릭/`download`도 confirm이 뜸. 브라우저 뒤로가기(popstate)와 `router.push`는 미보호.
- 영향: 뒤로가기로 입력 손실 가능, 스킵 링크 사용 시 불필요한 확인창.
- 제안: `href`가 `#`로 시작하면 제외, `event.defaultPrevented`/수정키 확인 추가. 뒤로가기는 beforeunload로 부분 커버되므로 한계를 주석에 명시하면 충분.

### CR1-06 Low - 목록 삭제 완료 메시지가 쿼리스트링을 그대로 표시
- 근거: `src/app/admin/(console)/projects/page.tsx:33` `deleted` 파라미터를 메시지로 출력(talks도 동일 추정). React가 이스케이프하므로 XSS는 아님.
- 영향: 로그인된 관리자가 조작된 링크를 열면 임의 문구 표시(피싱성 문구). 
- 제안: 허용 길이 제한 또는 메시지 대신 고정 문구.

### CR1-07 Low - 사이클 한정 식별자 인용 없음, 주석 규칙 위반 없음 (확인 완료, 조치 불필요)
- grep으로 요구사항/finding/게이트 ID, em-dash, 완결형 종결어미 확인: 위반 미발견. Tailwind arbitrary value(`[Npx]`, `rounded-[`, `boxShadow`)도 admin 코드에서 미발견.

### CR1-08 Low - e2e가 제거 예정 파일(`src/db/seed-data.ts`)에 의존
- 근거: `tests/e2e/real-project-data.spec.ts:2`. 요구사항은 seed 검증 후 `seed-data.ts` 제거를 후속 커밋으로 둠.
- 영향: 제거 시 e2e 기대값 출처가 사라짐.
- 제안: 후속 항목으로 기록(기대값을 fixture로 이전 후 제거).

## 중점 항목 점검 결과 (이상 없음 포함)
- batch 원자성: neon-http `db.batch`는 단일 HTTP 트랜잭션. createProject/updateProject의 insert+delete+insert 원자적, 삭제는 cascade FK. 양호. updateProject는 삭제와의 경합을 FK 위반 -> NotFound로 변환(양호). 단 experiences id는 저장마다 재발급되므로 클라이언트가 `toDraft(saved)`로 갱신(`project-form.tsx` onSaved) - 정상.
- slug: DB unique + check, zod 정규식 일치(`new`는 zod에서만 차단, DB는 허용하나 라우트 `projects/new`와 충돌 방지 목적이라 수용). 에러 코드 추출이 `err.code`/`err.cause.code` 모두 처리. slug 불변 처리 양호.
- sortOrder 서브쿼리 max+1: 동시 삽입 시 중복 가능하나 정렬 키에 createdAt/id 보조 정렬이 있어 안전.
- zod vs DB: thumbnail은 `/images/` 로컬 경로만 허용하며 seed 데이터(`/images/projects/...`)와 호환. talk date 형식 `YYYY.MM`이 seed와 일치. 보조: requirements가 "허용 호스트 https URL"도 언급했으나 사용자 결정에서 경로 중심이므로 수용.
- seed 멱등성: 테이블별 존재 확인 후 건너뜀, 단일 batch로 롤백. 존재 확인과 batch 사이 경합은 일회성 스크립트라 수용.
- revalidate: Route Handler에서 `revalidatePath("/", "layout")` 호출은 Next 16에서 유효, 모든 mutating 라우트에 존재(profile, projects, project-order, talks, talk-order 확인). 삭제된 slug는 on-demand 렌더에서 notFound.
- 카드 색: 순서 기반 팔레트, 기존 5색 값 유지로 호환.
- 가드: 매 호출 env 재독, 비숫자 토큰 폐기, 비면 전원 거부(fail-closed). proxy는 토큰 존재만 확인하고 인가는 가드가 재판정. Origin 검사는 unsafe method에만 적용(GET 제외) 양호.
- 능동 트리거/캐시 무효화 대칭성: 생성/수정/삭제/순서 모두 동일 revalidate 호출, 문제 없음.
- 요구사항 누락: 단위 테스트(CR1-01) 외 기능 누락 미발견.
