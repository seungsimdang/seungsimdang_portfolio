# summary: 포트폴리오 데이터 DB 이전 및 admin CRUD

- 작성자: Claude orchestrator
- 브랜치: `feature/admin-portfolio-cms` (develop `609d242`에서 분기, 미푸시)
- 최종 커밋: `0ffe779`

## 결정

- 아키텍처: 같은 Next.js 프로젝트의 `/admin` 라우트 (모노레포 기각: 하네스·Vercel 재구성 비용, 소유자 1명)
- 인증: next-auth v4 GitHub OAuth + `ADMIN_GITHUB_ID` allowlist, JWT 8시간, proxy + 서버측 `requireAdmin` 재검사, 변경 요청 Origin 검사, admin noindex/no-store, env 미설정 시 fail-closed
- DB: candanta 기준 Neon Postgres + Drizzle(neon-http) + drizzle-kit. Neon 프로젝트 `seungsimdang-portfolio`(`dawn-rice-73098836`, us-east-1, PG 18) 생성, 마이그레이션·seed 적용(profile 1, projects 5, experiences 9, tech_talks 2)
- 의존성 정책: `jose@4.15.9` trustPolicyExclude, `esbuild: false` (사용자 승인)

## 단계 상태

| 단계 | 담당 | 상태 | 산출물 |
| --- | --- | --- | --- |
| T01 | orchestrator | done | `00-input.md` |
| T02 | project-manager | done | `requirements.md` |
| T03 | designer | done | `design-spec.md` |
| T04 | backend-developer | done | `api-spec.md` |
| T06 | backend-developer (worktree) | done | 1차 시도는 의존성 정책 차단으로 중단, 승인 후 재실행 |
| T05 | frontend-developer (worktree) | done | T06 패치 적용 후 진행 (T05가 T06 계약에 의존해 순차 실행) |
| T07 | code-reviewer | done | `code-review-1~5.md` |
| T08 | security-reviewer | done | `security-review-1~4.md`, 모두 배포 승인 |
| 9-1 게이트 | orchestrator | done | `triage-1~4.md` |
| T09 | qa-engineer | done | `qa-report-1.md`, 신규 테스트 5파일, 127 tests 통과 |

## 계획과 달라진 점

- `portfolio-data.ts`는 Production seed 검증 후 제거 예정이었으나 새 타입과 맞지 않아 이번 사이클에서 제거. 데이터는 `src/db/seed-data.ts`로 이전
- 메인 체크아웃 브랜치 생성이 `git-safety-guard.sh`에 막힘(원격 브랜치까지 세는 판정). 다른 세션 부재 확인 후 사용자 승인으로 `git branch` + `git switch` 사용

## 사용자 조치 필요 (배포 전)

- GitHub OAuth App 생성(로컬·Production 콜백 `/api/auth/callback/github`), `GITHUB_ID`·`GITHUB_SECRET`
- `.env.local`과 Vercel에 `NEXTAUTH_SECRET`, `NEXTAUTH_URL`(Production 필수), `ADMIN_GITHUB_ID`, 필요 시 `ADMIN_ALLOWED_HOSTS`
- Vercel Production·Preview에 `DATABASE_URL` (정적 생성이 빌드 시 DB 조회)
- GitHub Actions `ci.yml`의 `pnpm build`·`pnpm test:e2e`가 `DATABASE_URL` 없이 실패. Secret 등록과 ci.yml env 주입 필요(미반영)

## 미검증 (수동 확인 필요)

- GitHub OAuth 실로그인과 allowlist 실계정
- 실제 저장·삭제·순서 변경 후 공개 페이지 갱신(`revalidatePath`)
- admin 화면 브라우저 동작, 모바일 레이아웃, 접근성
- `mapCreateError`, `toProject`, `toExperience`, `safeHttpUrl`, `safeThumbnail` 단위 테스트(미export)

## 후속 항목 (백로그)

- `seed-data.ts`·`seed.ts` 제거 시 `tests/e2e/real-project-data.spec.ts` 기대값 출처 대체
- e2e에 admin 시나리오(미인증 리다이렉트, 401, noindex) 추가
- CI에 `pnpm test`(단위 테스트) 단계 없음
- `docs/agent-rules`의 axios `HttpStatusCode` 전제와 이 저장소의 `HttpStatus` 상수 불일치
- CSP `script-src` 미설정
