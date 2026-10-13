import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/auth-options", () => ({ authOptions: {} }));
const getServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => getServerSession(...a),
}));

import { isAllowedGithubId } from "@/lib/auth/admin-allowlist";
import { requireAdmin } from "@/lib/auth/require-admin";

beforeEach(() => {
  vi.unstubAllEnvs();
  getServerSession.mockReset();
});

describe("isAllowedGithubId", () => {
  it("allowlist 정확 일치만 허용", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "12345");
    expect(isAllowedGithubId("12345")).toBe(true);
    expect(isAllowedGithubId("1234")).toBe(false);
    expect(isAllowedGithubId("123456")).toBe(false);
  });

  it("쉼표 목록과 공백을 처리", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", " 1, 22 ,333");
    expect(isAllowedGithubId("22")).toBe(true);
    expect(isAllowedGithubId("333")).toBe(true);
    expect(isAllowedGithubId("2")).toBe(false);
  });

  it("숫자가 아닌 토큰은 버림", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "octocat,1");
    expect(isAllowedGithubId("octocat")).toBe(false);
    expect(isAllowedGithubId("1")).toBe(true);
  });

  it("env가 비면 전원 거부 (fail-closed)", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "");
    expect(isAllowedGithubId("1")).toBe(false);
    expect(isAllowedGithubId("")).toBe(false);
    expect(isAllowedGithubId(undefined)).toBe(false);
    vi.stubEnv("ADMIN_GITHUB_ID", " , ,");
    expect(isAllowedGithubId("1")).toBe(false);
  });

  it("env 미설정이어도 전원 거부", () => {
    vi.stubEnv("ADMIN_GITHUB_ID", undefined);
    expect(isAllowedGithubId("1")).toBe(false);
  });
});

describe("requireAdmin", () => {
  it("세션 없음은 401", async () => {
    getServerSession.mockResolvedValue(null);
    expect(await requireAdmin()).toEqual({ ok: false, status: 401 });
  });

  it("githubId 없음은 403", async () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "1");
    getServerSession.mockResolvedValue({ user: { name: "x" } });
    expect(await requireAdmin()).toEqual({ ok: false, status: 403 });
  });

  it("allowlist 외는 403", async () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "1");
    getServerSession.mockResolvedValue({ user: { githubId: "2" } });
    expect(await requireAdmin()).toEqual({ ok: false, status: 403 });
  });

  it("env 비면 세션이 있어도 403", async () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "");
    getServerSession.mockResolvedValue({ user: { githubId: "1" } });
    expect(await requireAdmin()).toEqual({ ok: false, status: 403 });
  });

  it("허용 계정은 통과", async () => {
    vi.stubEnv("ADMIN_GITHUB_ID", "1");
    getServerSession.mockResolvedValue({ user: { githubId: "1" } });
    expect(await requireAdmin()).toEqual({ ok: true, githubId: "1" });
  });
});
