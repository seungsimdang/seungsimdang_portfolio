import { describe, expect, it } from "vitest";
import { sniffImage } from "@/lib/blog/image-signature";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPG = [0xff, 0xd8, 0xff, 0xe0];
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];
const GIF89 = [...Buffer.from("GIF89a")];
const GIF87 = [...Buffer.from("GIF87a")];

const sniff = (bytes: number[], allowGif: boolean) =>
  sniffImage(new Uint8Array(bytes), allowGif);

describe("sniffImage", () => {
  it.each([
    ["png", PNG, ".png", "image/png"],
    ["jpg", JPG, ".jpg", "image/jpeg"],
    ["webp", WEBP, ".webp", "image/webp"],
  ])("%s 시그니처를 판별한다", (_n, bytes, extension, contentType) => {
    expect(sniff(bytes, false)).toEqual({ extension, contentType });
    expect(sniff(bytes, true)).toEqual({ extension, contentType });
  });

  it("allowGif가 true면 GIF87a와 GIF89a를 허용한다", () => {
    expect(sniff(GIF89, true)).toEqual({
      extension: ".gif",
      contentType: "image/gif",
    });
    expect(sniff(GIF87, true)?.extension).toBe(".gif");
  });

  it("allowGif가 false면 GIF를 거부한다", () => {
    expect(sniff(GIF89, false)).toBeUndefined();
    expect(sniff(GIF87, false)).toBeUndefined();
  });

  it("짧거나 알 수 없는 바이트는 거부한다", () => {
    expect(sniff([], true)).toBeUndefined();
    expect(sniff(PNG.slice(0, 7), true)).toBeUndefined();
    expect(sniff([0xff, 0xd8], true)).toBeUndefined();
    expect(sniff(WEBP.slice(0, 11), true)).toBeUndefined();
    expect(sniff([...Buffer.from("GIF90a")], true)).toBeUndefined();
    expect(
      sniff([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], true),
    ).toBeUndefined();
  });

  it("RIFF지만 WEBP가 아니면 거부한다", () => {
    const wav = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WAVE")];
    expect(sniff(wav, true)).toBeUndefined();
  });
});
