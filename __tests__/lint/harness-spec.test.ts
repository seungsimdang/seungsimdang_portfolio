import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// harness-lab 템플릿(agent-team-design, orchestrator-artifacts-template, skill-authoring-guide)의 필수 절
const AGENT_SECTIONS = [
  "## 책임",
  "## 입력",
  "## 출력",
  "## 작업 방식",
  "## 팀 통신 프로토콜",
  "## 하지 말아야 할 일",
];
const PROTOCOL_ITEMS = [
  "메시지 수신",
  "메시지 발신",
  "작업 요청",
  "파일 산출물",
  "차단 조건",
];
const ORCHESTRATOR_SECTIONS = [
  "## 목적",
  "## 실행 모드",
  "## 실행 모드 확인",
  "## Agent Team 구성",
  "## Task 등록 계약",
  "## 하이브리드 전환",
  "## 실패 처리",
  "## 산출물 계약",
  "## 테스트 프롬프트",
];
const SKILL_SECTIONS = [
  "## 역할",
  "## 사용 조건",
  "## 입력",
  "## 절차",
  "## 출력",
  "## 품질 기준",
  "## 테스트 프롬프트",
];
// 외부에서 가져온 설계·스캐폴딩 가이드는 대상에서 제외
const EXTERNAL_SKILLS = ["harness-lab", "scaffold-web-project"];

// 제목은 줄 전체가 일치해야 함("## 실행 모드"가 "## 실행 모드 확인"에 맞지 않도록)
const hasHeading = (spec: string, heading: string) =>
  new RegExp(`^${heading}\\s*$`, "m").test(spec);

describe("에이전트 명세가 하네스 템플릿 필수 절을 모두 갖는다", () => {
  for (const file of readdirSync(".claude/agents")) {
    it(`${file} 명세에 필수 절과 팀 통신 항목이 있다`, () => {
      const spec = readFileSync(`.claude/agents/${file}`, "utf8");
      for (const heading of AGENT_SECTIONS)
        expect(hasHeading(spec, heading), heading).toBe(true);
      for (const item of PROTOCOL_ITEMS) expect(spec).toContain(item);
    });
  }
});

describe("스킬 명세가 하네스 템플릿 필수 절을 모두 갖는다", () => {
  for (const dir of readdirSync(".claude/skills").filter(
    (name) => !EXTERNAL_SKILLS.includes(name),
  )) {
    it(`${dir} 명세에 필수 절이 있다`, () => {
      const spec = readFileSync(`.claude/skills/${dir}/SKILL.md`, "utf8");
      const required = dir.endsWith("-orchestrator")
        ? ORCHESTRATOR_SECTIONS
        : SKILL_SECTIONS;
      for (const heading of required)
        expect(hasHeading(spec, heading), heading).toBe(true);
    });
  }
});
