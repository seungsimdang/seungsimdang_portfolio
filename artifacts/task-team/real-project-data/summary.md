# summary: 실제 포트폴리오 데이터 반영

- 브랜치: `feature/real-project-data` (`develop`에서 분기, 미병합·미push)
- orchestrator: 메인 세션 (Task Team)

## 단계 상태

| 단계 | 담당 | 상태 | 산출물 |
| --- | --- | --- | --- |
| T01 input | orchestrator | done | `00-input.md` |
| T02 requirements | project-manager | done (사용자 승인) | `requirements.md` 1~12장 |
| T03 design | designer | done | `design-spec.md` |
| T04 api-spec | - | skipped (정적 사이트, 백엔드 없음) | - |
| T05 frontend | frontend-developer (worktree) | done | 구현 커밋 |
| T06 backend | - | skipped (백엔드 없음) | - |
| T07 code review | code-reviewer | done (3차 최종 통과) | `code-review-1~3.md` |
| T08 security | security-reviewer | done (3차 배포 승인) | `security-review-1~3.md` |
| 9-1 게이트 | orchestrator | done | `triage-1.md`, `triage-2.md` |
| T09 QA | qa-engineer | done (통과) | `qa-report-1.md`, `qa-report-2.md`(Pretendard 회귀) |

## 반영 범위

- 실제 프로젝트 5개(Globber, DPM Core, SEMT, Endo Admin, Endo Report), profileData, techTalks를 `src/constants/portfolio-data.ts`로 추출
- `/work/[id]` 상세 페이지 5개 정적 생성, 미등록 id 404
- 목데이터 전부 삭제(clients, 경력, 목 폼, 기본 svg 등), blog 라벨 talks 통일, contact는 이메일·GitHub 링크
- 레이어 밖 전역 `*` 리셋 제거로 p-*, m-*, space-* 유틸리티 복구
- 보안 응답 헤더, 페이지별 canonical·title, OG 메타데이터(`metadataBase`는 `seungsimdang.vercel.app`)
- QA 후속: 모바일 hero 정렬, 상세 페이지 여백, 모바일 카드 높이, contact 문구
- Pretendard(1.3.9, variable dynamic subset 자체 호스팅)로 폰트 통일

## 검증 (최종 HEAD 기준)

- `pnpm type-check`, `pnpm exec vitest run`(21), `pnpm harness:test`(23), `pnpm exec biome check`, `pnpm exec knip`, `pnpm build`, `pnpm exec playwright test`(58) 통과
- 7개 경로 × 4개 폭 화면 확인, Pretendard 전후 비교에서 붕괴 0건

## 사이클 중 함께 처리한 하네스 변경

- `.claude/settings.json` ask 규칙을 `.claude/**`에서 하위 경로별로 세분화(worktree 편집 승인 요청 해소)
- `git-safety-guard.sh`에 pkill/killall 차단 추가
- `enforce-commit-msg-style.sh` 보완: 모든 `-m` 검사, bullet 사이 빈 줄 차단, 다른 heredoc 오인 수정, 여러 줄 `-m` 파싱
- `git-commit` 스킬에 명령 작성법 추가, candanta 잔재 정리
- `confirm-edit-on-report-request.sh` 추가(보고 전용 요청 턴의 편집 확인)
- bullet마다 `-m`을 쓴 커밋 메시지 5개를 `git filter-branch --msg-filter`로 재작성(트리 동일, 백업 태그 `backup/real-project-data-before-msgfix`)

## 미검증·백로그

- Safari·Firefox 화면 미검증(Chromium만)
- 폰트 로딩 지연 구간의 WordCycler 순간 흔들림 미측정
- `/projects` 1440px의 "SEMT 제품 관리 시스템" 제목 한 글자 고아 줄(`text-wrap: balance` 검토)
- 보안 3차 리뷰는 13개 파일을 위험 API grep으로만 확인
- `block-attribution-trailers.sh`에 candanta 문구 잔존, `git-commit` 스킬의 pre-commit 단계 설명이 실제 `.husky/pre-commit`과 다름
- 정리 대기: 로컬 브랜치 `worktree-agent-a6b13aba1b9863679`(재작성 전 커밋을 가리켜 `-d` 불가), 백업 태그
- `develop`·`main` 병합은 사용자 지시 대기
