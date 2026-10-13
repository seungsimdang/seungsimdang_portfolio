# triage-1: 1차 리뷰 finding 재판단

- 작성자: Claude orchestrator (9-1 게이트)
- 대상: `code-review-1.md`, `security-review-1.md`
- 기준 커밋: `3206169`

## 재작업 (이번 사이클)

| ID | 원 심각도 | 판단 | 근거 |
| --- | --- | --- | --- |
| CR1-02 | High | 타당, Medium으로 조정 | requirements 8절과 DB 장애 정책은 DB를 필수 선행 조건으로 두는데 `work/[id]/page.tsx`의 `generateStaticParams` catch만 빈 목록으로 삼켜 정책과 어긋남. 루트 layout이 이미 DB를 요구하므로 catch는 실효도 없음. catch와 주석 제거로 통일 |
| CR1-03 | Medium | 타당 | `PortfolioNotSeededError`가 `adminRoute`에 매핑되지 않아 seed 전 profile 저장이 500 |
| CR1-04 | Medium | 타당 | 순서 변경의 SELECT 확인과 batch UPDATE 사이 경합. 단일 편집자라 한계를 주석으로 명시 |
| CR1-05 | Medium | 타당 | 이탈 가드가 해시 링크(스킵 링크)와 수정키 클릭에도 확인창을 띄움 |
| CR1-06 | Low | 타당 | `?deleted=` 값을 그대로 표시. 고정 문구로 교체 |
| SEC-002 | Low | 타당 | Origin 비교가 `x-forwarded-host`를 우선 신뢰 |
| SEC-004 | Low | 타당 | 링크 스킴 검증이 쓰기 시점에만 있음. 읽기 매핑에서도 http/https만 통과 |
| SEC-001 | Medium | 타당, 사이클 diff 밖 | `next.config.ts` 기존 파일. 사용자 결정으로 이번 사이클에 포함 |

## 기각

| ID | 기각 사유 |
| --- | --- |
| CR1-01 | 이 하네스에서 신규 테스트는 T09 QA가 직접 작성함. 가드 단독 검증과 env 미설정 fail-closed 검증을 T09 지시에 포함 |
| CR1-07 | 위반 없음 확인 기록이며 finding 아님 |
| CR1-08 | `seed-data.ts` 제거 시점의 후속 항목. 지금 수정할 코드 없음, summary 후속 항목으로 기록 |
| SEC-003 | admin API는 allowlist 소유자 1명만 호출 가능. 세션 탈취 시 rate limit으로 막을 수 없고 저장소가 필요한 구현 비용 대비 효과 없음 |
| INFO-1, INFO-2 | 조치 불필요 판정 |
