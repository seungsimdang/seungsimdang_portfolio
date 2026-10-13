import { del, put } from "@vercel/blob";
import { HttpStatusCode } from "axios";
import { ApiError, apiErrors } from "@/lib/api/api-error";
import { ok } from "@/lib/api/response";
import { adminRoute } from "@/lib/auth/admin-route";
import { isValidThumbnail } from "@/schemas/portfolio.schema";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
// Content-Length 없는 chunked 요청의 본문 상한은 Vercel Function 요청 본문 제한(4.5MB)에 의존함
const MAX_REQUEST_BYTES = Math.floor(4.5 * 1024 * 1024);

function invalidFile(message: string): ApiError {
  return new ApiError(
    "VALIDATION_FAILED",
    HttpStatusCode.BadRequest,
    "파일을 확인해 주세요",
    {
      file: message,
    },
  );
}

function sniffImage(
  bytes: Uint8Array,
): { extension: string; contentType: string } | undefined {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { extension: ".png", contentType: "image/png" };
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { extension: ".jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { extension: ".webp", contentType: "image/webp" };
  }
  return undefined;
}

function tooLarge(): ApiError {
  return new ApiError(
    "PAYLOAD_TOO_LARGE",
    HttpStatusCode.PayloadTooLarge,
    "파일 크기는 4MB 이하여야 합니다",
  );
}

export const POST = adminRoute(async ({ request }) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      HttpStatusCode.UnsupportedMediaType,
      "multipart/form-data 요청만 허용됩니다",
    );
  }
  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_REQUEST_BYTES
  ) {
    throw tooLarge();
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw invalidFile("PNG, JPG, WebP 파일을 선택해 주세요");
  }
  const entries = [...form.entries()];
  const file = form.get("file");
  if (entries.length !== 1 || !(file instanceof File)) {
    throw invalidFile("파일 하나만 선택해 주세요");
  }
  if (file.size === 0) throw invalidFile("빈 파일은 올릴 수 없습니다");
  if (file.size > MAX_FILE_BYTES) throw tooLarge();

  const detected = sniffImage(
    new Uint8Array(await file.slice(0, 12).arrayBuffer()),
  );
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const allowedExtension =
    detected?.extension === ".jpg"
      ? extension === ".jpg" || extension === ".jpeg"
      : extension === detected?.extension;
  if (!detected || !allowedExtension) {
    throw invalidFile("PNG, JPG, WebP 파일만 올릴 수 있습니다");
  }
  if (file.type !== detected.contentType) {
    throw invalidFile("파일 형식이 실제 이미지와 일치하지 않습니다");
  }

  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(`thumbnails/image${detected.extension}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: detected.contentType,
    });
  } catch {
    throw apiErrors.internal();
  }
  if (!isValidThumbnail(blob.url)) {
    try {
      await del(blob.url);
    } catch {
      // 검증을 통과하지 못한 URL은 클라이언트에 돌려주지 않고 정리만 시도함
    }
    throw apiErrors.internal();
  }
  return ok({ url: blob.url });
});
