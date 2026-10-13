# code-review-2: about 이력 재구성 재작업 재리뷰

- 검토 범위: code-review-1 finding 해결 여부, `git diff 4284a29..HEAD`의 신규 코드
- CodeRabbit: 재작업 재리뷰 지시이므로 생략(자체 리뷰만)

## 이전 finding 해결 여부

| finding | 결과 | 근거 |
| --- | --- | --- |
| Medium-1 경력 힌트 불일치 | 해결 | `src/components/admin/resume-labels.ts:18` 이 `{ title: "직함", subtitle: "회사명" }`로 시드(`scripts/resume-data.ts`)와 일치. design-spec 3.2 표도 갱신됨 |
| Low-1 key 충돌 | 해결 | `src/components/common/resume-section.tsx:49-52`, `:66-69` 에서 `${index}-${값}` key 사용 |
| Low-3 삭제 메시지 | 해결 | `resume-entry-form.tsx:98` 이 `deleted=${entry.kind}`로 이동, `resume/page.tsx:59` 이 `deleted === kind`로 해당 섹션에만 표시. `kind` 하드코딩 제거. 옛 `deleted=1` 링크는 resume 경로에 남은 곳 없음(projects/talks는 별도 페이지라 무관) |
| Low-4 limitGuard 중복 | 해결 | `portfolio-admin-service.ts:138-151` 이 `max`, `where`를 받고 `createResumeEntry`(`:377-382`)가 재사용. 기존 projects/talks 호출은 기본값 `ORDER_SLUGS_MAX`, where 없음이라 동작 동일 |
| Low-5 테스트 | T09 이관(미해결로 보지 않음) | triage-1 |
| orchestrator 추가: lock 키 충돌 | 해결 | `RESUME_LOCK_KEY = 7_301_004`, 코드베이스에서 `7301003`은 `scripts/migrate.mjs:47` 에만 남음 |

## 신규 코드 검토 Findings

### Low-1: limitGuard 상단 주석이 "테이블별"로만 서술

- 근거: `portfolio-admin-service.ts:136` 부근 주석은 테이블별 advisory lock이라고 적었으나 resume은 테이블 단일 락 + kind별 개수 검사다.
- 영향: 동작 문제 없음. 락은 resume 테이블 전체로 직렬화되고 개수는 kind 조건으로 센다. 읽는 사람이 오해할 여지만 있다.
- 제안(선택): 주석에 "where로 개수 검사 범위를 좁힐 수 있음" 한 줄 추가.

### 확인한 사항(결함 없음)

- `sql\`\`` 빈 조각과 `${table}${filter}` 결합은 올바른 SQL이 된다. `eq(resumeEntries.kind, ...)`는 `"resume_entries"."kind"`로 렌더되어 서브쿼리 `from resume_entries`와 맞는다.
- `biome-ignore` 주석은 JSX 속성 사이/괄호 안의 유효한 위치이며 사유가 적혀 있다. 주석 종결 형식도 명사형.
- 인덱스 포함 key는 정적 서버 렌더 목록이라 재정렬 위험이 없다.

## 최종 판정

통과. Critical/High/Medium 없음, 이전 finding(Low-5 제외) 모두 해결. 남은 Low-1은 선택 사항이다.
