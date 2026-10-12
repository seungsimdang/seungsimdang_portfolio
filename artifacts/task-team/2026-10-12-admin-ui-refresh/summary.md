# summary: admin UI 개선 및 썸네일 업로드

- 브랜치: `feature/admin-ui-refresh` (develop `6fb558e`에서 분기)
- 마지막 갱신: 2026-10-12, Claude orchestrator
- 현재 상태: T02 완료 후 사용자 지시로 보류(hold). 다음 세션이 이 문서와 `requirements.md`를 읽고 이어서 진행

## 단계 상태

| 단계 | 담당 | 상태 | 산출물 |
| --- | --- | --- | --- |
| T01 입력 정리 | orchestrator | done | `00-input.md` |
| T02 요구사항 | project-manager | done | `requirements.md` (Q1-Q13, A1-A5 사용자 결정 반영) |
| T02 승인 게이트 | 사용자 | pending | 기능 F1-F11 요약 보고 후 명시적 승인 필요. 아직 승인 요청 전 |
| T03 디자인 | designer | pending | `design-spec.md` |
| T04 API 명세 | backend-developer | pending | `api-spec.md` |
| T05/T06 구현 | frontend/backend-developer | pending | worktree 격리 |
| T07/T08 리뷰 | code/security-reviewer | pending | `code-review-N.md`, `security-review-N.md` |
| T09 QA | qa-engineer | pending | `qa-report-N.md` |

## 다음 세션이 할 일

1. `requirements.md` 3절 F1-F11과 5절 결정 표를 사용자에게 요약 보고하고 T02 승인을 받는다(Task Team 게이트).
2. 승인 후 T03과 T04를 병렬 진행한다.
3. T04 api-spec에서 반드시 정할 미결정: 배포 직후부터 F11 실행 전까지 `/images` 썸네일 프로젝트를 썸네일 미변경으로 저장할 때 막히지 않게 하는 방식(F7 edge case).
4. 구현 전에 사용자 작업 1-3(Blob 스토어 생성, 토큰 연결, `.env.local` 토큰)이 끝났는지 확인한다. 토큰 없으면 빌드 실패로 결정됐다(Q6).

## 이번 세션에서 끝낸 작업

- Neon `preview` 브랜치 생성: `br-winter-frost-b8ysl2y3`, 엔드포인트 `ep-snowy-dew-b88kcy4t`, `main`에서 분기한 Production 사본.
- Vercel Preview `DATABASE_URL`을 위 브랜치로 교체(`vercel env update`, `✓ Updated`). Secret이라 값 재확인 불가, 다음 Preview 배포에서 접속 호스트 확인 필요(미확인).
- 하네스 수정(이 브랜치에 커밋됨):
  - `git-safety-guard.sh` 새 브랜치 차단을 브랜치 수 대신 살아 있는 worktree 기준으로 변경. candanta(`f22e258`, develop), globber-dashboard(`75e733c`, main)에도 같은 변경을 푸시함.
  - `block-reask-after-free-text-answer.sh`가 jq `-R`의 4095바이트 경계 한글 깨짐으로 선택지 답변을 직접 입력으로 오판하던 문제를 수정함(`2cbd5a2`).

## 사용자 결정 요약

- 썸네일: Vercel Blob public, png/jpg/webp 최대 4MB, 서버 경유 업로드, 프로젝트 저장 시 DB 반영.
- 썸네일 값은 Blob URL만 허용. 기존 `/images` 5개는 이번 사이클에서 Blob으로 이전하고 원본 이미지와 이전 스크립트도 이번 사이클에서 삭제(배포 → 이전 실행 → 확인 → 삭제 커밋 순서).
- 교체 시 이전 Blob 삭제, 프로젝트 삭제 시 Blob 삭제(둘 다 best effort).
- Blob 토큰 없으면 빌드/실행 실패. CI에는 더미 값을 `ci.yml`에 직접 넣음.
- 순서 변경은 draft + 저장 버튼, 저장 실패 시 draft 유지.
- 헤더: admin 헤더 틀은 공개 Navbar와 동일, 이름은 양쪽 모두 DB 프로필 이름 "SeungHyun Lee". admin 이름 링크는 `/admin/projects`.
- 프로필 이름 변경과 썸네일 이전은 코드가 Production에 배포된 직후 dry-run을 보여 주고 승인 후 orchestrator가 실행.
- slug 변경 허용(리다이렉트 없음)과 빌드 시 마이그레이션 자동 적용(Preview 전용 DB, 모든 빌드)을 이번 사이클에 포함.
