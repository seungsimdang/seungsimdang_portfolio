# triage-4: 4차 재리뷰(재작업 확인) 재검토 (orchestrator 9-1 게이트)

대상: `code-review-4.md`(통과, Low-1), `security-review-4.md`(배포 승인, Low-1 잔여, Info-1~2).

| finding | 확인한 코드 | 타당성 | 처리 |
|---------|-------------|--------|------|
| T08 Low-1 잔여: 기존값 유지 스키마가 원문을 출력해 save 비교가 어긋남 | `portfolio.schema.ts:277` `thumbnail: z.string()`, `project-form.tsx:84-88` 원문 비교 | 타당 | 3차에서 사용자가 포함으로 결정한 항목의 미완성분이라 orchestrator가 직접 수정(9-1 예외: 사용자 승인 범위, 한 줄, 다른 세션 없음). `z.string().trim()`으로 교체, 임시 테스트로 trim 출력 확인 후 삭제 |
| T07 Low-1: `inputName`이 객체 첫 키가 입력 칸이라는 가정에 기댐 | `form-errors.ts:33-39` | 타당 (현재 값 모양에서는 발생하지 않음) | 2차 이후 Low라 사용자 결정 |
| T08 Info-1~2 | - | 위험 없음 | 처리 없음 |

- 검증: tsc(.next/dev 제외) 통과, vitest 408 통과, biome 통과.
- T07 Low-1 사용자 결정: 가정 주석 추가. `form-errors.ts` inputName 위에 한 줄 추가(orchestrator 직접, 동작 변화 없음).
