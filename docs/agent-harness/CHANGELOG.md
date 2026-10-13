# 하네스 변경 이력

## 2026-10-13 - AskUserQuestion 재질문 차단 훅의 peer 메시지 턴 오탐 수정

`block-reask-after-free-text-answer.sh`는 사용자 메시지가 들어오면 직접 입력 상태를 초기화하는데, `isMeta`인 항목은 건너뛰었다. 다른 세션 메시지와 subagent hand-back은 `isMeta: true`, `origin.kind: "peer"`로 기록되면서도 새 턴을 시작하므로, 그 턴에서도 이전 직접 입력 답변이 남아 몇 턴 뒤의 AskUserQuestion까지 차단했다. `origin.kind == "peer"` 항목도 초기화 대상에 넣고, 해당 경우를 `__tests__/lint/runtime-hooks.test.ts`에 추가했다.

## 2026-10-13 - develop·main fast-forward 반영 차단

메인 세션이 관심사와 무관한 feature 브랜치에서 커밋한 뒤 `git fetch . X:develop`으로 develop·main에 fast-forward 반영해, 브랜치 출처가 이력에 남지 않았다. Claude 훅은 이런 우회 경로를 다 잡지 못하므로 push 시점에 검사하는 `scripts/check-merge-only-push.sh`를 `.husky/pre-push` 첫 단계로 추가했다. develop·main에 새로 들어오는 first-parent 커밋은 모두 병합 커밋이어야 하고, main 병합 커밋의 두 번째 부모는 develop first-parent 경로 위의 커밋이어야 한다. 두 브랜치의 삭제 push도 막는다. 검사는 `__tests__/lint/git-guards.test.ts`가 고정한다.

## 2026-10-12 - AskUserQuestion 재질문 차단 훅 오탐 수정

`block-reask-after-free-text-answer.sh`가 트랜스크립트를 `jq -R`로 줄 단위 문자열로 읽은 뒤 `fromjson`으로 해석했다. jq 1.7.1의 `-R`은 4095바이트를 넘는 줄을 나눠 읽으면서 경계에 걸린 한글 등 멀티바이트 문자를 U+FFFD로 깨뜨려, 선택지를 그대로 고른 답변("함께 삭제 (권장)")도 라벨과 달라져 직접 입력으로 오판했다. `jq -n`으로 JSON을 직접 읽도록 바꾸고, 라벨의 한글이 4095바이트 경계에 걸리는 경우를 `__tests__/lint/runtime-hooks.test.ts`에 추가했다.

## 2026-10-12 - git-safety-guard 새 브랜치 차단 기준 수정

메인 체크아웃의 새 브랜치 생성 차단이 `git branch -a` 줄 수(원격·병합 완료 브랜치 포함) 3개 초과를 동시 사용 신호로 써서, 다른 세션이 없어도 항상 차단됐다. 한 체크아웃은 브랜치 하나만 쓰므로 다른 세션의 브랜치 작업은 worktree를 반드시 남긴다. 판정을 메인 외 살아 있는 worktree(`prunable` 제외) 존재 여부로 좁히고, `docs/agent-rules/git-safety.md`와 `__tests__/lint/runtime-hooks.test.ts`를 같은 기준으로 갱신했다.

## 2026-10-01 — Candanta 구조를 참고한 재구축

기존 하네스는 규칙 문서와 단일 실행 안내만 제공했다. 기능·버그·부분 재실행의 실제 절차, 역할별 책임·입출력, 도구별 발견 경로와 인계 계약을 추가했다.

- 공용 원본에서 Claude/Codex의 12개 역할·4개 스킬을 생성한다.
- 기능·버그·일반 인계 산출물을 work-id별로 보존한다.
- 원본과 생성 파일의 정확한 일치를 검사하며 CI·verify에 연결했다. 선택 pre-commit은 staged snapshot을 검사한다.
- Framer 보존 규칙과 현재 Next.js·Tailwind·Playwright 명령에 맞춰 도메인·경로·검사를 조정했다.
- 기존 앱, 디자인 자산·Framer 연결 설정, 사용자 scaffold-web-project 스킬은 보존했다.

실제 실행 결과와 미검증 범위는 artifacts/work/2026-10-01-harness-rebuild/summary.md를 참조한다.

## 2026-10-01 — 역할 설정·Husky 후속 반영

사용자 지적으로 임의 상속을 제거하고 Candanta의 24개 역할 모델·effort를 명시했다. Husky pre-commit/pre-push와 lint-staged·Knip·React Doctor를 연결했다. 신원 기준은 사용자 선택으로 Candanta와 동일하게 적용했다. 기존 em dash는 수정하고 임시 예외를 제거했다. 이름 있는 canonical 클래스 검사는 유지하되 이 앱의 픽셀값과 일반 토큰 이름을 사용했다. 출시 대기 정책의 예외 추가는 자동 승인 검토에서 거부됐으며, 사용자가 7일 정책을 충족한 버전 재조정을 선택했다. 실제 결과는 artifacts/work/2026-10-01-role-models-husky/summary.md에 기록한다.

## 2026-10-01 - 사용자 검토 후 원본 명세 복구

- 1~7 항목을 개별 검토받고 전체 승인 이후 일괄 적용. CLAUDE 진입 문서는 일괄 적용 지시 이전 승인으로 먼저 반영.
- 축약된 공용 역할·스킬 원본을 도구별 전체 템플릿으로 교체. 역할 24개, 스킬 6종의 양쪽 부속 파일 포함 총 56개 생성. 목차·끝 공백만 정리하고 모델·effort·tools·책임·절차·금지사항·산출물 계약 보존.
- src 구조·kebab-case·1px spacing 전환. 이전 화면의 픽셀값 유지를 위해 숫자 spacing 클래스 175개 환산.
- 공용 룰·인계 계약 복구, 앱 전용 framer-design·verification 룰 제거. 디자인 보존·한글 제목·사용자 검토 원칙은 AGENTS.md에 유지.
- Node 테스트를 Vitest 5.0.1·TypeScript로 전환하고 Biome 경로·호출 검출 확대. 런타임 훅의 통과·차단 입력 검증 추가.
- Candanta 도구별 런타임 훅 복구. 동기화 안내는 공용 생성 원본·결과 검사로 연결. 검사기 테스트 경로의 대시 제외는 추가 승인 후 반영.
- README에서 세션 이력을 분리. Tailwind src 탐색, CLAUDE 이력 포인터·인계 다이어그램, ES 모듈 설정은 추가 검토 승인 후 수정.
- semver major 7 강제 override 제거. 사용자가 웹 조사 후 결정을 위임한 충돌에 대해 semver@6.3.1만 trustPolicyExclude로 지정. 7일 정책과 다른 버전·패키지의 신뢰 검사 유지.

결과와 한계는 `artifacts/work/2026-10-01-harness-restore/summary.md` 및 `verification.md` 참조.

경로 별칭 플러그인의 누락을 최종 원본 비교에서 발견해 추가 승인 후 복구했다. 설치 검증에서 TypeScript 7 peer 충돌이 확인되어 별도 승인 후 Vite 내장 `resolve.tsconfigPaths`로 전환했다. 별칭으로 실제 Button 모듈을 import·호출하는 검증을 유지한다.

## 2026-10-01 - 여러 줄 주석 줄바꿈 기준 강제

- SemBr·Google 스타일 가이드 조사 후 "한 줄 한 문장, 문장 중간 줄바꿈 금지, 길이 상한 없음, 블록 주석 `*` 정렬" 기준을 `docs/agent-rules/project-structure.md`에 추가.
- 공용 검사기 `scripts/check-comment-line-breaks.mjs`를 Claude·Codex PreToolUse(Edit|Write) 훅과 lint-staged에 연결. 훅은 편집 범위만 검사해 기존 위반이 무관한 편집을 막지 않음.
- `__tests__/lint/runtime-hooks.test.ts`에 통과·차단 입력 검증 추가. 존재하지 않던 `comment-style.test.ts` 참조를 실제 검사 위치로 정정.
- 사용자 요청으로 검사 범위를 하네스 스크립트(`scripts/`, `.claude/hooks/`, `.codex/hooks/`)와 셸 `#` 주석까지 확대. 기존 훅·스크립트 주석은 문구 유지, 줄바꿈만 한 줄 한 문장으로 일괄 정리.
- 사용자 요청으로 주석 종결어미 규칙을 같은 검사기에 추가해 하네스 스크립트까지 확대. 기존 훅·스크립트 주석의 `~다` 종결을 명사형으로 정리하고, 문장이 중간에 끊겨 있던 `enforce-commit-msg-style.sh`의 "- 커밋 메시지" 조각 제거.

## 2026-10-01 - pre-push에서 빌드·E2E 제외

- 로컬 훅은 빠른 검사만 두고 무거운 검사는 CI에서 최종 판정하는 일반 권장에 맞춰 `.husky/pre-push`에서 `pnpm build`·`pnpm test:e2e` 제거.
- CI가 모든 push에서 같은 빌드·E2E를 이미 실행해 로컬 실행은 중복이었음. 전체 로컬 확인이 필요하면 `pnpm verify` 사용.

## 2026-10-01 - best practice 질문 안내 훅 추가

- 사용자가 best practice를 물을 때 권장안 하나만 첫 문장에 답하도록 Claude·Codex UserPromptSubmit 훅(`require-single-best-practice.sh`) 추가.
- 질문 여부와 준수 여부는 셸 패턴으로 판정할 수 없어 차단형 Stop 훅은 제외. 키워드로 1차 필터 후 조건부 지시만 주입하고 질문 판단은 응답 모델에 위임.

## 2026-10-01 - 가능 여부 질문 안내 훅 추가

- 사용자가 가능 여부를 물을 때 첫 문장에 가능/불가능을 명시하도록 Claude·Codex UserPromptSubmit 훅(`require-feasibility-verdict.sh`) 추가.
- best practice 훅과 같은 이유로 차단형 Stop 훅은 제외하고 키워드 1차 필터 + 조건부 지시만 주입.

## 2026-10-02 - git-commit 명령 작성법 명시

- 결과 규칙(bullet 구분·한 항목 한 줄)만 있고 `-m` 사용법이 없어 bullet마다 `-m`을 따로 준 커밋 5개에 빈 줄이 생긴 문제로 `git-commit` 스킬에 "명령 작성법" 추가. 메시지 전체를 `-m` 하나의 heredoc으로 쓰는 올바른 예·틀린 예 포함.
- 훅만 강제하던 bullet 사이 빈 줄 금지를 명세에도 명시해 명세·훅 불일치 해소.
- 커밋 명령을 다른 heredoc과 같은 Bash 호출에 섞지 않는 수칙 추가. 훅이 앞선 `cat >> file <<'EOF'`를 커밋 메시지로 오인해 차단한 사례 2건 대응이며, 근본 수정은 훅의 heredoc 추출 범위 한정으로 별도 반영.
- Codex 템플릿의 `.Codex/` 경로를 실제 추적 경로 `.codex/hooks/`, `docs/agent-rules/git-safety.md`로 정정.
- 스킬 설명·제목·scope 목록에 남아 있던 candanta 저장소 내용을 이 저장소 기준(`portfolio`, `ci`, `deps`)으로 정리.

## 2026-10-02 - 보고 전용 요청의 편집 확인 훅 추가

- "판단하여 보고해" 요청을 실행 지시로 잘못 읽고 훅 파일을 수정한 사례로 Claude·Codex 훅(`confirm-edit-on-report-request.sh`) 추가. UserPromptSubmit에서 판단·검토·보고 요청이면서 실행 지시가 없는 턴을 session_id별 상태로 남기고, 같은 턴의 Edit/Write/NotebookEdit는 사용자 확인(ask)을 거치게 함.
- 키워드 판정의 오탐·미탐을 고려해 차단 대신 확인을 쓰고, artifacts·메모리·임시 파일 작성은 보고 작업의 일부라 제외.
- Bash(sed, python, git 등)로 하는 수정은 명령 형태가 다양해 대상에서 제외하고 메모리 규칙으로만 보완. 권한 분류기 거부 시점에는 실행되는 훅 이벤트가 없어 "다른 작업은 계속하라" 안내의 오해도 메모리로만 보완.

## 2026-10-12 - Codex 경로 정정과 Claude 규칙 자동 로드 복원

- Codex 템플릿에 남아 있던 `.Codex/` 경로(`.Codex/rules/`, `.Codex/agents/*.md`, `.Codex/skills/`, `.Codex/worktrees/`)를 실제 경로 `docs/agent-rules/`, `.codex/agents/*.toml`, `.agents/skills/`, `.codex/worktrees/`로 정정. `.Codex/settings.json`(`worktree.baseRef`)은 Codex에 대응 설정이 없어 커밋 후 push 경로로 안내.
- 규칙을 `docs/agent-rules/`로 옮긴 뒤 Claude는 `@README.md` 색인만 자동 로드하고 본문은 직접 열어야 읽던 문제로 `.claude/rules/`에 심볼릭 링크 추가. `nextjs`·`react-query`·`tailwind`는 `paths:`로 해당 경로 파일을 다룰 때만 로드.

## 2026-10-12 - 한국어 응답 훅 오탐 수정

- `require-korean-response.sh`가 한국어 문장 속 영문 식별자(kebab-case, camelCase, 한글 조사가 붙은 이름)를 비율 계산에서 빼고 영문 글자 기준을 40자에서 20자로 낮춤. Skill·파일 이름이 많은 짧은 한국어 문장을 영어로 오판해 턴을 막고, 짧은 영어 문장은 놓치던 문제.

## 2026-10-12 - Skill 템플릿 필수 절 보완과 명세 검사 추가

- Skill 4개(task·bug orchestrator, git-commit, cross-agent-handoff)에 harness-lab 템플릿 필수 절(실행 모드, 하이브리드 전환, 역할·사용 조건·입력·절차·출력·품질 기준, 테스트 프롬프트)을 보완하고 목차 갱신.
- `__tests__/lint/harness-spec.test.ts`로 Agent·Skill 필수 절을 검사해 템플릿 절 누락 재발 방지. 외부 가이드 Skill(harness-lab, scaffold-web-project)은 제외.

## 2026-10-12 - AskUserQuestion 직접 입력 답변 뒤 재질문 차단

- `block-reask-after-free-text-answer.sh`(Claude PreToolUse `AskUserQuestion`) 추가. 마지막 사용자 메시지 이후 AskUserQuestion 답변에 선택지 밖 직접 입력이 있으면 같은 응답의 재질문을 deny. 직접 입력한 질문에 텍스트로 답한 직후 질문 창이 답변을 가려 사용자가 답을 못 본 사례 두 번.
