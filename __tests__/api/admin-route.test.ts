import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/admin/rate-limit-service", () => ({
  consumeAdminWriteQuota: async () => ({ allowed: true }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth/auth-options", () => ({ authOptions: {} }));
const getServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: (...a: unknown[]) => getServerSession(...a),
}));

import { adminRoute } from "@/lib/auth/admin-route";
import {
  LimitExceededError,
  NotFoundError,
  OrderMismatchError,
  SlugConflictError,
} from "@/services/portfolio/portfolio-admin-service";
import { PortfolioNotSeededError } from "@/services/portfolio/portfolio-service";

const ctx = { params: Promise.resolve({}) };
const okHandler = vi.fn(async () => Response.json({ ok: true }));

function req(method: string, origin?: string) {
  return new Request("http://localhost:3000/api/admin/x", {
    method,
    headers: { host: "localhost:3000", ...(origin ? { origin } : {}) },
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("ADMIN_GITHUB_ID", "1");
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  getServerSession.mockReset();
  getServerSession.mockResolvedValue({ user: { githubId: "1" } });
  okHandler.mockClear();
});

describe("adminRoute 인증", () => {
  it("세션 없음은 401", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await adminRoute(okHandler)(req("GET"), ctx);
    expect(res.status).toBe(401);
    expect(okHandler).not.toHaveBeenCalled();
  });

  it("allowlist 외는 403 FORBIDDEN", async () => {
    getServerSession.mockResolvedValue({ user: { githubId: "9" } });
    const res = await adminRoute(okHandler)(req("GET"), ctx);
    expect(res.status).toBe(403);
    expect((await res.json()).data.code).toBe("FORBIDDEN");
  });

  it("허용 계정의 GET은 Origin 없이도 통과", async () => {
    const res = await adminRoute(okHandler)(req("GET"), ctx);
    expect(res.status).toBe(200);
    expect(okHandler).toHaveBeenCalledOnce();
  });
});

describe("adminRoute Origin 검사", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "%s Origin 없음은 403",
    async (m) => {
      const res = await adminRoute(okHandler)(req(m), ctx);
      expect(res.status).toBe(403);
      expect((await res.json()).data.code).toBe("FORBIDDEN_ORIGIN");
      expect(okHandler).not.toHaveBeenCalled();
    },
  );

  it("Origin 불일치는 403", async () => {
    const res = await adminRoute(okHandler)(
      req("POST", "https://evil.example"),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  it("잘못된 Origin 값은 403", async () => {
    const res = await adminRoute(okHandler)(req("POST", "not a url"), ctx);
    expect(res.status).toBe(403);
  });

  it("NEXTAUTH_URL host와 일치하면 허용", async () => {
    const res = await adminRoute(okHandler)(
      req("POST", "http://localhost:3000"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("ADMIN_ALLOWED_HOSTS의 host도 허용", async () => {
    vi.stubEnv("ADMIN_ALLOWED_HOSTS", "a.example.com, b.example.com");
    vi.stubEnv("NEXTAUTH_URL", "https://admin.example.com");
    const res = await adminRoute(okHandler)(
      req("DELETE", "https://b.example.com"),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("설정된 scheme과 다른 Origin은 거부", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://admin.example.com");
    const res = await adminRoute(okHandler)(
      req("POST", "http://admin.example.com"),
      ctx,
    );
    expect(res.status).toBe(403);
    expect((await res.json()).data.code).toBe("FORBIDDEN_ORIGIN");
  });

  it("설정된 port와 다른 Origin은 거부", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://admin.example.com:8443");
    const res = await adminRoute(okHandler)(
      req("PUT", "https://admin.example.com"),
      ctx,
    );
    expect(res.status).toBe(403);
    expect((await res.json()).data.code).toBe("FORBIDDEN_ORIGIN");
  });

  it("Origin의 경로가 포함되면 거부", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://admin.example.com");
    const res = await adminRoute(okHandler)(
      req("PATCH", "https://admin.example.com/admin"),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  it("NEXTAUTH_URL이 잘못된 값이면 모든 Origin 거부", async () => {
    vi.stubEnv("NEXTAUTH_URL", "::bad::");
    const res = await adminRoute(okHandler)(
      req("POST", "http://localhost:3000"),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  it("NEXTAUTH_URL과 ADMIN_ALLOWED_HOSTS가 없으면 host 헤더와 비교", async () => {
    vi.stubEnv("NEXTAUTH_URL", "");
    const res = await adminRoute(okHandler)(
      req("POST", "http://localhost:3000"),
      ctx,
    );
    expect(res.status).toBe(200);
    const bad = await adminRoute(okHandler)(
      req("POST", "http://other:3000"),
      ctx,
    );
    expect(bad.status).toBe(403);
  });

  it("Origin 검사는 인증 검사보다 먼저 수행", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await adminRoute(okHandler)(req("POST"), ctx);
    expect(res.status).toBe(403);
  });
});

describe("adminRoute 예외 매핑", () => {
  const run = (error: unknown) =>
    adminRoute(async () => {
      throw error;
    })(req("GET"), ctx);

  it.each([
    ["SlugConflict", () => new SlugConflictError(), 409, "SLUG_CONFLICT"],
    ["NotFound", () => new NotFoundError(), 404, "NOT_FOUND"],
    ["OrderMismatch", () => new OrderMismatchError(), 409, "ORDER_MISMATCH"],
    ["NotSeeded", () => new PortfolioNotSeededError(), 409, "NOT_SEEDED"],
    ["LimitExceeded", () => new LimitExceededError(), 409, "LIMIT_EXCEEDED"],
  ])("%s", async (_n, make, status, code) => {
    const res = await run(make());
    expect(res.status).toBe(status);
    expect((await res.json()).data.code).toBe(code);
  });

  it("알 수 없는 예외는 500이며 메시지를 노출하지 않음", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await run(new Error("SECRET postgres://user:pw@host/db"));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("postgres://");
    expect(JSON.parse(text).data.code).toBe("INTERNAL_ERROR");
    spy.mockRestore();
  });
});
