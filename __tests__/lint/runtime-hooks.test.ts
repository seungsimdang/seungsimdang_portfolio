import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

// pre-commit 안에서는 GIT_DIR 등이 설정돼 임시 저장소 대신 실제 저장소를 가리키므로 제거
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
) as NodeJS.ProcessEnv;

const run = (tool: string, hook: string, input: object, cwd = process.cwd()) =>
  spawnSync("sh", [resolve(tool, "hooks", `${hook}.sh`)], {
    cwd,
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...env, CLAUDE_PROJECT_DIR: cwd },
  });

for (const tool of [".claude", ".codex"]) {
  test(`${tool} 커밋 훅이 정상 메시지를 허용하고 금지 트레일러와 종결어미를 차단한다`, () => {
    expect(
      run(tool, "block-attribution-trailers", {
        tool_input: { command: 'git commit -m "fix: 탐색 수정"' },
      }).status,
    ).toBe(0);
    for (const trailer of ["Co-Authored-By", "Claude-Session"]) {
      expect(
        run(tool, "block-attribution-trailers", {
          tool_input: {
            command: `git commit -m "fix: 탐색 수정\n\n${trailer}: sample"`,
          },
        }).status,
      ).toBe(2);
    }
    expect(
      run(tool, "enforce-commit-msg-style", {
        tool_input: { command: 'git commit -m "fix: 탐색 수정"' },
      }).status,
    ).toBe(0);
    expect(
      run(tool, "enforce-commit-msg-style", {
        tool_input: { command: 'git commit -m "fix: 탐색을 수정했다"' },
      }).status,
    ).toBe(2);
    expect(
      run(tool, "enforce-commit-msg-style", {
        tool_input: {
          command:
            'git commit -m "fix: 탐색 수정" -m "- 캐시 정리\n- 경로 수정"',
        },
      }).status,
    ).toBe(0);
    expect(
      run(tool, "enforce-commit-msg-style", {
        tool_input: {
          command:
            'git commit -m "fix: 탐색 수정" -m "- 캐시 정리" -m "- 경로 수정"',
        },
      }).status,
    ).toBe(2);
    expect(
      run(tool, "enforce-commit-msg-style", {
        tool_input: {
          command: 'git commit -m "fix: 탐색 수정" -m "- 캐시를 정리했다"',
        },
      }).status,
    ).toBe(2);
    expect(
      run(tool, "enforce-commit-msg-style", {
        tool_input: {
          command:
            'git commit -m "fix: 탐색 수정" -m "- 캐시 정리\n- 경로를 수정했다"',
        },
      }).status,
    ).toBe(2);
    expect(
      run(tool, "enforce-commit-msg-style", {
        tool_input: {
          command:
            "cat >> notes.md <<'EOF'\n- 작업을 완료했다\nEOF\ngit commit -m \"docs: 메모 추가\"",
        },
      }).status,
    ).toBe(0);
    expect(
      run(tool, "enforce-commit-msg-style", {
        tool_input: {
          command:
            'cat > example.md <<\'EOF\'\ngit commit -m "a" -m "- b" -m "- c"\nEOF',
        },
      }).status,
    ).toBe(0);
  });
  test(`${tool} 소스 대시 훅이 앱 위반을 차단하고 정상 소스를 허용한다`, () => {
    expect(
      run(tool, "block-em-dash-in-source", {
        tool_name: "Write",
        tool_input: {
          file_path: "src/app/page.tsx",
          content: 'export const value = "정상";',
        },
      }).status,
    ).toBe(0);
    expect(
      run(tool, "block-em-dash-in-source", {
        tool_name: "Write",
        tool_input: {
          file_path: "src/app/page.tsx",
          content: 'export const value = "bad — text";',
        },
      }).status,
    ).toBe(2);
    expect(
      run(tool, "block-em-dash-in-source", {
        tool_name: "Write",
        tool_input: {
          file_path: "__tests__/lint/sample.test.ts",
          content: 'const sample = "bad — text";',
        },
      }).status,
    ).toBe(0);
  });
  test(`${tool} 보고 전용 요청 턴의 소스 편집만 사용자 확인을 요청한다`, () => {
    const session = `report-gate-${tool.slice(1)}-${process.pid}`;
    const prompt = (text: string) =>
      run(tool, "confirm-edit-on-report-request", {
        hook_event_name: "UserPromptSubmit",
        session_id: session,
        prompt: text,
      });
    const edit = (file_path: string) =>
      run(tool, "confirm-edit-on-report-request", {
        hook_event_name: "PreToolUse",
        session_id: session,
        tool_name: "Edit",
        tool_input: { file_path },
      }).stdout.includes('"ask"');
    prompt("명세 업데이트 및 훅 강제 필요한지 판단하여 보고해");
    expect(edit("/repo/.claude/hooks/sample.sh")).toBe(true);
    expect(edit("/repo/artifacts/task-team/report.md")).toBe(false);
    expect(edit("/Users/u/.claude/projects/p/memory/note.md")).toBe(false);
    prompt("검토 후 보고하고 문제 있으면 고쳐");
    expect(edit("/repo/src/app/page.tsx")).toBe(false);
    prompt("가능한 내용은 강제해");
    expect(edit("/repo/src/app/page.tsx")).toBe(false);
  });
  test(`${tool} 주석 줄바꿈 훅이 문장 중간 줄바꿈을 차단하고 한 줄 한 문장을 허용한다`, () => {
    const write = (content: string) =>
      run(tool, "block-comment-line-wrap", {
        tool_name: "Write",
        tool_input: { file_path: "src/app/page.tsx", content },
      }).status;
    expect(
      write("// 첫 문장 요약함\n// 두 번째 문장 설명함\nconst a = 1;"),
    ).toBe(0);
    expect(write("/**\n * 첫 문장 요약함\n * 두 번째 문장 설명함\n */")).toBe(
      0,
    );
    expect(write("// 캐시 키는\n// 세션과 경로로 구성함")).toBe(2);
    expect(write("// Keeps the cache\n// warm between requests.")).toBe(2);
    expect(write("// 수정함. 다음 단계 진행함")).toBe(2);
    expect(write("/*\n첫 줄 설명함\n*/")).toBe(2);
    const shell = (content: string) =>
      run(tool, "block-comment-line-wrap", {
        tool_name: "Write",
        tool_input: { file_path: ".claude/hooks/sample.sh", content },
      }).status;
    expect(shell("#!/bin/sh\n# 첫 문장 요약함\n# 두 번째 문장 설명함")).toBe(0);
    expect(shell("#!/bin/sh\n# 커밋 메시지를\n# 검사함")).toBe(2);
    expect(shell("#!/bin/sh\n# 커밋 메시지를 검사한다.")).toBe(2);
    expect(
      run(tool, "block-comment-line-wrap", {
        tool_name: "Write",
        tool_input: {
          file_path: "__tests__/lint/sample.test.ts",
          content: "// 캐시 키는\n// 세션과 경로로 구성함",
        },
      }).status,
    ).toBe(0);
  });
  test(`${tool} 런타임 안전 훅이 파괴적 명령을 차단한다`, () => {
    expect(
      run(tool, "git-safety-guard", {
        tool_input: { command: "git reset --hard" },
      }).status,
    ).toBe(2);
    expect(
      run(tool, "git-safety-guard", {
        tool_input: { command: 'pkill -f "next-server"' },
      }).status,
    ).toBe(2);
    expect(
      run(tool, "git-safety-guard", {
        tool_input: { command: "kill $(lsof -ti tcp:3100)" },
      }).status,
    ).toBe(0);
    for (const command of [
      "python3 - <<'EOF'\nnote = '프로세스 이름 기준 종료(pkill, killall) 금지'\nEOF",
      'git commit -m "docs: (pkill) 차단 문구 정리"',
      "echo 'x; killall node'",
    ]) {
      expect(
        run(tool, "git-safety-guard", { tool_input: { command } }).status,
      ).toBe(0);
    }
    expect(
      run(tool, "git-safety-guard", {
        tool_input: { command: "cat <<'EOF'\n본문\nEOF\nkillall node" },
      }).status,
    ).toBe(2);
  });
  test(`${tool} 새 브랜치 생성은 브랜치 수와 무관하고 살아 있는 worktree에만 차단된다`, () => {
    const repo = mkdtempSync(join(tmpdir(), "portfolio-branch-"));
    const git = (...args: string[]) =>
      spawnSync("git", args, { cwd: repo, env });
    const create = () =>
      run(
        tool,
        "git-safety-guard",
        { tool_input: { command: "git switch -c feature/next" } },
        repo,
      ).status;
    try {
      git("init", "-q");
      git(
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@t",
        "commit",
        "-q",
        "--allow-empty",
        "-m",
        "init",
      );
      for (const name of ["a", "b", "c", "d", "e"]) git("branch", name);
      expect(create()).toBe(0);
      git("worktree", "add", "-q", join(repo, "wt"), "a");
      expect(create()).toBe(2);
      rmSync(join(repo, "wt"), { recursive: true, force: true });
      expect(create()).toBe(0);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
  test(`${tool} best practice 안내 훅이 키워드에만 조건부 지시를 추가하고 차단하지 않는다`, () => {
    for (const prompt of [
      "pre-push에서 e2e 돌리는 게 Best Practice야?",
      "베스트 프랙티스가 뭐야",
    ]) {
      const result = run(tool, "require-single-best-practice", { prompt });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("권장안 하나");
    }
    const other = run(tool, "require-single-best-practice", {
      prompt: "pre-push 설정 보여줘",
    });
    expect(other.status).toBe(0);
    expect(other.stdout).toBe("");
  });
  test(`${tool} 가능 여부 안내 훅이 키워드에만 조건부 지시를 추가하고 차단하지 않는다`, () => {
    for (const prompt of ["훅으로 강제할 수 있어?", "이거 가능해?"]) {
      const result = run(tool, "require-feasibility-verdict", { prompt });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("가능합니다");
    }
    const other = run(tool, "require-feasibility-verdict", {
      prompt: "pre-push 설정 보여줘",
    });
    expect(other.status).toBe(0);
    expect(other.stdout).toBe("");
  });
  test(`${tool} 안내 훅이 subagent 보고와 붙여넣은 내용에는 반응하지 않는다`, () => {
    const quoted = [
      '<agent-message from="a1">\n  왜 best practice 표로 리스트업이 가능할까?\n</agent-message>',
      '<pasted_content id="p1">\n왜 best practice 표로 리스트업이 가능할까?\n</pasted_content id="p1">',
    ];
    for (const hook of [
      "require-why-explanation",
      "require-status-verification",
      "require-single-best-practice",
      "require-feasibility-verdict",
      "confirm-edit-on-report-request",
    ]) {
      for (const prompt of quoted) {
        const result = run(tool, hook, {
          hook_event_name: "UserPromptSubmit",
          session_id: "quoted",
          prompt,
        });
        expect(result.status).toBe(0);
        expect(result.stdout).toBe("");
      }
    }
    expect(
      run(tool, "require-why-explanation", {
        prompt: `${quoted[1]}\n\n-> 왜 이렇게 돼?`,
      }).stdout,
    ).toContain("판단 근거");
  });
  test(`${tool} 원인 설명 안내 훅이 실행을 차단하지 않는다`, () => {
    const result = run(tool, "require-why-explanation", {
      prompt: "왜 변경했어?",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("판단 근거");
  });
}

test("클로드 에이전트 실행 훅이 fork 스폰과 worktree 진입, 격리 없는 구현자 스폰을 차단한다", () => {
  const claude = (hook: string, input: object, cwd?: string) =>
    run(".claude", hook, input, cwd);
  expect(
    claude("block-fork-spawn", { tool_input: { subagent_type: "fork" } })
      .status,
  ).toBe(2);
  expect(
    claude("block-fork-spawn", { tool_input: { subagent_type: "qa-engineer" } })
      .status,
  ).toBe(0);
  expect(claude("orchestrator-no-worktree", {}).status).toBe(2);
  expect(
    claude("orchestrator-no-worktree", { agent_id: "implementation" }).status,
  ).toBe(0);
  const fixture = mkdtempSync(join(tmpdir(), "portfolio-hooks-"));
  try {
    spawnSync("git", ["init", "-q"], { cwd: fixture, env });
    writeFileSync(join(fixture, "dirty.txt"), "changed");
    expect(
      claude(
        "require-isolation-when-dirty",
        { tool_input: { subagent_type: "frontend-developer" } },
        fixture,
      ).status,
    ).toBe(2);
    expect(
      claude(
        "require-isolation-when-dirty",
        {
          tool_input: {
            subagent_type: "frontend-developer",
            isolation: "worktree",
          },
        },
        fixture,
      ).status,
    ).toBe(0);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("클로드 스폰 도구 선언 훅이 선언 누락과 정의에 없는 도구를 차단한다", () => {
  const fixture = mkdtempSync(join(tmpdir(), "portfolio-agent-tools-"));
  try {
    mkdirSync(join(fixture, ".claude", "agents"), { recursive: true });
    const definition = join(fixture, ".claude", "agents", "designer.md");
    const spawn = (subagent_type: string, prompt: string) =>
      run(
        ".claude",
        "require-agent-tool-declaration",
        { tool_input: { subagent_type, prompt } },
        fixture,
      );
    const webTask = "필요 도구: Read, WebSearch\n카드 디자인 근거를 조사하라";

    writeFileSync(definition, "---\nname: designer\ntools: Read, Write\n---\n");
    expect(spawn("designer", "카드 디자인 근거를 조사하라").status).toBe(2);
    const missing = spawn("designer", webTask);
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("WebSearch");
    expect(spawn("designer", "필요 도구: 없음\n요약만 하라").status).toBe(0);

    writeFileSync(
      definition,
      "---\nname: designer\ntools: Read, Write, WebSearch\n---\n",
    );
    const allowed = spawn("designer", webTask);
    expect(allowed.status).toBe(0);
    expect(JSON.parse(allowed.stdout).hookSpecificOutput).toEqual({
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: {
        subagent_type: "designer",
        prompt: "카드 디자인 근거를 조사하라",
      },
    });
    expect(spawn("general-purpose", webTask).status).toBe(0);
    expect(spawn("general-purpose", "선언 없이 조사하라").status).toBe(2);
    expect(spawn("fork", "선언 없이 조사하라").status).toBe(0);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

for (const tool of [".claude", ".codex"]) {
  test(`${tool} 가능 여부 훅이 Stop에서 첫 문장 판정이 없는 응답을 막는다`, () => {
    const marks = mkdtempSync(join(tmpdir(), "portfolio-feasibility-"));
    try {
      const hook = (input: object) =>
        spawnSync(
          "sh",
          [resolve(tool, "hooks", "require-feasibility-verdict.sh")],
          {
            input: JSON.stringify({ session_id: "s1", ...input }),
            encoding: "utf8",
            env: { ...env, TMPDIR: marks },
          },
        );
      const answer = (prompt: string, message: string, active = false) => {
        hook({ hook_event_name: "UserPromptSubmit", prompt });
        return hook({
          hook_event_name: "Stop",
          last_assistant_message: message,
          stop_hook_active: active,
        }).stdout;
      };
      const question = "훅으로 강제할 수 있는지 검토 후 보고해";

      expect(answer(question, "가능합니다.\n\n근거는 아래와 같습니다.")).toBe(
        "",
      );
      expect(
        answer(question, "**불가능합니다.** 이유는 아래와 같습니다."),
      ).toBe("");
      for (const message of [
        "일부만 가능합니다: 선언 대조는 가능하고 필요 도구 추정은 불가능합니다.",
        "선언 대조는 가능하지만 필요 도구 추정은 불가능합니다. 상세는 아래와 같습니다.",
        "입력을 확인했습니다. 가능합니다.",
        "검토 결과는 아래와 같습니다.",
      ]) {
        expect(JSON.parse(answer(question, message)).decision).toBe("block");
        hook({
          hook_event_name: "Stop",
          last_assistant_message: message,
          stop_hook_active: true,
        });
      }
      hook({ hook_event_name: "UserPromptSubmit", prompt: question });
      hook({
        hook_event_name: "UserPromptSubmit",
        prompt: "이 이미지로 썸네일 바꿔",
      });
      expect(
        JSON.parse(
          hook({
            hook_event_name: "Stop",
            last_assistant_message: "검토 결과입니다.",
          }).stdout,
        ).decision,
      ).toBe("block");
      hook({
        hook_event_name: "Stop",
        last_assistant_message: "검토 결과입니다.",
        stop_hook_active: true,
      });
      expect(
        answer("가능하다/불가능하다로 대답하라고", "검토 결과입니다."),
      ).toBe("");
      expect(answer(question, "검토 결과입니다.", true)).toBe("");

      const report =
        '<agent-message from="a1">\n  구현 가능할까? 검토 결과입니다.\n</agent-message>';
      expect(answer(report, "검토 결과입니다.")).toBe("");
      expect(
        answer(
          '<pasted_content id="p1">\n이거 가능해?\n</pasted_content id="p1">\n\n-> 정리해',
          "정리했습니다.",
        ),
      ).toBe("");
      hook({ hook_event_name: "UserPromptSubmit", prompt: question });
      hook({ hook_event_name: "UserPromptSubmit", prompt: report });
      expect(
        JSON.parse(
          hook({
            hook_event_name: "Stop",
            last_assistant_message: "검토 결과입니다.",
          }).stdout,
        ).decision,
      ).toBe("block");
    } finally {
      rmSync(marks, { recursive: true, force: true });
    }
  });
}

test("클로드 리뷰 누락·영어 응답 훅이 위반을 검출한다", () => {
  expect(
    run(".claude", "require-coderabbit-run", {
      tool_name: "Write",
      tool_input: {
        file_path: "artifacts/task-team/code-review-1.md",
        content: "# 검토 결과",
      },
    }).status,
  ).toBe(2);
  expect(
    run(".claude", "require-coderabbit-run", {
      tool_name: "Write",
      tool_input: {
        file_path: "artifacts/task-team/code-review-1.md",
        content: "## CodeRabbit 교차검토\n미실행: 인증 실패",
      },
    }).status,
  ).toBe(0);
  const stop = run(".claude", "require-korean-response", {
    last_assistant_message:
      "This response describes the complete implementation and verification results in English.",
  });
  expect(JSON.parse(stop.stdout).decision).toBe("block");
  expect(
    run(".claude", "require-korean-response", {
      last_assistant_message: "검증 결과를 확인했습니다.",
    }).stdout.trim(),
  ).toBe("");
});

test("코덱스 어댑터가 apply_patch와 spawn_agent 입력을 같은 훅 판정으로 변환한다", () => {
  const adapt = (hook: string, input: object, cwd = process.cwd()) =>
    spawnSync("node", [resolve(".codex/hooks/codex-tool-adapter.mjs"), hook], {
      cwd,
      input: JSON.stringify(input),
      encoding: "utf8",
      env: { ...env, CLAUDE_PROJECT_DIR: cwd },
    });
  const patch = (body: string) => ({
    tool_name: "apply_patch",
    tool_input: { command: `*** Begin Patch\n${body}\n*** End Patch` },
  });
  expect(
    adapt(
      "block-em-dash-in-source",
      patch('*** Add File: src/app/sample.ts\n+export const v = "bad — text";'),
    ).status,
  ).toBe(2);
  expect(
    adapt(
      "block-em-dash-in-source",
      patch(
        '*** Update File: src/app/sample.ts\n@@\n-export const v = "a";\n+export const v = "bad — text";',
      ),
    ).status,
  ).toBe(2);
  expect(
    adapt(
      "block-em-dash-in-source",
      patch('*** Add File: src/app/sample.ts\n+export const v = "정상";'),
    ).status,
  ).toBe(0);
  expect(
    adapt(
      "block-comment-line-wrap",
      patch(
        "*** Add File: src/app/sample.ts\n+// 캐시 키는\n+// 세션과 경로로 구성함",
      ),
    ).status,
  ).toBe(2);
  expect(
    adapt(
      "require-coderabbit-run",
      patch("*** Add File: artifacts/task-team/code-review-1.md\n+# 검토 결과"),
    ).status,
  ).toBe(2);
  const session = `report-gate-adapter-${process.pid}`;
  run(".codex", "confirm-edit-on-report-request", {
    hook_event_name: "UserPromptSubmit",
    session_id: session,
    prompt: "훅 강제 필요한지 판단하여 보고해",
  });
  const gated = adapt("confirm-edit-on-report-request", {
    hook_event_name: "PreToolUse",
    session_id: session,
    ...patch("*** Delete File: /repo/src/app/page.tsx"),
  });
  expect(JSON.parse(gated.stdout).hookSpecificOutput.permissionDecision).toBe(
    "deny",
  );
  const stop = run(".codex", "require-korean-response", {
    last_assistant_message:
      "This response describes the complete implementation and verification results in English.",
  });
  expect(JSON.parse(stop.stdout).decision).toBe("block");
});

test("AskUserQuestion 직접 입력 답변 뒤 같은 응답의 재질문을 차단하고 새 메시지 뒤에는 허용한다", () => {
  const fixture = mkdtempSync(join(tmpdir(), "portfolio-ask-hook-"));
  try {
    const transcript = join(fixture, "transcript.jsonl");
    const answer = (value: string) => ({
      type: "user",
      message: { content: [{ type: "tool_result", content: "answered" }] },
      toolUseResult: {
        questions: [
          {
            question: "Preview 지원?",
            multiSelect: false,
            options: [{ label: "지원, DB 공유" }, { label: "미지원" }],
          },
        ],
        answers: { "Preview 지원?": value },
      },
    });
    const prompt = { type: "user", message: { content: "나머지 질문해" } };
    const decide = (...entries: object[]) => {
      writeFileSync(
        transcript,
        entries.map((entry) => JSON.stringify(entry)).join("\n"),
      );
      const { stdout } = run(".claude", "block-reask-after-free-text-answer", {
        transcript_path: transcript,
      });
      return stdout.trim()
        ? JSON.parse(stdout).hookSpecificOutput.permissionDecision
        : "allow";
    };
    expect(decide(prompt, answer("best practice가 뭔데?"))).toBe("deny");
    expect(decide(prompt, answer("지원, DB 공유"))).toBe("allow");
    expect(decide(answer("best practice가 뭔데?"), prompt)).toBe("allow");
    // 다른 세션·subagent 메시지로 시작한 새 턴에서도 재질문 허용
    const peer = {
      type: "user",
      isMeta: true,
      origin: { kind: "peer" },
      message: { content: "Another Claude session sent a message:" },
    };
    expect(decide(answer("best practice가 뭔데?"), peer)).toBe("allow");
    // 줄이 4095바이트를 넘고 라벨의 한글이 읽기 경계에 걸려도 선택지 답변은 허용
    const padded = (pad: string) => ({ pad, ...answer("미지원") });
    const start =
      Buffer.from(JSON.stringify(padded(""))).indexOf('"label":"미지원"') +
      Buffer.byteLength('"label":"미');
    for (const shift of [0, 1, 2]) {
      expect(decide(prompt, padded("a".repeat(4093 - start + shift)))).toBe(
        "allow",
      );
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

const withTmp = (prefix: string, body: (tmp: string) => void) => {
  const tmp = mkdtempSync(join(tmpdir(), prefix));
  try {
    body(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

const runIn = (tool: string, hook: string, input: object, tmp: string) =>
  spawnSync("sh", [resolve(tool, "hooks", `${hook}.sh`)], {
    input: JSON.stringify({ session_id: "s1", ...input }),
    encoding: "utf8",
    env: { ...env, TMPDIR: tmp },
  });

for (const tool of [".claude", ".codex"]) {
  test(`${tool} 가능 여부 훅이 검토형 질문을 표시하고 표시된 턴의 도구 결과에 안내를 붙인다`, () => {
    withTmp("portfolio-feasibility-post-", (tmp) => {
      const post = () =>
        runIn(
          tool,
          "require-feasibility-verdict",
          { hook_event_name: "PostToolUse" },
          tmp,
        ).stdout;
      expect(post()).toBe("");
      runIn(
        tool,
        "require-feasibility-verdict",
        {
          hook_event_name: "UserPromptSubmit",
          prompt: "훅 강제 가능성 검토 후 보고해",
        },
        tmp,
      );
      expect(JSON.parse(post()).hookSpecificOutput.additionalContext).toContain(
        "가능합니다.",
      );
    });
  });

  test(`${tool} 미확인 추측 보고 훅이 추측과 미확인이 한 문장에 있으면 한 번 막는다`, () => {
    withTmp("portfolio-unverified-", (tmp) => {
      const stop = (message: string, active = false) =>
        runIn(
          tool,
          "block-unverified-claims",
          {
            hook_event_name: "Stop",
            last_assistant_message: message,
            stop_hook_active: active,
          },
          tmp,
        ).stdout;
      const claim =
        "변경은 충돌 없이 적용될 것으로 보지만 아직 확인하지 않았습니다.";
      expect(JSON.parse(stop(claim)).decision).toBe("block");
      expect(stop(claim, true)).toBe("");
      expect(stop("패치 적용 검사를 통과했습니다. 충돌은 없습니다.")).toBe("");
      expect(
        stop("권한이 없어 확인하지 못했습니다. 확인 방법은 아래와 같습니다."),
      ).toBe("");
      expect(
        stop('"~것으로 보지만 미확인" 같은 보고를 막는 훅을 추가했습니다.'),
      ).toBe("");
    });
  });
}
