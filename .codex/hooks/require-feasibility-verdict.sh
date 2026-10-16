#!/bin/sh
# UserPromptSubmit·Stop 훅: 가능 여부 질문에는 응답 첫 문장에 가능/불가능 판정을 먼저 쓰게 함
# UserPromptSubmit(안내): 가능 여부 키워드가 있으면 조건부 리마인더를 출력하고, 의문형까지 갖춘 질문이면 세션별 표시 파일을 남김
# Stop(차단): 표시 파일이 있는 세션의 마지막 응답 첫 문장에 판정이 없으면 턴 종료를 막고 다시 답하게 함
# 리마인더만으로는 판정이 둘째 문장으로 밀려도 막지 못해 Stop 검사를 추가함
# Codex 문서상 transcript 형식이 안정 인터페이스가 아니라서 transcript 대신 UserPromptSubmit의 prompt로 질문을 판정함
# 질문 판정은 키워드와 의문형 어미 패턴 기반이라 패턴 밖 표현은 놓칠 수 있음
# Claude와 Codex가 같은 본문을 씀

input=$(cat)

printf '%s' "$input" | MARK_DIR="${TMPDIR:-/tmp}/feasibility-verdict" python3 -c '
import json, os, re, sys

try:
    data = json.load(sys.stdin)
except Exception:
    # 입력을 해석할 수 없으면 판정 근거가 없어 통과
    sys.exit(0)

session = re.sub(r"[^\w.-]", "_", str(data.get("session_id") or "default"))
mark = os.path.join(os.environ["MARK_DIR"], session)

def clear_mark():
    try:
        os.remove(mark)
    except OSError:
        # 표시가 없으면 지울 것도 없음
        pass

if data.get("hook_event_name") != "Stop":
    prompt = data.get("prompt") or ""
    keyword = re.search(r"가능|할 수 있|될 수 있|될까|되나|되냐|possible|feasible", prompt, re.I)
    # 키워드만 있는 작업 지시("가능하다로 대답해")는 질문이 아니므로 의문형까지 있어야 표시함
    question = re.search(
        r"\?|가능(한지|할까|해|합니까|한가|하냐|하니|함)|(할|될) 수 있(는지|어|나|을까|니|냐|습니까)|될까|되나|되냐|되는지",
        prompt,
    )
    if keyword:
        print("가능 여부 키워드 감지: 사용자가 가능한지 묻는 질문이면 첫 문장에 '가능합니다'/'불가능합니다'(일부만 가능하면 가능한 부분과 불가능한 부분을 각각 명시)를 먼저 답할 것. '어렵습니다'·'제한적입니다' 같은 얼버무림이나 비교표로 시작 금지. 키워드를 언급만 한 메시지(작업 지시 등)면 해당 없음.")
    if keyword and question:
        os.makedirs(os.environ["MARK_DIR"], exist_ok=True)
        open(mark, "w").close()
    else:
        clear_mark()
    sys.exit(0)

if not os.path.exists(mark):
    sys.exit(0)

answer = (data.get("last_assistant_message") or "").strip()
# 이미 한 번 막힌 뒤의 재응답이면 무한 반복을 막으려고 통과
if data.get("stop_hook_active") or not answer:
    clear_mark()
    sys.exit(0)

# 제목·강조·인용 기호를 걷어낸 뒤 첫 문장(마침표·물음표·느낌표 또는 줄바꿈까지)만 봄
body = re.sub(r"^[\s#*>-]+", "", answer)
first = re.split(r"(?<=[.!?])\s|\n", body, maxsplit=1)[0]

if not re.search(r"가능합니다|가능하다", first):
    problem = "첫 문장에 가능합니다/불가능합니다 판정이 없습니다."
elif re.search(r"일부|부분", first) and not ("불가능" in first and re.search(r"(?<!불)가능", first)):
    problem = "일부만 가능하다고 했는데 첫 문장에 가능한 부분과 불가능한 부분이 각각 드러나 있지 않습니다."
else:
    clear_mark()
    sys.exit(0)

print(json.dumps({
    "decision": "block",
    "reason": "사용자가 가능 여부를 물었습니다. " + problem
    + " 첫 문장을 가능합니다/불가능합니다 판정으로 시작해 다시 답하세요. 일부만 가능하면 가능한 부분과 불가능한 부분을 첫 문장 안에서 각각 밝히세요.",
}, ensure_ascii=False))
'

exit 0
