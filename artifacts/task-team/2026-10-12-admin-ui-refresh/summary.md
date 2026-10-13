# summary: admin UI 개선 및 썸네일 업로드

- 브랜치: `feature/admin-ui-refresh` (develop `6fb558e`에서 분기)
- 마지막 갱신: 2026-10-13, Claude orchestrator
- 현재 상태: T07/T08 최종 리뷰 통과, T09 QA 조건부 통과. admin UI(F1-F6) 수동 확인과 develop 병합 지시 대기

## 단계 상태

| 단계 | 담당 | 상태 | 산출물 |
| --- | --- | --- | --- |
| T01 입력 정리 | orchestrator | done | `00-input.md` |
| T02 요구사항 | project-manager | done | `requirements.md` (Q1-Q13, A1-A5 사용자 결정 반영) |
| T02 승인 게이트 | 사용자 | done | F1-F11 요약과 별도 Production 승인 범위 설명 후 "ㅇㅇ 진행해" 승인 |
| T03 디자인 | designer | done | `design-spec.md` |
| T04 API 명세 | backend-developer | done | `api-spec.md` |
| T05/T06 구현 | frontend/backend-developer | done | 커밋 `28cff6c`. 임시 worktree 3개는 2026-10-13 정리 |
| T07/T08 리뷰 | code/security-reviewer | done | `code-review-1·2.md`, `security-review-1·2.md`, 판정 기록 `triage-1.md`. 2차(사이클 전체 최종) 모두 통과 |
| T09 QA | qa-engineer | done(조건부) | `qa-report-1.md`. vitest 187개, e2e 50개 통과. admin UI F1-F6은 로그인 자동화 수단이 없어 미검증 |

## 다음 세션이 할 일

1. 사용자가 로컬 `pnpm dev`에서 admin UI(F1-F6, F7 폼 업로드, F9 slug 변경)를 직접 확인한다. GitHub 로그인이 필요해 자동 검증 불가.
2. 확인 후 사용자 지시에 따라 develop 병합과 Production 배포를 진행한다.
3. F8은 완료. Production 배포 직후 F11 썸네일 이전을 dry-run 결과를 보여 주고 승인받은 뒤 실행한다(`api-spec.md` 6절). 2026-10-13 dry-run(읽기 전용)에서 이전 대상은 썸네일이 있는 모든 항목(사용자 확정, 현재 globber 1개).
4. F11 확인 후 이전된 원본 이미지, `scripts/migrate-thumbnails.mjs`, `portfolio-service.ts`의 `LEGACY_THUMBNAIL_PATTERN` 분기를 삭제 커밋한다.
5. 다음 Preview 배포에서 Preview DB 엔드포인트(`ep-snowy-dew-b88kcy4t`) 사용 여부를 확인한다(미확인).
6. GitHub Secret `E2E_DATABASE_URL`이 e2e 전용 Neon 브랜치를 가리키는지 사용자가 1회 확인한다(Secret이라 값 확인 불가).

## 이번 세션에서 끝낸 작업

- Codex에서 Vercel/Neon MCP OAuth 로그인과 실제 조회 성공. 중복 전역 `Neon` MCP 항목 제거, `neon` 유지.
- Vercel 프로젝트 ID `prj_ucBkqjIQe56TEQJnjvDLKgX9A9dx`. 환경변수 메타데이터 조회에서 Blob 토큰 없음. 로컬 `.env.local`도 Blob 토큰 없음(값 출력하지 않음). 스토어 존재 여부는 아직 미확인.
- 제공 도구에 TeamCreate/TaskCreate/TaskUpdate와 Agent isolation 옵션이 없어 원본 Task Team 프로토콜은 실행하지 않음. 현재 HEAD `f8f0a1f`를 명시한 별도 Git worktree에 산출물을 복사하고 collaboration 에이전트의 작업 디렉터리·파일 소유 범위를 고정해 대체 격리. 원본 isolation 프로토콜은 미검증.
- 관리형 worktree 도구로 만든 `~/.codex/worktrees/de33/seungsimdang_portfolio`는 쓰기권한 밖이라 구현에 사용하지 않음. 2026-10-13 정리.
- 사용자 질문 UI: async 질문은 생성되며, 일반 Up은 질문 탐색 대신 입력 히스토리 복원. 최종 질문에 도구 답변으로 "승인 - 생성·연결 진행" 수신. 정확한 해결 키/설정은 사용자가 찾았으며 이 세션에서 확인된 해결법으로 기록하지 않음.
- 승인 뒤 Blob `portfolio-thumbnails` 생성: `store_mrUm5ebtffUytYOv`, public, iad1. 스토어 상세 및 프로젝트 env 메타데이터로 Production/Preview/Development 연결과 `BLOB_READ_WRITE_TOKEN` 생성 확인. 로컬 `.env.local`에 `BLOB_READ_WRITE_TOKEN`, `NEXT_PUBLIC_BLOB_HOSTNAME` 추가 확인(값 미출력).

- Neon `preview` 브랜치 생성: `br-winter-frost-b8ysl2y3`, 엔드포인트 `ep-snowy-dew-b88kcy4t`, `main`에서 분기한 Production 사본.
- Vercel Preview `DATABASE_URL`을 위 브랜치로 교체(`vercel env update`, `✓ Updated`). Secret이라 값 재확인 불가, 다음 Preview 배포에서 접속 호스트 확인 필요(미확인).
- 하네스 수정(이 브랜치에 커밋됨):
  - `git-safety-guard.sh` 새 브랜치 차단을 브랜치 수 대신 살아 있는 worktree 기준으로 변경. candanta(`f22e258`, develop), globber-dashboard(`75e733c`, main)에도 같은 변경을 푸시함.
  - `block-reask-after-free-text-answer.sh`가 jq `-R`의 4095바이트 경계 한글 깨짐으로 선택지 답변을 직접 입력으로 오판하던 문제를 수정함(`2cbd5a2`).

## 사용자 화면 확인 후 변경 (2026-10-13)

- 관리자 탭 순서를 프로젝트, 발표, 프로필로 변경. `/admin` 기본 이동 대상(프로젝트)이 첫 탭이 되도록 맞춤.
- 관리자 헤더의 "사이트 보기" 링크 제거(사용자 요청 기능이 아니었고 세로 정렬도 어긋남).
- 프로젝트·발표 목록은 행 전체를 눌러 편집으로 이동. 마우스를 올리면 행 배경과 제목 밑줄로 표시. 순서·삭제 버튼은 행 링크 위에 따로 동작.
- 관리자 헤더를 공개 Navbar와 같은 77px로 맞춤(위아래 여백 16px, 44px 터치 영역 유지). 로그아웃 글꼴 굵기 400 통일, 반응형 기준 768px 통일, 모바일 탭 간격 16px 추가.
- 관리자 버튼 여백을 variant별로 지정. 기본 스타일의 `px-20`이 아이콘 버튼 `px-8`을 덮던 문제 해소.
- 썸네일 "삭제"를 "썸네일 제거" 테두리 버튼으로 바꿔 미리보기 바로 아래로 이동, 안내 문구에 저장 시 반영 명시.
- 남은 기존 문제(범위 밖): 공개 Navbar가 모바일(390px)에서 줄바꿈 없이 contact 링크가 화면 밖으로 나감.
- F8 실행 완료: Production `profile.name`을 사용자 지시로 `이승현`에서 `SeungHyun Lee`로 변경(조건부 UPDATE, 1행). 원복은 `id = 1` 한 행의 name을 `이승현`으로 되돌리는 것. 배포된 공개 사이트는 정적 캐시라 다음 Production 배포 또는 admin 프로필 저장(재검증) 전까지 이전 이름 표시.

## 사용자 결정 요약

- 썸네일: Vercel Blob public, png/jpg/webp 최대 4MB, 서버 경유 업로드, 프로젝트 저장 시 DB 반영.
- 썸네일 값은 Blob URL만 허용. 기존 `/images` 썸네일 전부(현재 globber 1개)는 이번 사이클에서 Blob으로 이전하고 원본 이미지와 이전 스크립트도 이번 사이클에서 삭제(배포 → 이전 실행 → 확인 → 삭제 커밋 순서).
- 교체 시 이전 Blob 삭제, 프로젝트 삭제 시 Blob 삭제(둘 다 best effort).
- Blob 토큰 없으면 빌드/실행 실패. CI에는 더미 값을 `ci.yml`에 직접 넣음.
- 순서 변경은 draft + 저장 버튼, 저장 실패 시 draft 유지.
- 헤더: admin 헤더 틀은 공개 Navbar와 동일, 이름은 양쪽 모두 DB 프로필 이름 "SeungHyun Lee". admin 이름 링크는 `/admin/projects`.
- 프로필 이름 변경과 썸네일 이전은 코드가 Production에 배포된 직후 dry-run을 보여 주고 승인 후 orchestrator가 실행.
- slug 변경 허용(리다이렉트 없음)과 빌드 시 마이그레이션 자동 적용(Preview 전용 DB, 모든 빌드)을 이번 사이클에 포함.
