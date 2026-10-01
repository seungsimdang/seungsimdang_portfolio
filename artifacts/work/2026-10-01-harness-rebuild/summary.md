# Candanta 참고 하네스 재구축

이 문서는 최초 재구축 당시 기록이다. 이후 사용자 요청으로 모델·effort 명시와 Husky 활성화, 코드 규칙 수정이 진행됐다. 최신 상태는 ../2026-10-01-role-models-husky/summary.md를 따른다.

- 작성: 2026-10-01, Codex 단일 실행
- 요청: Candanta 레퍼런스 프로젝트를 참고해 하네스를 다시 구축
- 기준 커밋: `7cf1ffb`
- 상태: 구성과 로컬 검증 완료, 커밋·푸시·원격 CI는 미수행

## 확인한 레퍼런스와 적용

Candanta의 AGENTS.md, CLAUDE.md, docs/agent-harness/claude-codex-shared-harness.md, docs/agent-contracts/handoff.md, docs/agent-rules/enforcement-placement.md, 기능·버그 조율 스킬, frontend-developer·qa-engineer 역할과 scripts/check-agent-harness-sync.sh를 읽었다. 작업 단계·역할·산출물·실제 전환 시 인계 구조를 적용했다.

레퍼런스의 일부 스킬에는 `.Codex/` 경로, src/·Vitest·전용 스타일 토큰과 런타임 팀 API가 포함되어 있었다. 이 저장소의 실제 경로·Next.js·Tailwind·Playwright 명령으로 조정했다. 레퍼런스 프로젝트의 코드나 설정은 수정하지 않았다.

## 구성 결과

- AGENTS.md·CLAUDE.md의 기능·버그·부분 재실행·인계·커밋 라우팅.
- docs/agent-rules/의 구조·검증·Git·Next.js·Tailwind·Framer·검사 배치 규칙.
- docs/agent-harness/manifest.json, roles/의 12개 역할과 skills/의 4개 업무 절차를 공용 원본으로 사용.
- scripts/sync-agent-harness.mjs가 Codex 역할 12개·Claude 역할 12개·양쪽 스킬 8개를 생성하고 정확한 내용 일치를 검사.
- 기능·버그·일반 작업의 work-id별 산출물 계약, 실제 모델·세션 전환용 STATUS.md·HANDOFF.md 계약.
- CI·pnpm verify에 harness:check·harness:test 연결, 선택 .githooks/pre-commit 제공. 훅은 현재 index의 snapshot을 검사하며 로컬 Git 설정에 자동 설치하지 않았다.
- README와 하네스 변경 이력 갱신.

모델·추론 강도·권한·MCP를 고정하지 않았다. Codex 역할 형식은 [공식 custom agent 문서](https://learn.chatgpt.com/docs/agent-configuration/subagents)의 name·description·developer_instructions 필드를 확인했다. Claude 형식은 [공식 subagent 문서](https://code.claude.com/docs/en/sub-agents)를 참고했다. 단일 실행이 기본이며 명시적으로 요청된 협업만 실제 도구로 실행한다.

양쪽 staging을 강제하는 레퍼런스 검사 대신, 같은 공용 원본에서 생성하고 내용을 정확히 비교한다. 도구별 표현은 다르지만 공용 지시 본문은 동일하다. 이전 기록을 삭제하거나 일반 작업에 인계 파일을 강제하지 않는다.

## 실제 검증

| 검사 | 결과 |
| --- | --- |
| `pnpm harness:check` | 32개 파일, 차이 0개 |
| `pnpm harness:test` | 임시 저장소의 회귀 테스트 1개 통과. 정상·생성 내용 변경·파일 누락·원본 변경·복구·정상 작업 트리와 불일치하는 staged snapshot·index 복구 확인 |
| Codex 역할 TOML | Python tomllib로 12개 파싱, 필수 문자열·파일명 일치 확인 |
| Claude 역할 YAML | PyYAML로 12개 frontmatter 파싱, 이름과 inherit 확인 |
| skill-creator quick_validate.py | 양쪽 4개씩 총 8개 스킬 통과 |
| CI YAML | 파싱 및 harness:check step 확인 |
| `sh -n .githooks/pre-commit` | 통과 |
| `pnpm verify` | 하네스·회귀·Biome 26개 파일·타입·프로덕션 빌드·E2E 모두 통과 |
| Playwright | 데스크톱·모바일 Chromium 16개 통과 |
| 보존 검사 | app/·components/·public/·.mcp.json·기존 Claude 로컬 설정에 diff 없음. README Framer 연동 섹션은 HEAD와 동일 |
| 문서·Git | 공용 규칙의 상대 링크 존재 확인, git diff --check 통과 |

최초 생성은 보호된 `.codex/agents` 쓰기 제한으로 실패했고 허용 환경에서 같은 명령으로 생성했다. 스킬 검증기는 PyYAML 미설치로 실패해 프로젝트 의존성을 바꾸지 않고 `/tmp`의 별도 venv에 설치한 뒤 재실행했다. 훅과 회귀 검사는 임시 저장소만 staging했으며 실제 저장소의 index는 변경하지 않았다. 검사나 훅을 우회하지 않았다.

## 미검증과 후속 작업

실제 새 Codex·Claude 세션의 역할/스킬 자동 발견, 팀 실행 및 인계 소비 동작은 실행하지 않았다. 파일 생성·구문·내용 일치 검사는 이를 증명하지 않는다. 선택 Git 훅은 임시 저장소에서 실행했지만 이 저장소에는 활성화하지 않았다. 기존 Framer 원본과 스크린샷 비교, GitHub Actions 원격 실행도 미수행이다.

기존 `.agents/skills/scaffold-web-project/` 사용자 자료는 생성 관리 대상에서 제외하고 그대로 보존했다. 이번 변경은 아직 커밋하지 않았다.

다음 세션은 AGENTS.md → README.md → docs/agent-rules/README.md → docs/agent-harness/README.md → 이 기록을 읽고 해당 작업의 역할·스킬을 선택한다.
