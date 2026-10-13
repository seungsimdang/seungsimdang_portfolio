import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));
const consume = vi.fn();
vi.mock("@/services/admin/rate-limit-service", () => ({
  consumeAdminWriteQuota: (...a: unknown[]) => consume(...a),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/auth-options", () => ({ authOptions: {} }));
const getServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => getServerSession(...a),
}));

import { adminRoute } from "@/lib/auth/admin-route";

const ctx = { params: Promise.resolve({}) };
const handler = vi.fn(async () => Response.json({ ok: true }));

function req(method: string, origin?: string) {
  return new Request("http://localhost:3000/api/admin/x", {
    method,
    headers: { host: "localhost:3000", ...(origin ? { origin } : {}) },
  });
}
const sameOrigin = "http://localhost:3000";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("ADMIN_GITHUB_ID", "1");
  vi.stubEnv("NEXTAUTH_URL", sameOrigin);
  getServerSession.mockReset();
  getServerSession.mockResolvedValue({ user: { githubId: "1" } });
  consume.mockReset();
  consume.mockResolvedValue({ allowed: true });
  handler.mockClear();
});

describe("adminRoute 쓰기 쿼터", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "%s 거부는 429와 Retry-After 헤더로 응답하고 핸들러를 실행하지 않는다",
    async (m) => {
      consume.mockResolvedValue({ allowed: false, retryAfterSeconds: 37 });
      const res = await adminRoute(handler)(req(m, sameOrigin), ctx);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("37");
      expect((await res.json()).data.code).toBe("RATE_LIMITED");
      expect(handler).not.toHaveBeenCalled();
    },
  );

  it("쿼터는 인증된 githubId로 소비한다", async () => {
    await adminRoute(handler)(req("POST", sameOrigin), ctx);
    expect(consume).toHaveBeenCalledWith("1");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("GET은 쿼터를 소비하지 않고 거부 상태여도 통과한다", async () => {
    consume.mockResolvedValue({ allowed: false, retryAfterSeconds: 10 });
    const res = await adminRoute(handler)(req("GET"), ctx);
    expect(res.status).toBe(200);
    expect(consume).not.toHaveBeenCalled();
  });

  it("Origin 불일치와 미인증 쓰기는 쿼터를 소비하지 않는다", async () => {
    await adminRoute(handler)(req("POST", "https://evil.example"), ctx);
    getServerSession.mockResolvedValue(null);
    await adminRoute(handler)(req("POST", sameOrigin), ctx);
    getServerSession.mockResolvedValue({ user: { githubId: "9" } });
    await adminRoute(handler)(req("POST", sameOrigin), ctx);
    expect(consume).not.toHaveBeenCalled();
  });

  it("쿼터 조회가 실패하면 500이며 쓰기를 통과시키지 않는다", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    consume.mockRejectedValue(
      new Error("relation admin_rate_limits does not exist"),
    );
    const res = await adminRoute(handler)(req("POST", sameOrigin), ctx);
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain("admin_rate_limits");
    expect(handler).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
