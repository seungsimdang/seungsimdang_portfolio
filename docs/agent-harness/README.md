# 에이전트 하네스

## 시작점과 명세

Codex는 `AGENTS.md`, Claude는 `CLAUDE.md`에서 시작한다. Candanta의 도구별 역할 12개와 스킬 6종의 절차·설정·책임·금지사항·산출물 계약을 보존하며 목차와 서식을 정리했다. Claude와 Codex 본문을 하나로 축약하지 않는다.

## 생성 구조

`docs/agent-harness/templates/` 아래에 `.claude/`, `.codex/`, `.agents/`의 전체 도구별 파일을 보관한다. `manifest.json`의 `files`가 원본과 출력 경로를 연결한다. 역할 메타데이터는 모델·effort·Claude tools 검사 기준이다. Claude effort가 원본에 없는 역할에는 필드를 추가하지 않는다.

```bash
pnpm harness:sync
pnpm harness:check
pnpm harness:test
```

관리 대상은 역할 24개와 스킬·부속 파일 32개, 총 56개 파일이다. 생성 원본과 출력은 바이트 단위로 일치해야 한다. Candanta 원본과는 목차·서식이 다르며, 도구별 실행 절차는 유지한다. 생성 결과를 독립 편집하지 않는다.

## 역할 설정

| 역할 | Codex 모델 | Codex effort | Claude 모델 | Claude effort | Claude tools |
| --- | --- | --- | --- | --- | --- |
| backend-developer | gpt-6-luna | high | sonnet | medium | Read, Write, Edit, Glob, Grep, Bash |
| bug-fixer | gpt-6-luna | high | sonnet | medium | Read, Write, Edit, Glob, Grep, Bash |
| bug-localizer | gpt-6-luna | xhigh | sonnet | medium | Read, Grep, Glob, Write |
| bug-reporter | gpt-6-luna | medium | haiku | 원본 필드 없음 | Read, Write, Glob, Grep |
| code-reviewer | gpt-6-luna | high | sonnet | medium | Read, Glob, Grep, Write, Bash |
| designer | gpt-6-luna | high | sonnet | medium | Read, Write, Glob |
| devops-engineer | gpt-6-luna | high | haiku | 원본 필드 없음 | Read, Write, Edit, Glob, Grep, Bash |
| frontend-developer | gpt-6-luna | high | sonnet | medium | Read, Write, Edit, Glob, Grep, Bash |
| postmortem-agent | gpt-6-luna | medium | haiku | 원본 필드 없음 | Read, Write, Glob |
| project-manager | gpt-6-luna | high | sonnet | medium | Read, Write, Glob, WebSearch |
| qa-engineer | gpt-6-luna | high | sonnet | medium | Read, Write, Glob, Grep, Bash |
| security-reviewer | gpt-6-luna | xhigh | sonnet | medium | Read, Glob, Grep, Write |

## 스킬

양쪽 도구에서 task-team-orchestrator, bug-team-orchestrator, git-commit, cross-agent-handoff, harness-lab, scaffold-web-project를 관리한다. 스킬의 references 및 agents/openai.yaml도 생성 대상이다.

## 훅과 검사 배치

검사 배치 기준은 `docs/agent-rules/enforcement-placement.md`를 따른다. `pnpm install`의 prepare로 Husky를 설치한다.

- pre-commit: 작성자 → lint-staged → staged 하네스 동기화 → Knip → React Doctor → Vitest 하네스 검사.
- pre-push: 타입 → Biome → 하네스 동기화 → Vitest 하네스 검사. 빌드·Playwright E2E는 CI(`.github/workflows/ci.yml`)가 모든 push에서 실행하므로 로컬 훅에서 제외한다.
- Claude·Codex 런타임 훅은 각 도구의 원본 등록 구조를 유지한다. 동기화 안내는 이 저장소의 생성 원본·결과 검사에 연결한다. 안내 훅은 실행을 차단하지 않는다. `require-single-best-practice.sh`는 best practice 질문에 권장안 하나만 답하라는 조건부 지시를 주입한다.

lint-staged는 `src/`·`tests/e2e/`의 staged 소스에서 대시와 임시 산출물 참조를 검사한다. 검사기의 검색 패턴과 검사기 테스트의 의도적인 위반 예시는 앱 소스 위반으로 취급하지 않는다. `__tests__/lint/`는 실제 검사 명령의 통과·차단과 전체 앱 소스 불변식을 확인한다.

런타임 훅은 사용자 승인·판단·발언 전체를 보장하지 않는다. 훅 등록과 입력 기반 검증은 실제 Claude·Codex 런타임 실행 검증과 구분한다. Codex의 훅 신뢰 절차를 우회하지 않는다.

## 인계와 변경 이력

실제 모델·세션 전환에는 `docs/agent-contracts/handoff.md`와 `artifacts/work/README.md`를 따른다. 도구별 상세 산출물 경로는 원본 역할·스킬을 따른다. 기존 기록은 보존한다. 공용 인계 흐름은 `claude-codex-shared-harness.md`, 변경 이력은 `CHANGELOG.md`를 참조한다.

## 의존성 정책

출시 대기는 7일이며 no-downgrade를 유지한다. Babel이 요구하는 semver major 6 범위를 복원했고 `semver@6.3.1`에만 신뢰 검사 예외를 둔다. 다른 major의 provenance와 배포 날짜를 비교하는 충돌(pnpm/pnpm#10202)에 대한 선택이며, 해당 버전의 provenance 하락 보호는 제외된다. 예외를 임의로 확대하지 않는다. 상세 근거와 검증은 이번 작업 기록을 참조한다.

Vitest의 경로 별칭 해석은 Vite 내장 `resolve.tsconfigPaths: true`를 사용한다. Candanta 플러그인을 복구·검증한 뒤 TypeScript 7 peer 충돌을 발견해 사용자 승인으로 전환했다. 실제 앱 모듈을 `@/`로 import·호출하는 테스트로 확인한다.
