import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
if (process.argv.length !== 3 || !["--check", "--write"].includes(mode)) {
  console.error("Usage: node scripts/sync-agent-harness.mjs --check|--write");
  process.exit(2);
}
const manifest = JSON.parse(
  readFileSync(resolve(root, "docs/agent-harness/manifest.json"), "utf8"),
);
const files = new Map();
for (const item of manifest.files) {
  const source = resolve(root, item.source);
  const output = resolve(root, item.output);
  if (
    !source.startsWith(
      `${root}${sep}docs${sep}agent-harness${sep}templates${sep}`,
    ) ||
    ![".claude", ".codex", ".agents"].some((tool) =>
      output.startsWith(`${root}${sep}${tool}${sep}`),
    ) ||
    files.has(item.output)
  ) {
    throw new Error(`Invalid or duplicate template mapping: ${item.output}`);
  }
  files.set(item.output, readFileSync(source, "utf8"));
}
const names = new Set();
for (const role of manifest.roles) {
  if (!/^[a-z][a-z0-9-]*$/.test(role.name) || names.has(role.name))
    throw new Error(`Invalid role: ${role.name}`);
  names.add(role.name);
  const codex = files.get(`.codex/agents/${role.name}.toml`);
  const claude = files.get(`.claude/agents/${role.name}.md`);
  for (const [key, value] of Object.entries(role.codex ?? {})) {
    if (!value || !codex?.includes(`${key} = ${JSON.stringify(value)}`))
      throw new Error(`Invalid ${key}: ${role.name}`);
  }
  if (
    !role.codex?.model ||
    !role.codex?.model_reasoning_effort ||
    !role.claude?.model ||
    !role.claude?.tools
  )
    throw new Error(`Missing required role settings: ${role.name}`);
  const frontmatter = claude?.split("---")[1];
  for (const [key, value] of Object.entries(role.claude)) {
    if (!value || !frontmatter?.split("\n").includes(`${key}: ${value}`))
      throw new Error(`Invalid Claude ${key}: ${role.name}`);
  }
  if (role.claude.effort === undefined && /^effort:/m.test(frontmatter ?? ""))
    throw new Error(`Unexpected Claude effort: ${role.name}`);
}
if (names.size !== 12) throw new Error("Expected twelve reference roles");
for (const skill of manifest.skills) {
  for (const tool of [".claude", ".agents"]) {
    if (!files.has(`${tool}/skills/${skill}/SKILL.md`))
      throw new Error(`Missing skill: ${tool}/${skill}`);
  }
}
const stale = [];
for (const [path, expected] of files) {
  const absolute = resolve(root, path);
  if (existsSync(absolute) && readFileSync(absolute, "utf8") === expected)
    continue;
  stale.push(path);
  if (mode === "--write") {
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, expected);
  }
}
if (mode === "--check" && stale.length) {
  console.error(
    `Harness drift (${stale.length} files):\n${stale.join("\n")}\nRun pnpm harness:sync.`,
  );
  process.exit(1);
}
console.log(
  `Harness ${mode === "--check" ? "check" : "sync"}: ${files.size} files, ${stale.length} ${mode === "--check" ? "differences" : "updated"}.`,
);
