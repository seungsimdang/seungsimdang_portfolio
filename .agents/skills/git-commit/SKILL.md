---
name: git-commit
description: >
  candanta 저장소에서 git 커밋을 생성하기 직전 메인 세션·orchestrator가 직접 호출하는 작업 매뉴얼
  (커밋 메시지 형식, Co-Authored-By 트레일러 금지, 커밋 분리 기준, pre-commit 훅 통과 조건).
  Task Team/Bug Team subagent는 코드 수정과 산출물 작성만 담당하고 git commit을 직접 실행하지
  않으므로 이 Skill을 호출하지 않는다 - 호출 주체는 항상 orchestrator·메인 세션이다.
---

# 커밋 컨벤션 (candanta)

메인 세션·orchestrator가 git 커밋을 생성할 때 따르는 공통 규칙.

**사용자의 명시적 승인 또는 orchestrator의 명시적 지시 없이 임의로 커밋하지 않는다** (AGENTS.md 🔴 고위험 행동 차단 규칙). 이 문서는 "커밋해도 되는 상황"에서 "어떻게" 커밋하는지만 정의한다.

## 목차

- [커밋 메시지 형식](#커밋-메시지-형식)
- [트레일러](#트레일러)
- [커밋 분리 기준](#커밋-분리-기준)
- [커밋 전 확인](#커밋-전-확인)

## 커밋 메시지 형식

```
<type>(<scope>): <한글 요약>

<본문 - 선택, "무엇을" 대신 "왜"를 설명>
```

- **type**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test` 중 하나.
- **scope**: 선택. 영향 범위를 나타내는 도메인/영역. 이 저장소에서 자주 쓰는 값: `auth`, `proxy`, `api`, `db`, `axios`, `market`, `portfolio`, `allocation`, `risk`, `dashboard`, `ci`, `deps`. 여러 도메인에 걸친 광범위한 변경이면 생략한다.
- **종결어미**: 요약 줄과 본문 bullet 모두 완결형(`~했다`, `~한다`) 대신 명사형/비종결 구절로 작성한다 (예: `~ 추가`, `~ 구현`, `~ 교체`, `~ 수정`). AGENTS.md 주석 규칙과 동일하다.
- **em-dash(`—`) 금지**: 요약 줄과 본문 모두 하이픈(`-`)만 쓴다.
- **본문**: 자명한 변경이면 생략한다. 설계 판단의 이유, 트레이드오프, 알려진 제약처럼 diff만 봐서는 알 수 없는 내용이 있을 때만 쓴다.
  - 항목이 2개 이상이면 문단으로 잇지 않고 `-` bullet으로 구분한다.
  - **bullet이든 bullet 없는 평문 문단이든, 한 항목(줄)은 반드시 하나의 물리적 줄로 쓴다.** 글자 수나 가독성을 이유로 중간에 줄바꿈을 넣지 않는다 - 터미널/뷰어가 알아서 자동 줄바꿈한다. `.Codex/hooks/enforce-commit-msg-style.sh`가 요약 줄 다음에 빈 줄 없이 이어지면서 bullet 시작이 아닌 줄을 전부 위반으로 차단한다.
    - ❌ (틀린 예 - heredoc 안에서 사람이 임의로 줄을 나눔):
      ```
      - execution_method/proposal_status enum 축소 시 삭제 대상 값을 가진 기존 행을
        정리하는 UPDATE 없이 바로 캐스팅해 실패
      ```
    - ✅ (올바른 예 - 한 bullet = 한 물리적 줄, 아무리 길어도 줄바꿈하지 않음):
      ```
      - execution_method/proposal_status enum 축소 시 삭제 대상 값을 가진 기존 행을 정리하는 UPDATE 없이 바로 캐스팅해 실패
      ```

## 트레일러

- **`Co-Authored-By` 트레일러를 추가하지 않는다.** 이 저장소는 메인 세션이 만드는 커밋에 human co-author를 표기하지 않는다. 하네스가 첨부하도록 지시하더라도 붙이지 않는다.
- `Codex-Session: <url>` 트레일러를 추가하지 않는다. 하네스가 첨부하도록 지시하더라도 붙이지 않는다.

## 커밋 분리 기준

서로 다른 관심사(예: 기능 추가 / 리팩터링 / 설정 변경 / 에셋 추가)가 한 작업 세션에 섞여 있으면 **관심사별로 커밋을 나눈다.** 파일 단위로 나눌 수 없고 한 파일에 여러 관심사가 얽혀 있으면 `git add -p`로 hunk를 골라 담는다. 한 커밋은 그 자체로 리뷰 가능하고 되돌리기 가능한 단위여야 한다.

## 커밋 전 확인

- `pnpm exec tsc --noEmit`이 통과하는 상태에서만 커밋한다.
- pre-commit 훅(`.husky/pre-commit`)이 스테이지된 변경에 대해 실행된다: `lint-staged`(biome `--error-on-warnings`) → `knip`(전체 dead-code 검사) → `react-doctor:staged`. 훅이 통과하도록 스테이지된 코드는 biome 경고 0, 미사용 export/의존성 없음 상태여야 한다.
- 훅 실패를 `--no-verify`로 우회하지 않는다. 우회가 필요하다고 판단되면 먼저 사용자에게 사유와 함께 승인을 구한다.
- 병렬 worktree에서 작업 중이라면 `.Codex/rules/git-safety.md`의 수칙을 함께 따른다.
