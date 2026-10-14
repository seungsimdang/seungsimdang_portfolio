# summary: Jekyll 블로그 DB 이관과 블로그 기능

- work-id: `2026-10-14-blog`
- 브랜치: `feature/blog` (기준 `origin/develop` ac2e26b)
- 상태: **done** (T09 QA 완료, 사용자 지시로 `develop`·`main` 병합과 운영 이관 완료)

## 단계 상태

| Task | 담당 | 상태 | 산출물·커밋 |
| --- | --- | --- | --- |
| T01-input | orchestrator | done | `00-input.md` (878cc13) |
| T02-requirements | project-manager | done, 사용자 승인 | `requirements.md` (878cc13) |
| T03-design | designer | done | `design-spec.md` (58cf8a9) |
| T04-api-spec | backend-developer | done | `api-spec.md` (58cf8a9) |
| T06-backend | backend-developer (worktree) | done | 94738c5 |
| T05-frontend | frontend-developer (worktree) | done | 8f9c209 |
| T07 1차 | code-reviewer | 재작업 판정 | `code-review-1.md`, `triage-1.md` |
| T07 재작업 1 | frontend-developer (worktree) | done | 3bf60c3 |
| T07 재리뷰 | code-reviewer | 통과, Low N-1 사용자 결정으로 포함 | `code-review-2.md`, `triage-2.md`, 6f5e0b7 |
| T08 1차 | security-reviewer | 배포 승인, SEC-01·SEC-02 재작업 | `security-review-1.md`, `triage-security-1.md` |
| T08 재작업 | backend-developer (worktree) | done | 81a9553 |
| T08 재리뷰 | security-reviewer | 배포 승인 | `security-review-2.md` |
| 사이클 전체 최종 리뷰 | code-reviewer, security-reviewer | 통과, 배포 승인 | `code-review-3.md`, `security-review-3.md`, `triage-3.md` |
| 최종 리뷰 후 수정 | orchestrator (9-1 예외, 사용자 승인) | done, 범위 재리뷰 통과 | baec0b9 (`code-review-4.md`), f1bc8d7 (`code-review-5.md`), 93921de (`code-review-6.md`) |
| code-review-6 Low 정리 | orchestrator (사용자 승인) | done, 별도 재리뷰 없음 (동작 불변, 단위·e2e 재검증) | daeacf2 |
| T09-qa | qa-engineer | 조건부 통과 | `qa-report-1.md`, bf7a4f4 |

## 주요 결정

- 데이터 소스는 기존 Neon + Drizzle DB, 블로그는 포트폴리오 안 `/blog`, talks는 `/talks`로 이동 (리다이렉트 없음).
- 블로그 slug만 한글 허용 (Google Search Central URL 구조 가이드 근거), projects·talks 영문 규칙 유지, `new` 금지.
- 이미지는 `_images`와 git 이력 복원 4개, 원본 재다운로드 3개를 Blob으로 이관. 정상 외부 이미지 6개는 URL 유지 (사용자 결정).
- admin 본문 이미지 업로드 포함 (사용자 결정), 썸네일 업로드 검증을 공용화하고 GIF는 본문 이미지만 허용.
- CSP는 nonce 대신 정적 유지 정책 (사용자 결정). nonce는 Next 문서상 모든 페이지 동적 렌더링이 필요해 정적 생성·ISR·CDN 캐시를 잃음. `script-src 'unsafe-inline'`이라 XSS 1차 방어선은 렌더러 sanitize이며 회귀 테스트로 고정함.
- 동적 렌더링인 블로그 경로 링크만 `prefetch={false}`. 페이지 이탈 시 중단된 prefetch 스트림이 서버 오류 로그로 남는 것을 막기 위함.
- 재리뷰 이후 Low(N-1, R-2, 요약 N-1~N-3, 요약 F-1·F-2, F-A·F-B)는 모두 사용자 결정으로 이번 사이클에 포함.

## 검증 (orchestrator, daeacf2 기준)

- `pnpm type-check`, `pnpm exec vitest run`(393 통과), `pnpm check`, `pnpm knip`, react-doctor staged, `pnpm harness:test`(43 통과) 통과.
- `pnpm test:e2e:local` 50 통과 (E2E 전용 DB, 운영 DB와 다른 호스트 확인).
- 빌드 결과 `/`, `/about`, `/contact`, `/projects`, `/talks`, `/work/*` 정적 유지, `/blog`·`/blog/[slug]`는 동적.
- 81a9553 이후 `curl -I`로 공개 경로와 admin에 CSP가 각각 1개씩 붙고 admin만 `form-action`에 `https://github.com` 포함 확인.
- headless 브라우저로 공개 8개 경로와 `/admin/login` 방문 시 CSP 위반 0건 (로컬 `next start`에는 `/_vercel/*` 분석 스크립트가 없어 MIME 거부만 발생, CSP 무관).
- `The destination stream closed early` 서버 로그: develop 기준 e2e 0건, 수정 전 feature/blog 31건. 동적 `/blog` 링크 prefetch 스트림이 페이지 이탈로 중단되는 것을 headless로 재현. 블로그 경로 링크 prefetch를 끈 뒤 0건 (93921de, daeacf2에서 재확인).

## 이관 실행 (2026-10-14, 사용자 지시)

- `main` 병합 60a9317 push 후 운영 빌드가 `0003` 마이그레이션을 적용해 운영 DB에 `posts` 테이블 생성 확인 (적용 마이그레이션 4개).
- 운영 DB 기준 dry-run: INSERT 297 / SKIP 0 / FAIL 0, 이미지 로컬 124·git 복원 4·다운로드 3·외부 유지 6·미해결 0. 복구 원본 URL 3건 200 재확인.
- `--apply` 실행 (대상 호스트 확인 후): INSERT 297 / FAIL 0. 롤백용 리포트는 `migrate-apply-report.json` (삽입 slug 목록과 원본 파일명별 Blob 경로).
- 검증: 운영 DB `posts` 297행 모두 공개, 본문 Blob 이미지 URL 131개 전부 200, 예전 저장소 이미지 참조 잔존 0건, 재실행 dry-run은 SKIP 297로 멱등 확인.
- 운영 사이트 `https://seungsimdang.vercel.app`: `/blog`("총 297개 중 1-20번째", 20행), `/blog?page=15`, 한글 slug 상세, 날짜 없던 글 상세, `/talks` 200, 없는 slug 404, CSP 헤더 적용. headless로 이미지 있는 글 6개의 본문 이미지 17개가 스크롤 후 모두 로드, CSP 위반 0건.

## 미검증으로 남은 항목 (qa-report-1)

- 이관 스크립트 멱등성 단위 테스트: `scripts/migrate-blog.ts`가 export 없는 `main()` 하나라 불가. 운영 재실행 dry-run(SKIP 297)으로만 확인.
- posts API 라우트의 CRUD·409·404와 DB unique 위반 변환 (DB 모킹 필요).
- admin 블로그 화면 (GitHub OAuth 필요): 목록·편집·삭제·notice 위치, 이미지 업로드 삽입, 미리보기, .md import.
- e2e에 `/blog` 목록·상세 시나리오 없음 (orchestrator가 빌드 서버에서 `/blog`, 한글 slug 상세 200, 없는 slug 404만 수동 확인).

## 백로그

- 이관 스크립트 순수 로직 분리와 멱등성 테스트.
- `/blog` 공개 목록·상세 e2e 시나리오.
- admin 블로그 화면 검증 경로 (OAuth 우회 테스트 세션 등).
- 업로드 후 미저장 고아 Blob 정리 (요구사항상 범위 밖).
