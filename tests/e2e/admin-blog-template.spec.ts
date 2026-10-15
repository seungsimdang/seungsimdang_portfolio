import { readFile } from "node:fs/promises";
import { encode } from "next-auth/jwt";
import { buildPostTemplate } from "../../src/lib/blog/post-template";
import { expect, test } from "./fixtures/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // E2E credentials are optional outside the local isolated setup.
}

const secret = process.env.NEXTAUTH_SECRET;
const githubId = process.env.ADMIN_GITHUB_ID?.split(",")[0]?.trim();

test.describe("관리자 새 글 템플릿 다운로드", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    test.skip(!secret || !githubId, "격리된 관리자 인증 환경 변수가 없음");
    const token = await encode({
      token: { sub: "qa-admin", githubId },
      secret: secret ?? "",
      maxAge: 60 * 60,
    });
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: token,
        url: baseURL ?? "http://127.0.0.1:3100",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  });

  test("템플릿을 내려받아도 폼이 바뀌지 않고, 받은 파일을 가져오면 폼이 채워진다", async ({
    page,
  }, testInfo) => {
    await page.goto("/admin/blog/new");
    const title = page.getByLabel("제목");
    await title.fill("작성 중인 제목");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "템플릿 다운로드" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("blog-post-template.md");

    const path = testInfo.outputPath("blog-post-template.md");
    await download.saveAs(path);
    const text = await readFile(path, "utf8");
    const today = new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    });
    expect(text).toBe(buildPostTemplate(today));
    await expect(title).toHaveValue("작성 중인 제목");

    await page.getByLabel(".md 파일 선택").setInputFiles(path);
    await expect(title).toHaveValue("작성 중인 제목");
    // 작성 중인 값이 있으면 덮어쓰기 확인 창이 먼저 뜸
    await page.getByRole("button", { name: "덮어쓰기" }).click();
    await expect(title).toHaveValue("글 제목을 입력하세요");
    await expect(
      page.getByText("선택한 파일: blog-post-template.md"),
    ).toBeVisible();
  });

  for (const width of [767, 768]) {
    test(`${width}px에서 가로 스크롤이 없고 버튼 레이블이 한 줄이다`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin/blog/new");
      const button = page.getByRole("button", { name: "템플릿 다운로드" });
      await expect(button).toBeVisible();
      // 텍스트 노드의 줄별 사각형 수로 줄 수를 셈(패딩 영향 배제)
      const lineCount = await button.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return new Set(
          Array.from(range.getClientRects()).map((r) => Math.round(r.top)),
        ).size;
      });
      expect(lineCount).toBeLessThanOrEqual(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    });
  }
});
