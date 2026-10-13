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

import { POST } from "@/app/api/admin/uploads/thumbnail/route";

const HOST = "ci-test.public.blob.vercel-storage.com";
const BLOB_URL = `https://${HOST}/thumbnails/image-abc.png`;
const ctx = { params: Promise.resolve({}) };

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];

function fileOf(bytes: number[], name: string, type: string, size?: number) {
  const body = size ? new Uint8Array(size) : new Uint8Array(bytes);
  if (size) body.set(bytes);
  return new File([body], name, { type });
}

function upload(
  form: FormData | null,
  headers: Record<string, string> = {},
  origin: string | null = "http://localhost:3000",
) {
  return POST(
    new Request("http://localhost:3000/api/admin/uploads/thumbnail", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        ...(origin ? { origin } : {}),
        ...headers,
      },
      ...(form ? { body: form } : {}),
    }),
    ctx,
  );
}

function formWith(file: File, key = "file") {
  const form = new FormData();
  form.set(key, file);
  return form;
}

async function errorOf(res: Response) {
  return (await res.json()).data as {
    code: string;
    fieldErrors?: Record<string, string>;
  };
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("ADMIN_GITHUB_ID", "1");
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_BLOB_HOSTNAME", HOST);
  getServerSession.mockReset();
  getServerSession.mockResolvedValue({ user: { githubId: "1" } });
  put.mockReset();
  del.mockReset();
  put.mockResolvedValue({ url: BLOB_URL });
});

describe("썸네일 업로드 인증과 Origin", () => {
  it("세션이 없으면 401이고 Blob에 닿지 않는다", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await upload(formWith(fileOf(PNG, "a.png", "image/png")));
    expect(res.status).toBe(401);
    expect(put).not.toHaveBeenCalled();
  });

  it("allowlist 밖 계정은 403", async () => {
    getServerSession.mockResolvedValue({ user: { githubId: "9" } });
    const res = await upload(formWith(fileOf(PNG, "a.png", "image/png")));
    expect(res.status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });

  it("Origin이 없으면 403", async () => {
    const res = await upload(
      formWith(fileOf(PNG, "a.png", "image/png")),
      {},
      null,
    );
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe("FORBIDDEN_ORIGIN");
  });

  it("Origin이 다르면 403", async () => {
    const res = await upload(
      formWith(fileOf(PNG, "a.png", "image/png")),
      {},
      "https://evil.example",
    );
    expect(res.status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });
});

describe("썸네일 업로드 요청 형식", () => {
  it("multipart가 아니면 415", async () => {
    const res = await upload(null, { "content-type": "application/json" });
    expect(res.status).toBe(415);
  });

  it("Content-Length가 4.5MB를 넘으면 413", async () => {
    const res = await upload(formWith(fileOf(PNG, "a.png", "image/png")), {
      "content-length": String(5 * 1024 * 1024),
    });
    expect(res.status).toBe(413);
    expect(put).not.toHaveBeenCalled();
  });

  it("파일 필드가 둘이면 400", async () => {
    const form = formWith(fileOf(PNG, "a.png", "image/png"));
    form.set("extra", "x");
    const res = await upload(form);
    expect(res.status).toBe(400);
    expect((await errorOf(res)).fieldErrors?.file).toBeTruthy();
  });

  it("필드 이름이 file이 아니면 400", async () => {
    const res = await upload(
      formWith(fileOf(PNG, "a.png", "image/png"), "other"),
    );
    expect(res.status).toBe(400);
  });

  it("문자열 값만 있으면 400", async () => {
    const form = new FormData();
    form.set("file", "text");
    expect((await upload(form)).status).toBe(400);
  });

  it("빈 파일은 400", async () => {
    const res = await upload(formWith(fileOf([], "a.png", "image/png")));
    expect(res.status).toBe(400);
    expect((await errorOf(res)).fieldErrors?.file).toMatch(/빈 파일/);
  });

  it("4MB를 넘는 파일은 413", async () => {
    const big = fileOf(PNG, "a.png", "image/png", 4 * 1024 * 1024 + 1);
    const res = await upload(formWith(big));
    expect(res.status).toBe(413);
    expect(put).not.toHaveBeenCalled();
  });

  it("정확히 4MB 파일은 통과", async () => {
    const edge = fileOf(PNG, "a.png", "image/png", 4 * 1024 * 1024);
    expect((await upload(formWith(edge))).status).toBe(200);
  });
});

describe("썸네일 업로드 파일 검증", () => {
  it.each([
    ["확장자가 허용 밖(gif)", fileOf(PNG, "a.gif", "image/png")],
    ["확장자 없음", fileOf(PNG, "noext", "image/png")],
    ["PNG 시그니처에 jpg 확장자", fileOf(PNG, "a.jpg", "image/png")],
    ["JPG 시그니처에 png 확장자", fileOf(JPG, "a.png", "image/jpeg")],
    ["시그니처가 이미지가 아님", fileOf([1, 2, 3, 4], "a.png", "image/png")],
    ["MIME이 시그니처와 다름", fileOf(PNG, "a.png", "image/jpeg")],
    ["MIME이 비어 있음", fileOf(PNG, "a.png", "")],
  ])("%s이면 400", async (_name, file) => {
    const res = await upload(formWith(file));
    expect(res.status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });
});

describe("썸네일 업로드 성공과 Blob 실패", () => {
  it.each([
    ["png", PNG, "a.png", "image/png"],
    ["jpg", JPG, "a.jpg", "image/jpeg"],
    ["jpeg 확장자", JPG, "A.JPEG", "image/jpeg"],
    ["webp", WEBP, "a.webp", "image/webp"],
  ])("%s는 200과 Blob URL을 돌려준다", async (_n, bytes, name, type) => {
    const res = await upload(formWith(fileOf(bytes, name, type)));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ url: BLOB_URL });
    const [key, , options] = put.mock.calls[0];
    expect(key).toMatch(/^thumbnails\/image\.(png|jpg|webp)$/);
    expect(options).toMatchObject({
      access: "public",
      addRandomSuffix: true,
      contentType: type,
    });
  });

  it("사용자 파일명은 저장 키에 쓰이지 않는다", async () => {
    await upload(formWith(fileOf(PNG, "../../evil name.png", "image/png")));
    expect(put.mock.calls[0][0]).toBe("thumbnails/image.png");
  });

  it("put이 실패하면 500", async () => {
    put.mockRejectedValue(new Error("blob down"));
    const res = await upload(formWith(fileOf(PNG, "a.png", "image/png")));
    expect(res.status).toBe(500);
  });

  it("허용 호스트가 아닌 URL이 오면 삭제하고 500", async () => {
    put.mockResolvedValue({ url: "https://other.example/thumbnails/a.png" });
    del.mockResolvedValue(undefined);
    const res = await upload(formWith(fileOf(PNG, "a.png", "image/png")));
    expect(res.status).toBe(500);
    expect(del).toHaveBeenCalledWith("https://other.example/thumbnails/a.png");
  });
});
