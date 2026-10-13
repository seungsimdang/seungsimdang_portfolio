# code-review-1: about 페이지 이력서 기반 재구성

- 검토 범위: `git diff 24d9331..HEAD` (feature/about-resume), 산출물 문서 제외
- 기준: requirements.md, design-spec.md, api-spec.md, summary.md, docs/agent-rules/
- 사이클 전체 최종 리뷰 아님(1차 리뷰)

## 1차 판정: 통과 (Medium 1건은 수정 권장, 배포 차단 아님)

Critical/High 없음. 정렬(ORDER_MISMATCH), kind 고정, 삭제, 빈 섹션/빈 period 처리는 정확하다.

## 확인 결과 요약

- 정렬: `reorderResumeEntries`가 kind별 현재 id 집합과 요청 id 집합을 `assertSameSet`로 비교해 `OrderMismatchError`를 던진다. UPDATE에도 `kind` 조건이 있어 다른 kind id가 섞여도 영향이 없다. 클라이언트는 `ORDER_MISMATCH`에서 conflict 상태와 새로고침 버튼을 보여준다. 정상.
- kind 고정: 수정 스키마에서 `kind`를 제외했고(`strictObject`) 수정 쿼리도 `kind`를 set하지 않는다. 생성 스키마만 `kind` enum을 받는다. DB check 제약과 `RESUME_KINDS`도 일치. 정상.
- 삭제 후 상태: sort_order 재번호를 하지 않고 상대 순서만 쓰며 주석에 사유가 있다. 목록 조회는 `sort_order, created_at, id`로 안정 정렬. 클라이언트 삭제는 `items`와 `savedIds`를 함께 갱신해 dirty가 어긋나지 않는다. 404도 성공으로 처리해 멱등. 정상.
- 빈 섹션/빈 period: 공개 about은 항목이 0개인 섹션 전체를 숨기고, `period`가 비면 기간 칸을 생략하고 본문을 `md:col-start-2`로 정렬한다. 정상.
- 동시성: 생성은 advisory lock + 상한 검사 + `max(sort_order)+1`을 한 batch에서 처리한다. 기존 projects/talks 패턴과 같다.
- 데이터 변경 후 갱신: 생성/수정/삭제/정렬 4개 경로 모두 성공 경로에서 `revalidatePath("/", "layout")` 호출. 대칭 OK.
- 회귀(SortableList slug -> id): `projects`/`talks` 페이지가 `id: slug`로 바꿨고 링크는 `/admin/${kind}/${item.id}`, 정렬 요청은 `{ slugs: ids }`, 삭제 경로는 `/api/admin/${kind}/${id}`로 이전과 동일한 값이다. `RemoveDescription`의 `/work/{id}` 문구도 slug를 그대로 쓴다. projects 전용 `experienceCount`도 유지. 회귀 없음.
- 구현 코드 주석의 이번 사이클 한정 식별자(요구사항 항목 ID, finding ID, 게이트 ID, T0x 등): grep 결과 없음.
- props 전달: `SortableList`의 `resumeKind`, `noun`, `headingId`는 resume 호출부(`resume/page.tsx`)에서 모두 전달된다. `kind="resume"`인데 `resumeKind`가 빠지는 호출은 현재 없음(Low-3 참고).
- Tailwind: spacing/radius/shadow에 위반 없음. `md:grid-cols-[200px_1fr]`는 grid 템플릿이라 w/h/p/m/gap 규칙 대상이 아니고 canonical 대안이 없어 허용한다(Low-2).
- CSRF/GET 능동 트리거/다중 출처 배열/서버 상한 잘림 가정/비즈니스 정규식: 해당 변경 없음. `RESUME_KINDS`와 DB check 문자열은 주석으로 동기화 관계가 명시돼 있다.

## Findings

### Medium-1: 경력 항목의 title/subtitle 의미가 시드 데이터와 admin 입력 힌트에서 서로 반대

- 근거: `src/components/admin/resume-labels.ts:18`은 `work: { title: "회사명", subtitle: "직함" }`이고 design-spec 3.2 표(129~130줄)도 같다. 반면 `scripts/resume-data.ts:23-26`(운영 시드)과 `tests/e2e/fixtures/portfolio.ts:50-53`은 `title: "Frontend Developer"`(직함), `subtitle: "빅웨이브로보틱스"`(회사)로 넣었다. 공개 화면은 title을 h3, subtitle을 부제로 표시한다.
- 영향: 운영 DB에는 title=직함, subtitle=회사로 들어가 있는데 admin 폼은 "제목=회사명, 부제=직함"이라고 안내한다. 소유자가 힌트를 따라 새 경력을 추가하면 기존 항목과 표시 순서가 반대로 섞인다. summary.md가 지적한 "이력서 표기(Frontend Developer · 회사)와 순서가 다르다"는 항목과 별개로, 이 불일치가 실제 결함이다.
- 수정 제안: 시드된 운영 데이터와 이력서 표기에 맞추는 쪽이 비용이 작다. `RESUME_FIELD_HINTS.work`를 `{ title: "직함", subtitle: "회사명" }`으로 바꾸고 design-spec 3.2의 힌트 행을 갱신한다. 반대로 "회사가 제목"을 유지하려면 시드 스크립트와 운영 DB 데이터, e2e fixture를 뒤집어야 하므로 권장하지 않는다.
- CodeRabbit 중복 아님(자체 발견).

### Low-1: 세부 항목/태그 key가 값 자체라 중복 값에서 key 충돌

- 근거: `src/components/common/resume-section.tsx:50`(`key={detail}`)과 `:66`(`key={tag}`). `stringList`(`portfolio.schema.ts:91-93`)는 중복 값을 막지 않는다.
- 영향: 같은 문구를 두 번 저장하면 React 중복 key 경고가 나고 재조정이 어긋날 수 있다. 정적 서버 렌더라 실사용 영향은 작다.
- 수정 제안: `key={`${i}-${detail}`}`처럼 인덱스를 섞거나 중복을 스키마에서 막는다.
- CodeRabbit 중복(해당 항목과 동일, 타당).

### Low-2: summary "T07에서 볼 것" 판단

- 활동 항목 제목 `text-h3`(`resume-section.tsx:43`, 24~32px, line-height 1.75): design-spec 6절이 기본값으로 정한 그대로이며 코드 결함은 아니다. 제목만 있는 7개 행에서 과하게 보이는지는 시각 판단이 필요해 코드 리뷰로 확정하지 않는다. T09 QA 스크린샷에서 확인하고, 과하면 spec을 먼저 갱신한 뒤 `text-body font-medium`으로 낮춘다.
- `md:grid-cols-[200px_1fr]`(`resume-section.tsx:32`): 허용. `--spacing: 1px` 규칙은 w/h/p/m/gap/max-w 계열에만 적용되고 grid 템플릿에는 해당 토큰 클래스가 없다. 반복 사용이 생기면 그때 토큰화한다.
- 경력 제목=직함/부제=회사 순서: 표시 자체는 이력서 표기와 다르지만 의도된 데이터 구조이며, 문제는 Medium-1의 힌트 불일치다.

### Low-3: 삭제 메시지를 work 섹션에만 표시하는 처리가 우회적

- 근거: `src/app/admin/(console)/resume/page.tsx:59` `initialMessage={deleted && kind === "work" ? "삭제했습니다." : ""}`. 삭제는 상세 화면(`resume-entry-form.tsx`)에서 `/admin/resume?deleted=1`로 이동하며, 어떤 kind를 지웠는지 쿼리에 없다.
- 영향: 경력이 아닌 항목을 지워도 메시지는 맨 위 work 섹션 `aria-live` 영역에 뜬다. 6개 섹션에 같은 메시지가 중복 안내되는 것을 피한 합리적 절충이며 동작상 문제는 없지만, work 섹션이 비어 있거나 스크린리더 사용자가 다른 섹션에 있을 때 맥락이 약하다.
- 수정 제안(선택): 리다이렉트에 `deleted=<kind>`를 실어 해당 kind 섹션에만 표시하고, 코드에 `kind === "work"` 하드코딩을 없앤다. 현 상태 유지도 수용 가능.

### Low-4: createResumeEntry가 기존 limitGuard 헬퍼를 쓰지 않고 상한 검사 SQL을 인라인으로 중복

- 근거: `portfolio-admin-service.ts:372-376`. 기존 `limitGuard(projects, PROJECTS_LOCK_KEY)`(162, 298줄)와 같은 목적의 락+0 나누기 검사를 직접 작성했다. kind별 where 조건이 필요해 헬퍼를 그대로 못 쓴 것으로 보인다.
- 영향: 상한 검사 로직이 두 곳에 있어 한쪽만 바뀔 위험. 현재 동작은 정확하다.
- 수정 제안: `limitGuard`에 where 조건 인자를 받게 확장해 재사용하거나, 현 상태를 두고 주석으로 사유를 남긴다.

### Low-5: 신규 로직에 대한 자동 테스트 부재

- 근거: `__tests__`에는 기존 테스트의 `tools: []` 필드 보강 2건만 있고, `resumeEntryCreateInputSchema`/`resumeOrderInputSchema`, `reorderResumeEntries`의 ORDER_MISMATCH, 상한 초과 매핑에 대한 테스트가 없다. e2e fixture에는 resume 데이터만 추가됐고 resume 시나리오 spec은 없다.
- 영향: 회귀 방지 장치가 없다. 가짜 테스트(소스 재구현) 패턴은 없음.
- 수정 제안: 스키마 단위 테스트(kind enum, ids 중복/빈 배열, period 100자) 최소 추가. 나머지는 T09 QA에서 수동 확인.

## CodeRabbit 교차검토

- 실행: `coderabbit review --agent --base-commit 24d9331 --committed` (인증 OK, 무료 CLI 허용량 사용, 완료)
- 결과: CodeRabbit 1건 중 1건 타당.
- 타당 판정:
  - `src/components/common/resume-section.tsx:49-51` · `detail` 텍스트를 key로 쓰면 중복 값에서 key 충돌, `TagList`도 동일 · Low · 자체 발견과 중복(Low-1)
- 기각: 없음.

## 최종 판정

통과. 배포 차단 결함은 없다. Medium-1(경력 힌트와 시드 데이터의 title/subtitle 의미 불일치)은 수정을 권장하며 한 줄 변경 수준이다. orchestrator의 9-1 게이트에서 Low 항목과 함께 재작업 여부를 결정한다.
