import { posts } from "./fixtures/portfolio";
import { expect, test } from "./fixtures/test";

const [first, second, third] = posts;

test("/blog 목록이 카테고리 탭과 글 링크를 보여 준다", async ({ page }) => {
  const response = await page.goto("/blog");
  expect(response?.status()).toBe(200);
  const tabs = page.getByRole("navigation", { name: "카테고리" });
  await expect(tabs.getByRole("link", { name: "전체" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const post of posts) {
    await expect(page.getByRole("link", { name: post.title })).toBeVisible();
  }
});

test("카테고리 탭이 해당 카테고리 글만 걸러 내고 전체로 돌아온다", async ({
  page,
}) => {
  await page.goto("/blog");
  const tabs = page.getByRole("navigation", { name: "카테고리" });
  await tabs.getByRole("link", { name: "Other" }).click();
  await expect(page).toHaveURL(/category=Other/);
  await expect(tabs.getByRole("link", { name: "Other" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("link", { name: second.title })).toBeVisible();
  await expect(page.getByRole("link", { name: third.title })).toBeVisible();
  await expect(page.getByRole("link", { name: first.title })).toHaveCount(0);
  await tabs.getByRole("link", { name: "전체" }).click();
  await expect(page.getByRole("link", { name: first.title })).toBeVisible();
});

test("글 상세에는 상단 목록 링크만 있고 하단 목록 링크가 없다", async ({
  page,
}) => {
  const response = await page.goto(`/blog/${first.slug}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.title);
  await expect(page.getByRole("link", { name: "blog 목록으로" })).toHaveCount(
    1,
  );
});

test("중간 글은 이전(더 오래된)과 다음(더 최신) 글 링크를 둘 다 가진다", async ({
  page,
}) => {
  await page.goto(`/blog/${second.slug}`);
  const nav = page.getByRole("navigation", { name: "이전·다음 글" });
  await expect(nav.getByRole("link", { name: /이전 글/ })).toHaveAttribute(
    "href",
    `/blog/${encodeURIComponent(third.slug)}`,
  );
  await expect(nav.getByRole("link", { name: /다음 글/ })).toHaveAttribute(
    "href",
    `/blog/${first.slug}`,
  );
});

test("가장 최신 글은 다음 글 링크가 없다", async ({ page }) => {
  await page.goto(`/blog/${first.slug}`);
  const nav = page.getByRole("navigation", { name: "이전·다음 글" });
  await expect(nav.getByRole("link", { name: /다음 글/ })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /이전 글/ })).toHaveCount(1);
});

test("이전 글 링크를 누르면 해당 글로 이동한다", async ({ page }) => {
  await page.goto(`/blog/${second.slug}`);
  await page.getByRole("link", { name: /이전 글/ }).click();
  await expect(page).toHaveURL(
    new RegExp(`/blog/${encodeURIComponent(third.slug)}$`),
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(third.title);
});

test("없는 글 주소는 404를 반환한다", async ({ page }) => {
  const response = await page.goto("/blog/no-such-post-slug");
  expect(response?.status()).toBe(404);
});
