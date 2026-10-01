import { expect, test } from "@playwright/test";

for (const [path, heading] of [
  ["/", "a product design partner with focus on"],
  ["/projects", "projects"],
  ["/about", "about"],
  ["/blog", "notes"],
  ["/contact", "say hello"],
]) {
  test(`${path} 페이지가 정상적으로 표시된다`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      heading,
    );
    await expect(page.getByRole("navigation")).toBeVisible();
  });
}

test("내비게이션에서 문의 페이지와 입력 필드를 연다", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "contact", exact: true })
    .click();
  await expect(page).toHaveURL("/contact");
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
});

test("없는 경로에서 오류 화면과 상태 코드를 표시한다", async ({ page }) => {
  const response = await page.goto("/scaffold-missing-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "oops…" })).toBeVisible();
});

test("첫 화면의 단어가 계속 순환한다", async ({ page }) => {
  await page.goto("/");
  const currentWord = page
    .getByRole("heading", { level: 1 })
    .locator("span[style*=absolute]")
    .first();
  await expect(currentWord).toHaveText("no-code websites");
  await expect(currentWord).toHaveText("software interfaces", {
    timeout: 6_000,
  });
  await expect(currentWord).toHaveText("interactive experiences", {
    timeout: 6_000,
  });
});
