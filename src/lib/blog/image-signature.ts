export interface SniffedImage {
  extension: string;
  contentType: string;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

// 파일 앞부분 바이트로 이미지 형식을 판별하며 GIF는 allowGif일 때만 허용
export function sniffImage(
  bytes: Uint8Array,
  allowGif: boolean,
): SniffedImage | undefined {
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
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return { extension: ".webp", contentType: "image/webp" };
  }
  if (
    allowGif &&
    bytes.length >= 6 &&
    (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")
  ) {
    return { extension: ".gif", contentType: "image/gif" };
  }
  return undefined;
}
