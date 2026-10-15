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

## 공통 작업 제약

Claude와 Codex 모두 모든 작업에 적용한다.

- 기존 Framer 디자인·브레이크포인트·애니메이션과 README 참조 정보 보존. 파일 이동과 1px spacing 전환 시 기존 화면의 픽셀값 유지.
- 변경·추가·제외·삭제 제안은 대상·전후·이유·영향을 설명하고 사용자 질문 도구(Claude `AskUserQuestion`, Codex 사용자 질문)로 검토받은 뒤 승인 범위만 적용. 질문·설명 요청을 승인으로 해석하지 않음.
- 승인 전에는 제안으로 표현하고 확정된 작업처럼 보고하지 않음. 사용자가 일괄 적용 시점을 지정하면 해당 순서 준수.
- 담당 파일만 수정하고 타인의 변경을 되돌리지 않음. 사용자 지시와 실제 제공된 도구를 우선하고, 실행하지 못한 원본 프로토콜은 미검증으로 보고.
- 하네스 생성 원본은 `docs/agent-harness/templates/`. `manifest.json`의 도구별 경로 매핑에 따라 `pnpm harness:sync`로 생성하고 `pnpm harness:check`로 확인. 생성 결과를 독립 편집하지 않음.
- 테스트 제목의 설명은 한글. 경로 템플릿 허용, 영문 태그는 별도 metadata 사용. Biome 플러그인으로 검사.
