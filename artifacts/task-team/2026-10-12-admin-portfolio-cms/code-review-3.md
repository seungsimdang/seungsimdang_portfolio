# code-review-3: admin 포트폴리오 CMS

**사이클 전체 최종 리뷰** (3차, 기준 커밋 `466e2fe`, 범위 `609d242..466e2fe` 앱 소스)

## 판정: 통과 (Critical/High/Medium 없음, Low 5건은 후속 처리 가능)

검증: `tsc --noEmit` 오류 없음, `knip` 출력 없음, `scripts/check-comment-line-breaks.mjs` 통과. 주석의 em-dash, 완결형 종결어미, 사이클 한정 식별자(CR/SEC/triage/BUG 번호) 인용은 변경 파일 전체 grep 결과 없음(`src/proxy.ts:14`의 "1차 방어"는 방어 단계 의미라 무관).

## 겹친 재작업 불일치 점검 결과

- raw 인자 전파: 쓰기 서비스 반환 경로(`updateProfile`, `createTalk`, `updateTalk`, `loadProjectById`)는 모두 raw=true로 매핑돼 폼 저장 응답이 DB 원값과 일치. 관리 편집 페이지 3곳(profile, projects/[slug], talks/[slug])도 raw=true. 관리 목록/대시보드는 title 등만 쓰므로 비raw로 충분(experiences 개수는 링크 필터와 무관). 누락 없음.
- optional 전환(`Profile.github?`, `TechTalk.link?`) 사용처: footer, contact, talk-preview, profile-form(`?? ""`), talk-form(`?? ""`) 모두 처리됨.
- 공개 페이지 갱신: 모든 쓰기 Route Handler가 `revalidatePath("/", "layout")` 호출, `work/[id]`의 `dynamicParams=false` 제거로 신규 slug도 서빙됨.
- 요구사항 누락: 발견 없음(아키텍처 A안, GitHub OAuth allowlist fail-closed, 이미지 URL 입력만, slug 불변, seed 제거는 후속).

## Findings

### CR3-01 (Low) 403 코드 혼동
- 위치: `src/lib/admin-client/use-admin-form.ts:37-42`, `src/lib/api/api-error.ts:24-31`
- 근거: 서버는 `FORBIDDEN`과 `FORBIDDEN_ORIGIN`을 둘 다 403으로 내리는데 클라이언트는 상태 코드만 보고 "권한이 없습니다" + 로그아웃 유도를 띄움. 별칭 host 미등록으로 Origin이 거부된 경우 사용자가 원인을 오인함. 에러 코드 매핑이 NOT_SEEDED/SLUG_CONFLICT는 code, 나머지는 status 기준으로 섞여 있음.
- 제안: `result.code === "FORBIDDEN_ORIGIN"` 분기를 추가해 "요청 출처가 허용되지 않았습니다" 안내.

### CR3-02 (Low) 목록/삭제 경로의 오류 매핑이 폼과 다름
- 위치: `src/components/admin/sortable-list.tsx:66-76, 91-95`, `src/components/admin/talk-form.tsx:84-92`
- 근거: 순서 변경/삭제 실패는 401과 ORDER_MISMATCH만 구분하고 403은 일반 실패 문구로 떨어짐. `describeFailure`와 동일 정책이 아님.
- 제안: 공통 매핑 함수를 `describeFailure` 옆으로 빼서 재사용하거나, 403을 최소한 별도 문구로 처리.

### CR3-03 (Low) 예외 클래스 name 불일치
- 위치: `src/services/portfolio/portfolio-admin-service.ts:27-29` vs `portfolio-service.ts:15-20`
- 근거: `PortfolioNotSeededError`만 `this.name`을 설정하고 `SlugConflictError`/`NotFoundError`/`OrderMismatchError`는 비어 있어 `adminRoute`의 `console.error`(`name: message`)에는 쓰이지 않지만 로그/디버깅 일관성이 낮음. 동작 영향 없음.
- 제안: 필요 시 동일 방식으로 name 지정(우선순위 낮음).

### CR3-04 (Low) 순서 변경 상한과 목록 상한 불일치
- 위치: `src/schemas/portfolio.schema.ts:149-155`
- 근거: `orderInputSchema.slugs`는 최대 100개인데 프로젝트/발표 생성에는 개수 상한이 없어 100개를 넘기면 순서 변경이 영구히 400. 단일 소유자 포트폴리오라 현실 가능성은 낮음.
- 제안: 상한 제거 또는 생성 시 동일 상한 적용. 지금은 백로그로 충분.

### CR3-05 (Low) 소소한 정리
- `src/lib/auth/require-admin.ts:255` `!isAllowedGithubId(githubId) || !githubId`는 타입 좁히기용 중복 조건이므로 의도를 한 줄 주석으로 남기거나 `!githubId ||` 로 앞에 두면 명확함.
- `src/lib/admin-client/use-admin-form.ts:219` `SAVED_MESSAGE` 상수가 사용처 아래(파일 끝)에 선언됨. 동작은 정상이나 위쪽 `SAVE_FAILED` 옆으로 이동 권장.
- `src/types/portfolio.ts:7` `Profile.github?`는 DB 컬럼이 notNull이고 optional인 이유(읽기 시 http/https 필터)가 타입에 설명돼 있지 않음. 다른 optional 필드처럼 한 줄 주석 권장.

## 후속 항목(수정 불필요, 기록용)
- `src/db/seed-data.ts`, `src/db/seed.ts`, `tests/e2e/real-project-data.spec.ts`의 seed-data 의존은 triage-1 CR1-08 결정대로 Production seed 검증 후 제거(e2e가 seed-data를 import하므로 제거 시 e2e 데이터 소스 대체 필요).

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --base develop --committed` (사이클 브랜치가 develop 분기라 base를 develop으로 지정), 상태 completed.
- 결과: CodeRabbit 0건 중 0건 타당. 타당/기각 항목 없음.
