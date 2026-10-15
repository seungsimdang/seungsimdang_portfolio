import { describe, expect, it, vi } from "vitest";
import { applyServerErrors, countErrors } from "@/lib/admin-client/form-errors";

describe("서버 필드 오류 매핑", () => {
  it("배열과 객체 항목 오류를 실제 입력 필드로 연결한다", () => {
    const setError = vi.fn();
    applyServerErrors(
      setError,
      {
        skills: [{ value: "React" }],
        projects: [{ title: "프로젝트", experiences: [{ title: "성과" }] }],
      },
      {
        skills: "스킬 오류",
        "skills.0": "첫 스킬 오류",
        "projects.0.experiences.0": "성과 오류",
      },
    );

    expect(
      setError.mock.calls.map(([name, error]) => [name, error.message]),
    ).toEqual([
      ["skills.root", "스킬 오류"],
      ["skills.0.value", "첫 스킬 오류"],
      ["projects.0.experiences.0.title", "성과 오류"],
    ]);
  });

  it("중첩 오류의 말단 수를 세고 DOM ref와 비오류 값을 제외한다", () => {
    const ref = { focus: vi.fn() };
    expect(
      countErrors({
        name: { type: "server", message: "오류", ref },
        items: [
          { value: { type: "required", message: "필수" } },
          { root: { type: "server", message: "목록 오류" } },
        ],
        extra: "문자열",
      }),
    ).toBe(3);
    expect(countErrors(null)).toBe(0);
    expect(countErrors("오류 아님")).toBe(0);
  });
});
