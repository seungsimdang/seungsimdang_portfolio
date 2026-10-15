import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { profileData } from "./fixtures/portfolio";

try {
  process.loadEnvFile(".env.local");
} catch {
  // E2E credentials are optional outside the local isolated setup.
}

const secret = process.env.NEXTAUTH_SECRET;
const githubId = process.env.ADMIN_GITHUB_ID?.split(",")[0]?.trim();

test("로그인 화면은 360px에서 홈 링크와 GitHub 로그인 동작을 보여 준다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const response = await page.goto("/admin/login");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "admin 로그인" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /홈/ })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(page.getByRole("button", { name: /GitHub/ })).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
});

test.describe("인증된 관리자 화면", () => {
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

  test("관리자 탭 순서와 반응형 헤더를 유지한다", async ({ page }) => {
    for (const width of [360, 768, 810, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto("/admin");
      expect(response?.status()).toBe(200);
      const nav = page.getByRole("navigation", { name: "관리자" });
      await expect(nav.getByRole("link")).toHaveText([
        "home",
        "projects",
        "about",
        "blog",
        "talks",
        "contact",
      ]);
      await expect(nav.getByRole("link", { name: "home" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      const logout = page.getByRole("link", { name: "logout" });
      await expect(logout).toBeVisible();
      expect(
        await nav.evaluate((element) =>
          element.contains(document.querySelector('a[href="/"]')),
        ),
      ).toBe(false);
      expect((await logout.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });

  test("미저장 home 변경은 로그아웃 전에 확인을 요구하고 확인 후 홈으로 이동한다", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.getByLabel("이름").fill("변경하지 않을 QA 이름");
    await page.getByRole("link", { name: "logout" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "머무르기" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("link", { name: "logout" }).click();
    await page.getByRole("button", { name: "이동" }).click();
    await expect(page).toHaveURL("/");
  });

  test("변경 취소는 마지막 저장값으로 폼을 되돌린다", async ({ page }) => {
    await page.goto("/admin");
    const name = page.getByLabel("이름");
    const savedName = await name.inputValue();
    await name.fill("폐기할 변경");
    await page.getByRole("button", { name: "변경 취소" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "변경 취소" }).last().click();
    await expect(name).toHaveValue(savedName);
  });

  test("로그아웃 요청 실패를 토스트로 알리고 현재 화면에 남는다", async ({
    page,
  }) => {
    await page.route("**/api/auth/signout", (route) => route.abort());
    await page.goto("/admin");
    await page.getByRole("link", { name: "logout" }).click();
    await expect(
      page.getByText("로그아웃하지 못했습니다. 다시 시도하세요."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("about 이력 하위 경로에서도 about 탭만 활성화한다", async ({ page }) => {
    await page.goto("/admin/about/resume/new?kind=work");
    const nav = page.getByRole("navigation", { name: "관리자" });
    await expect(nav.getByRole("link", { name: "about" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(nav.getByRole("link", { name: "home" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("1개 항목을 확인하세요.")).toBeVisible();
  });

  test("새 발표 폼의 필수 입력 오류를 실제 폼에서 표시한다", async ({
    page,
  }) => {
    await page.goto("/admin/talks/new");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("7개 항목을 확인하세요.")).toBeVisible();
  });

  test("Markdown 파일을 가져와 글 폼에 제목과 본문을 채운다", async ({
    page,
  }) => {
    await page.goto("/admin/blog/new");
    await page.getByLabel(".md 파일 선택").setInputFiles({
      name: "2025-01-15-qa-import.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(
        "---\ntitle: QA 가져오기\ncategories: [테스트]\ntags: [e2e]\ndate: 2025-01-15\n---\n본문 가져오기 확인",
      ),
    });
    await expect(page.getByLabel("제목")).toHaveValue("QA 가져오기");
    await expect(page.getByLabel("발행일")).toHaveValue("2025.01.15");
    await expect(
      page.getByRole("textbox", { name: "본문 (필수)" }),
    ).toHaveValue("본문 가져오기 확인");
    await expect(
      page.getByText("선택한 파일: 2025-01-15-qa-import.md"),
    ).toBeVisible();
  });

  test("프로젝트 경험 목록은 hydration 오류 없이 표시되고 slug 확인창을 연다", async ({
    page,
  }) => {
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /hydration|did not match|server rendered/i.test(message.text())
      ) {
        hydrationErrors.push(message.text());
      }
    });
    await page.goto("/admin/projects/fixture-alpha");
    await expect(page.getByRole("heading", { name: /경험 \(/ })).toBeVisible();
    expect(hydrationErrors).toEqual([]);
    const slug = page.getByLabel("slug");
    const savedSlug = await slug.inputValue();
    await slug.fill(`${savedSlug}-qa`);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "주소를 바꿀까요?" }),
    ).toBeVisible();
  });

  test("프로필 home 저장 요청은 해당 탭 항목만 전송한다", async ({ page }) => {
    let body: unknown;
    await page.route("**/api/admin/profile", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { id: 1, ...profileData, updatedAt: new Date().toISOString() },
          status: 200,
        }),
      });
    });

    await page.goto("/admin");
    const expected = {
      title: await page.getByLabel("직함").inputValue(),
      tagline: await page.getByLabel("tagline").inputValue(),
      description: await page.getByLabel("소개").inputValue(),
    };
    await page.getByLabel("이름").fill("저장 요청 확인");
    await page.getByRole("button", { name: "저장" }).click();
    await expect
      .poll(() => body)
      .toEqual({
        name: "저장 요청 확인",
        ...expected,
      });
  });

  test("about과 contact 저장 요청은 각 탭 항목만 전송한다", async ({
    page,
  }) => {
    const bodies: unknown[] = [];
    await page.route("**/api/admin/profile", async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { id: 1, ...profileData, updatedAt: new Date().toISOString() },
          status: 200,
        }),
      });
    });

    await page.goto("/admin/about");
    await page.locator('input[name="skills.0.value"]').fill("QA 스킬");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect.poll(() => bodies).toHaveLength(1);
    expect(Object.keys(bodies[0] as object).sort()).toEqual([
      "skills",
      "tools",
    ]);

    await page.goto("/admin/contact");
    await page.getByLabel("이메일").fill("qa@example.com");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect.poll(() => bodies).toHaveLength(2);
    expect(Object.keys(bodies[1] as object).sort()).toEqual([
      "email",
      "github",
    ]);
  });

  test("삭제된 profile과 resume 주소는 404를 반환한다", async ({ page }) => {
    for (const path of ["/admin/profile", "/admin/resume"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    }
  });
});
