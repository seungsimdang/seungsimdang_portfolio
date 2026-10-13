import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));

import { toProfile, toTalk } from "@/services/portfolio/portfolio-service";

const talkRow = {
  id: "i",
  slug: "s",
  title: "t",
  date: "2025.06",
  venue: "v",
  description: "d",
  impact: "im",
  link: "javascript:alert(1)",
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const profileRow = {
  id: 1,
  name: "n",
  title: "t",
  tagline: "a\nb",
  description: "d",
  email: "e@e.co",
  github: "javascript:alert(1)",
  skills: ["x"],
  tools: [],
  updatedAt: new Date(),
};

describe("공개 읽기 필터 (toTalk, toProfile)", () => {
  it("raw=false는 http(s) 외 링크를 제외", () => {
    expect(toTalk(talkRow).link).toBeUndefined();
    expect(toProfile(profileRow).github).toBeUndefined();
    expect(toTalk({ ...talkRow, link: "not a url" }).link).toBeUndefined();
  });
  it("raw=true는 DB 원값 유지", () => {
    expect(toTalk(talkRow, true).link).toBe("javascript:alert(1)");
    expect(toProfile(profileRow, true).github).toBe("javascript:alert(1)");
  });
  it("http/https는 통과하고 줄바꿈은 보존", () => {
    expect(toTalk({ ...talkRow, link: "https://a.com" }).link).toBe(
      "https://a.com",
    );
    expect(toTalk({ ...talkRow, link: "http://a.com" }).link).toBe(
      "http://a.com",
    );
    expect(toProfile(profileRow).tagline).toBe("a\nb");
  });
});
