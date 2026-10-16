#!/bin/sh
# PreToolUse(Agent) 훅: 스폰 지시문에 `필요 도구:` 선언이 없거나, 선언한 도구가 대상 에이전트 정의의 tools에 없으면 차단
# 사용법: 지시문에 `필요 도구: Read, Edit, Bash` 한 줄을 넣음, 도구가 필요 없으면 `필요 도구: 없음`
# 지시문 자연어에서 필요 도구를 추정하면 오탐·누락이 생겨, 작성자가 선언하고 훅은 정의 파일과 대조만 함
# 선언에서 필요한 도구를 빠뜨린 경우는 잡지 못함

input=$(cat)

printf '%s' "$input" | AGENTS_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/agents" python3 -c '
import json, os, re, sys

try:
    data = json.load(sys.stdin)
except Exception:
    # 입력을 해석할 수 없으면 판정 근거가 없어 통과
    sys.exit(0)

tool_input = data.get("tool_input") or {}
agent = tool_input.get("subagent_type") or "general-purpose"
prompt = tool_input.get("prompt") or ""

# fork 스폰은 block-fork-spawn.sh가 따로 차단함
if agent == "fork":
    sys.exit(0)

declaration = re.search(r"^\W*필요 도구\s*:\s*(.+)$", prompt, re.M)
if not declaration:
    sys.stderr.write(
        "차단: 스폰 지시문에 `필요 도구:` 선언이 없습니다.\n"
        "지시에 필요한 도구를 에이전트 목록의 Tools와 대조한 뒤 한 줄로 선언하세요.\n"
        "예: 필요 도구: Read, Edit, Bash (도구가 필요 없으면 `필요 도구: 없음`)\n"
    )
    sys.exit(2)

declared = [name for name in re.split(r"[\s,]+", declaration.group(1)) if name]
if declared == ["없음"]:
    sys.exit(0)

# 에이전트 이름이 경로 조작에 쓰이지 않도록 파일명 문자만 허용
if not re.fullmatch(r"[\w.-]+", agent):
    sys.exit(0)

try:
    definition = open(os.path.join(os.environ["AGENTS_DIR"], agent + ".md"), encoding="utf-8").read()
except OSError:
    # 정의 파일이 없는 내장 타입(general-purpose 등)은 대조 기준이 없어 선언 유무만 확인함
    sys.exit(0)

frontmatter = re.match(r"---\n(.*?)\n---", definition, re.S)
tools = re.search(r"^tools:\s*(.*)$", frontmatter.group(1), re.M) if frontmatter else None
if not tools:
    # tools를 생략한 정의는 모든 도구를 상속함
    sys.exit(0)

allowed = [name.strip() for name in tools.group(1).split(",") if name.strip()]
missing = [name for name in declared if name not in allowed]
if missing:
    sys.stderr.write(
        "차단: " + agent + " 에이전트에 없는 도구를 선언했습니다: " + ", ".join(missing) + "\n"
        + agent + " tools: " + ", ".join(allowed) + "\n"
        "이 도구가 있는 에이전트로 스폰하거나, 사용자에게 보고하고 대안을 정하세요.\n"
    )
    sys.exit(2)
'
