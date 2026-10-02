import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

const run = (tool: string, hook: string, input: object, cwd = process.cwd()) =>
  spawnSync("sh", [resolve(tool, "hooks", `${hook}.sh`)], {
    cwd,
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd },
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
  test(`${tool} 런타임 안전 훅이 파괴적 명령과 잘못된 에이전트 실행을 차단한다`, () => {
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
    expect(
      run(tool, "block-fork-spawn", { tool_input: { subagent_type: "fork" } })
        .status,
    ).toBe(2);
    expect(
      run(tool, "block-fork-spawn", {
        tool_input: { subagent_type: "qa-engineer" },
      }).status,
    ).toBe(0);
    expect(run(tool, "orchestrator-no-worktree", {}).status).toBe(2);
    expect(
      run(tool, "orchestrator-no-worktree", { agent_id: "implementation" })
        .status,
    ).toBe(0);
    const fixture = mkdtempSync(join(tmpdir(), "portfolio-hooks-"));
    try {
      spawnSync("git", ["init", "-q"], { cwd: fixture });
      writeFileSync(join(fixture, "dirty.txt"), "changed");
      expect(
        run(
          tool,
          "require-isolation-when-dirty",
          { tool_input: { subagent_type: "frontend-developer" } },
          fixture,
        ).status,
      ).toBe(2);
      expect(
        run(
          tool,
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
  test(`${tool} 원인 설명 안내 훅이 실행을 차단하지 않는다`, () => {
    const result = run(tool, "require-why-explanation", {
      prompt: "왜 변경했어?",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("판단 근거");
  });
}

test("클로드 전용 훅이 리뷰 누락과 영어 응답을 검출한다", () => {
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
  const fixture = mkdtempSync(join(tmpdir(), "portfolio-review-hooks-"));
  try {
    const directory = join(fixture, "artifacts/task-team");
    mkdirSync(directory, { recursive: true });
    for (const number of [1, 2, 3])
      writeFileSync(join(directory, `code-review-${number}.md`), "review");
    const review = run(
      ".claude",
      "confirm-repeated-review",
      { tool_input: { subagent_type: "code-reviewer" } },
      fixture,
    );
    expect(
      JSON.parse(review.stdout).hookSpecificOutput.permissionDecision,
    ).toBe("ask");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
