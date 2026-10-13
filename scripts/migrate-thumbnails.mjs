import { readFile, realpath, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const apply = process.argv.includes("--apply");
const databaseUrl = process.env.DATABASE_URL;
const hostname = process.env.NEXT_PUBLIC_BLOB_HOSTNAME;
if (
  !databaseUrl ||
  (apply && (!process.env.BLOB_READ_WRITE_TOKEN || !hostname))
) {
  console.error(
    apply
      ? "DATABASE_URL, BLOB_READ_WRITE_TOKEN, and NEXT_PUBLIC_BLOB_HOSTNAME are required"
      : "DATABASE_URL is required",
  );
  process.exit(1);
}

// 대상 DB를 오인하지 않도록 비밀번호 없이 호스트만 출력
console.log(`Target database host: ${new URL(databaseUrl).hostname}`);
const sql = neon(databaseUrl);
const publicRoot = await realpath(resolve("public"));
const rows =
  await sql`SELECT id, slug, thumbnail FROM projects WHERE thumbnail LIKE '/images/%' ORDER BY slug`;

function sniffImage(bytes, extension) {
  if (
    extension === ".png" &&
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    [".jpg", ".jpeg"].includes(extension) &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    extension === ".webp" &&
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return undefined;
}

async function validate(thumbnail) {
  if (
    !thumbnail.startsWith("/images/") ||
    thumbnail.includes("\\") ||
    thumbnail.includes("..")
  ) {
    throw new Error("invalid image path");
  }
  const candidate = resolve(publicRoot, thumbnail.slice(1));
  const filePath = await realpath(candidate);
  const relativePath = relative(publicRoot, filePath);
  if (
    !relativePath ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath === ".."
  ) {
    throw new Error("image path is outside public");
  }
  const info = await stat(filePath);
  if (!info.isFile() || info.size === 0 || info.size > MAX_FILE_BYTES) {
    throw new Error("invalid image size");
  }
  const bytes = await readFile(filePath);
  const contentType = sniffImage(bytes, extname(filePath).toLowerCase());
  if (!contentType) throw new Error("image type does not match its extension");
  return { filePath, size: info.size, contentType, bytes };
}

function report({ slug, thumbnail, size, contentType, status, url }) {
  // 한 행이라도 실패하면 종료 코드로 알림
  if (status.startsWith("failed")) process.exitCode = 1;
  console.log(
    JSON.stringify({
      slug,
      source: thumbnail,
      size,
      contentType,
      status,
      ...(url ? { url } : {}),
    }),
  );
}

for (const row of rows) {
  try {
    const file = await validate(row.thumbnail);
    if (!apply) {
      report({ ...row, ...file, status: "ready (dry-run)" });
      continue;
    }
    const blob = await put(
      `thumbnails/migrated${extname(file.filePath).toLowerCase()}`,
      file.bytes,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: file.contentType,
      },
    );
    const blobUrl = new URL(blob.url);
    if (
      blobUrl.protocol !== "https:" ||
      blobUrl.hostname !== hostname ||
      blobUrl.username ||
      blobUrl.password ||
      blobUrl.port ||
      blobUrl.search ||
      blobUrl.hash
    ) {
      report({
        ...row,
        ...file,
        status: "failed (unexpected Blob URL; possible orphan upload)",
      });
      continue;
    }
    const updated = await sql`
      UPDATE projects SET thumbnail = ${blob.url}, updated_at = now()
      WHERE id = ${row.id} AND thumbnail = ${row.thumbnail}
      RETURNING id
    `;
    report({
      ...row,
      ...file,
      status:
        updated.length === 1
          ? "migrated"
          : "failed (row changed; possible orphan upload)",
      url: blob.url,
    });
  } catch (error) {
    report({
      ...row,
      status: `failed (${error instanceof Error ? error.message : "unknown error"})`,
    });
  }
}

console.log(`Mode: ${apply ? "apply" : "dry-run"}; rows: ${rows.length}`);
