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
const put = vi.fn();
const del = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...a: unknown[]) => put(...a),
  del: (...a: unknown[]) => del(...a),
}));

import { POST as postImage } from "@/app/api/admin/uploads/post-image/route";
import { POST as thumbnail } from "@/app/api/admin/uploads/thumbnail/route";

const HOST = "ci-test.public.blob.vercel-storage.com";
const IMAGE_URL = `https://${HOST}/blog/images/image-abc.png`;
const ctx = { params: Promise.resolve({}) };

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF = [...Buffer.from("GIF89a"), 0, 0, 0, 0, 0, 0];

function fileOf(bytes: number[], name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

function call(
  handler: typeof postImage,
  path: string,
  file: File,
  origin: string | null = "http://localhost:3000",
) {
  const form = new FormData();
  form.set("file", file);
  return handler(
    new Request(`http://localhost:3000${path}`, {
      method: "POST",
      headers: { host: "localhost:3000", ...(origin ? { origin } : {}) },
      body: form,
    }),
    ctx,
  );
}

const upload = (file: File, origin?: string | null) =>
  call(postImage, "/api/admin/uploads/post-image", file, origin);

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("ADMIN_GITHUB_ID", "1");
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_BLOB_HOSTNAME", HOST);
  getServerSession.mockReset();
  getServerSession.mockResolvedValue({ user: { githubId: "1" } });
  put.mockReset();
  del.mockReset();
  put.mockResolvedValue({ url: IMAGE_URL });
});

describe("본문 이미지 업로드 라우트", () => {
  it("세션이 없으면 401이다", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await upload(fileOf(PNG, "a.png", "image/png"))).status).toBe(401);
    expect(put).not.toHaveBeenCalled();
  });

  it("Origin이 없거나 다르면 403이다", async () => {
    expect((await upload(fileOf(PNG, "a.png", "image/png"), null)).status).toBe(
      403,
    );
    expect(
      (await upload(fileOf(PNG, "a.png", "image/png"), "https://evil.example"))
        .status,
    ).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });

  it("gif를 허용하고 blog/images 경로로 올린다", async () => {
    const res = await upload(fileOf(GIF, "a.gif", "image/gif"));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ url: IMAGE_URL });
    const [key, , options] = put.mock.calls[0];
    expect(key).toBe("blog/images/image.gif");
    expect(options).toMatchObject({
      access: "public",
      addRandomSuffix: true,
      contentType: "image/gif",
    });
  });

  it("png는 통과하고 확장자와 시그니처가 다르면 400이다", async () => {
    expect((await upload(fileOf(PNG, "a.png", "image/png"))).status).toBe(200);
    put.mockClear();
    expect((await upload(fileOf(PNG, "a.gif", "image/gif"))).status).toBe(400);
    expect((await upload(fileOf(GIF, "a.png", "image/png"))).status).toBe(400);
    expect((await upload(fileOf(GIF, "a.gif", "image/png"))).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it("4MB 초과는 413이다", async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    big.set(GIF);
    const res = await upload(new File([big], "a.gif", { type: "image/gif" }));
    expect(res.status).toBe(413);
    expect(put).not.toHaveBeenCalled();
  });

  it("thumbnails 경로 URL이 오면 삭제하고 500이다", async () => {
    put.mockResolvedValue({ url: `https://${HOST}/thumbnails/image-abc.png` });
    del.mockResolvedValue(undefined);
    const res = await upload(fileOf(PNG, "a.png", "image/png"));
    expect(res.status).toBe(500);
    expect(del).toHaveBeenCalled();
  });
});

describe("썸네일 업로드의 gif 불허 회귀", () => {
  it("썸네일 라우트는 gif를 400으로 거부한다", async () => {
    const res = await call(
      thumbnail,
      "/api/admin/uploads/thumbnail",
      fileOf(GIF, "a.gif", "image/gif"),
    );
    expect(res.status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });
});
