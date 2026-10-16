# 프로젝트 썸네일 확장 진행 상태

- 재개: 2026-10-16, Codex orchestrator.
- 사용자 지시: Task Team 산출물 확인 후 T07·T08부터 이어서 진행.
- 작업 브랜치: `feature/project-thumbnails`, 재개 기준 HEAD `8737d25`.
- 사이클 분기 기준: `72f8aa0`. 구현 `a436da6`, 후속 `f8c36a4`, `8737d25` 중심으로 검토.
- `handoff.md`의 T05 pending·T06 미병합 상태는 과거 기록이며, 현재 구현은 작업 브랜치에 커밋된 상태임.
- TaskCreate·TaskUpdate·TeamCreate 도구는 제공되지 않아, 아래 표와 역할별 산출물·메시지로 진행 상태를 관리함.

| 단계 | 담당 | 입력 | 상태 | 결과 |
| --- | --- | --- | --- | --- |
| T01 | 기존 orchestrator | 사용자 요청 | done | `00-input.md` |
| T02 | 기존 project-manager | 입력 | done | `requirements.md`, 11·13절 확정 내용 우선 |
| T03 | 기존 designer | 요구사항 | done | `design-spec.md`, 보완 커밋 `0ab775e` |
| T04 | 기존 backend-developer | 요구사항 | done | `api-spec.md`, 사용자 결정 부록 우선 |
| T05·T06 | 기존 구현자 | 디자인·API 명세 | done | 구현 커밋 `a436da6` |
| T07 | code-reviewer | 명세·실제 diff | done | `code-review-2.md` High 해결 확인, `code-review-3.md` 사이클 전체 최종 리뷰 통과 |
| T08 | security-reviewer | 명세·실제 소스 | done | `security-review-2.md` 최종 통과. 신규 Low 2건은 사용자 결정으로 수정, Low만이라 재리뷰 생략(`triage-2.md`) |
| T09 | qa-engineer | 수용 기준·리뷰 | done | `qa-report-1.md` 통과, 2차 재작업 후 `qa-report-2.md` 통과 |

## 재개 시 직접 검증

- `pnpm type-check`: 통과.
- `pnpm exec vitest run`: 38파일, 478개 통과.
- `pnpm exec biome check .`: 213파일 통과.
- `pnpm knip`: 통과.
- 수정 전 baseline `pnpm test:e2e:local`: 제한 환경에서 마이그레이션 `UnknownError`로 중단. 제한 밖 동일 명령은 빌드·테스트 DB 마이그레이션 및 desktop/mobile 120개 통과(52.6초).
- 최상위 `artifacts/bug-team/postmortem-*.md` 2건 확인: Task Team 피드백 초안 섹션 없음. 기존 기록 보존.

## 재작업 및 추가 범위

- 느린 이미지 로드 전 현재 프레임 유지: 격리 frontend worktree 수정 후 메인에 반영, 재리뷰 통과.
- Origin scheme·host·port 검증: 격리 backend worktree 수정 후 메인에 반영.
- Blob 자동 삭제 유지 및 경합 방지: 사용자 결정 반영. 퇴역 URL 테이블·동일 advisory lock·DB trigger 추가, 삭제 대상으로 확정된 URL 재등록 거부. 운영이 아닌 E2E DB에서 migration 검증 진행 중.
- DPM Core 모바일 이미지: 첨부 순서 `1.webp`~`6.webp`(1290×2796), 사용자가 PC 이미지를 별도 전달하기로 했으므로 데이터 반영 대기.

## 후속 승인 지점

- SEMT·Candanta·Globber 운영 데이터 변경: QA 후 실행 전 사용자 승인 필요(`requirements.md` D4·D5 및 `handoff.md`).
- DPM Core 변경은 사용자가 지시했으며 PC 이미지 수신 대기. 운영에는 아직 단수 `thumbnail` 컬럼만 있어 배포 전에는 새 모바일 배열을 저장할 수 없음(직접 조회 확인).
- 운영 배포 전 0006의 기존 `thumbnail` 컬럼 제거 영향 재확인 필요.
- 커밋·푸시·병합·배포는 이번 재개 지시만으로 실행하지 않음.

## 2차 재작업 및 마무리 (2026-10-16, Claude orchestrator가 Codex 세션 이어받음)

- SEC-T08-03: 썸네일 retirement lock을 `7301005`로 분리(서비스 상수와 0008 trigger 함수 교체).
- SEC-T08-04: 0008이 `retired_thumbnail_blobs.deleted_at` 추가. 사용자 선택에 따라 별도 cron 없이 이후 Blob 정리 때마다 `deleted_at` null인 URL을 재시도함. 관리자 편집이 없으면 재시도도 없음.
- 직접 재검증: type-check, Biome, knip, 주석 검사 통과. `pnpm exec vitest run --maxWorkers=2` 484 통과·6 skip(opt-in DB). E2E 전용 DB에 0008 적용·컬럼과 lock 키 확인, DB 통합 6개 통과.
- QA 2차 보고 기준 전체 E2E 138개 통과(orchestrator는 E2E를 재실행하지 않음).
- Codex가 남긴 `/private/tmp/seungsimdang-*-rework-20261016` worktree 2개는 내용이 메인에 모두 반영된 것을 파일 비교로 확인 후 제거함.
- DPM Core PC 이미지: `~/Downloads/DPM Core 썸네일 1920×1080@1x.png`(1920×1080)로 `data-change-plan.md`에 기록.

## 남은 사용자 승인 지점

- 커밋, develop 병합, 배포.
- main 배포 직전 D1(0006 `thumbnail` 컬럼 제거) 재확인.
- 배포 후 SEMT·Candanta·Globber·DPM Core 운영 데이터 반영(`data-change-plan.md`).

## 커밋 (2026-10-16, 사용자 승인)

- 커밋 중 React Doctor(pre-commit)가 `project-card-thumbnails.tsx`의 경고 3건(렌더에 쓰지 않는 상태, effect 안 상태 재조정)을 보고함. 로드·경과 여부를 ref로 바꾸고 전환 판정을 타이머 콜백과 `onLoad`로 옮겨 경고 0건으로 수정. 동작 변경 의도 없음, 컴포넌트 테스트와 전체 E2E 138개 재통과로 확인. 리뷰 이후 수정이라 T07 재리뷰는 실행하지 않음.
- `d67cb7a` fix(portfolio): 썸네일 자동 전환 시 다음 이미지 로드 전까지 현재 프레임 유지
- `586b81b` fix: admin 쓰기 요청의 Origin 검사를 scheme·host·port 전체 비교로 강화
- `aa8bd60` fix(portfolio): 썸네일 Blob 정리의 참조 경합 방지와 삭제 실패 재시도 추가
- `ac9414f` test: 프로젝트 썸네일 PC·모바일 분기와 자동 전환 E2E·컴포넌트 테스트 추가
