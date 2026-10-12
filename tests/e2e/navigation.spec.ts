import { expect, test } from "@playwright/test";
import { profileData } from "./fixtures/portfolio";

for (const [path, heading] of [
  ["/", profileData.title],
  ["/projects", "projects"],
  ["/about", "about"],
  ["/blog", "talks"],
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

test("내비게이션에서 문의 페이지와 연락처 링크를 연다", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "contact", exact: true })
    .click();
  await expect(page).toHaveURL("/contact");
  await expect(
    page.getByRole("link", { name: profileData.email }),
  ).toHaveAttribute("href", `mailto:${profileData.email}`);
  await expect(
    page.getByRole("link", {
      name: profileData.github.replace("https://", ""),
    }),
  ).toHaveAttribute("href", profileData.github);
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
  const [first, ...rest] = profileData.skills;
  await expect(currentWord).toHaveText(first);
  for (const skill of rest)
    await expect(currentWord).toHaveText(skill, { timeout: 6_000 });
});
