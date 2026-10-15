// 썸네일·이미지 업로드에 필요한 Blob 환경변수 누락 검사
const required = ["BLOB_READ_WRITE_TOKEN", "NEXT_PUBLIC_BLOB_HOSTNAME"];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}`,
  );
  process.exit(1);
}

try {
  const host = process.env.NEXT_PUBLIC_BLOB_HOSTNAME;
  if (new URL(`https://${host}`).hostname !== host || host.includes("/")) {
    throw new Error();
  }
} catch {
  console.error("NEXT_PUBLIC_BLOB_HOSTNAME must be a hostname only");
  process.exit(1);
}
