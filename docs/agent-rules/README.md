# 공용 에이전트 규칙

Claude와 Codex는 코드·문서·Git 작업 전에 이 폴더에서 현재 작업과 관련된 규칙을 읽는다. 이 문서는 공용 규칙의 단일 원본이며, 도구별 권한·Hook·Agent 설정은 `.claude/`, `.codex/`에 둔다.

- Claude: `.claude/rules/`의 심볼릭 링크로 자동 로드된다. `paths:`가 있는 규칙(`nextjs.md`, `tailwind.md`)은 해당 경로 파일을 다룰 때, 나머지는 세션 시작 시 로드된다.
- Codex: 아래 표의 읽는 시점에 맞춰 직접 읽는다.
- 새 규칙 파일을 추가하면 `.claude/rules/`에 심볼릭 링크도 만든다: `ln -s ../../docs/agent-rules/{name}.md .claude/rules/`

| 규칙 | 읽는 시점 |
| --- | --- |
| `nextjs.md` | Next.js 코드 또는 설정을 수정하기 전. 최신 API는 `node_modules/next/dist/docs/`도 함께 확인한다. |
| `project-structure.md` | 파일 배치, import, 네이밍, 주석 규칙을 판단할 때 |
| `tailwind.md` | 스타일, 디자인 토큰, 반응형 UI를 수정할 때 |
| `enforcement-placement.md` | 검사 로직을 Hook, 테스트, 린트 중 어디에 둘지 판단할 때 |
| `branch-strategy.md` | 브랜치, worktree, 병합 작업 전 |
| `git-safety.md` | Git 명령, 병렬 Agent, worktree 작업 전 |
