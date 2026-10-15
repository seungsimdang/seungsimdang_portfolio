import { encode } from "next-auth/jwt";
import { posts } from "./fixtures/portfolio";
import { expect, test } from "./fixtures/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // E2E credentials are optional outside the local isolated setup.
}

const secret = process.env.NEXTAUTH_SECRET;
const githubId = process.env.ADMIN_GITHUB_ID?.split(",")[0]?.trim();
const [first, second, third] = posts;
const SEARCH_API = "**/api/blog/posts*";

async function openBlog(page: import("@playwright/test").Page, url: string) {
  await page.goto(url);
  // 하이드레이션 전 입력은 controlled input에 반영되지 않으므로 네트워크가 잠잠해질 때까지 대기함
  await page.waitForLoadState("networkidle");
}

test("입력 후 300ms가 지나야 URL에 q가 반영되고 page가 제거된다", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/blog/posts")) requests.push(request.url());
  });
  await openBlog(page, "/blog?page=2");
  const input = page.getByRole("searchbox", { name: "블로그 글 검색" });
  await input.pressSequentially("두 번째", { delay: 50 });
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);
  expect(requests).toHaveLength(0);
  await expect(page).toHaveURL(/q=/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("두 번째");
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await expect(page.getByRole("link", { name: second.title })).toBeVisible();
  await expect(page.getByRole("link", { name: first.title })).toHaveCount(0);
  await expect(
    page.getByText('"두 번째" 검색 결과 총 1개 중 1-1번째'),
  ).toBeVisible();
});

test("한글 조합 중에는 URL이 바뀌지 않고 조합이 끝나면 반영된다", async ({
  page,
}) => {
  await openBlog(page, "/blog");
  const input = page.getByRole("searchbox", { name: "블로그 글 검색" });
  await input.focus();
  // 실제 브라우저 IME 조합 이벤트를 만들려고 CDP를 사용함
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.imeSetComposition", {
    text: "ㅅ",
    selectionStart: 1,
    selectionEnd: 1,
  });
  await cdp.send("Input.imeSetComposition", {
    text: "소",
    selectionStart: 1,
    selectionEnd: 1,
  });
  await page.waitForTimeout(700);
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);
  await cdp.send("Input.insertText", { text: "소" });
  await expect(page).toHaveURL(/q=/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("소");
});

test("지우기 버튼과 Esc가 q를 제거하고 category는 유지한다", async ({
  page,
}) => {
  await openBlog(page, "/blog?category=Other&q=%EA%B8%80");
  const input = page.getByRole("searchbox", { name: "블로그 글 검색" });
  await expect(input).toHaveValue("글");
  await page.getByRole("button", { name: "검색어 지우기" }).click();
  await expect(input).toHaveValue("");
  await expect(page).toHaveURL(/category=Other/);
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);
  await input.fill("글");
  await expect(page).toHaveURL(/q=/);
  await input.press("Escape");
  await expect(input).toHaveValue("");
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);
  expect(new URL(page.url()).searchParams.get("category")).toBe("Other");
});

test("카테고리 탭은 q를 유지하고 검색은 category를 유지한다", async ({
  page,
}) => {
  await openBlog(page, "/blog?q=%EA%B8%80");
  const tabs = page.getByRole("navigation", { name: "카테고리" });
  await tabs.getByRole("link", { name: "Other" }).click();
  await expect(page).toHaveURL(/category=Other/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("글");
  await expect(page.getByRole("link", { name: third.title })).toBeVisible();
  await expect(page.getByRole("link", { name: first.title })).toHaveCount(0);
});

test("0건이면 안내 문구와 초기화 링크를 보여 주고 category만 유지한다", async ({
  page,
}) => {
  await openBlog(page, "/blog?category=Other&q=zzzz-no-match");
  await expect(
    page.getByRole("paragraph").filter({
      hasText:
        'Other 카테고리에서 "zzzz-no-match"에 대한 검색 결과가 없습니다.',
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: third.title })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "블로그 페이지" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "검색 초기화" }).click();
  await expect(page).toHaveURL(/\/blog\?category=Other$/);
  await expect(page.getByRole("link", { name: third.title })).toBeVisible();
});

test("로딩 중에는 이전 결과를 유지하고 aria-busy를 표시한다", async ({
  page,
}) => {
  await openBlog(page, "/blog");
  await page.route(SEARCH_API, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  const input = page.getByRole("searchbox", { name: "블로그 글 검색" });
  await input.fill("두 번째");
  await expect(page.locator("ul[aria-busy='true']")).toBeVisible();
  await expect(page.getByRole("link", { name: first.title })).toBeVisible();
  await expect(page.locator("ul[aria-busy='true']")).toHaveCount(0);
  await expect(page.getByRole("link", { name: first.title })).toHaveCount(0);
});

test("뒤로가기는 검색 이전 페이지로 이동한다", async ({ page }) => {
  await page.goto("/about");
  await openBlog(page, "/blog");
  const input = page.getByRole("searchbox", { name: "블로그 글 검색" });
  await input.fill("글");
  await expect(page).toHaveURL(/q=/);
  await page.goBack();
  await expect(page).toHaveURL(/\/about$/);
});

test("검색어가 있을 때만 noindex 메타가 렌더링된다", async ({ request }) => {
  const withQuery = await (await request.get("/blog?q=%EA%B8%80")).text();
  expect(withQuery).toContain('<meta name="robots" content="noindex');
  for (const url of ["/blog", "/blog?q=%20%20"]) {
    const html = await (await request.get(url)).text();
    expect(html).not.toContain('<meta name="robots"');
  }
});

test("첫 HTML에 서버 prefetch된 검색 결과가 포함된다", async ({ request }) => {
  const html = await (
    await request.get("/blog?q=%EB%91%90%20%EB%B2%88%EC%A7%B8")
  ).text();
  expect(html).toContain(second.title);
  expect(html).not.toContain(first.title);
});

test("공개 검색 API는 % 문자를 그대로 검색하고 인증 없는 관리자 API는 401이다", async ({
  request,
}) => {
  const literal = await request.get("/api/blog/posts?q=%25");
  expect((await literal.json()).data.total).toBe(0);
  const array = await request.get("/api/blog/posts?q=%EB%91%90&q=zzz");
  expect((await array.json()).data.total).toBe(1);
  const admin = await request.get("/api/admin/posts?q=x");
  expect(admin.status()).toBe(401);
});

test.describe("인증된 관리자 블로그 검색", () => {
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

  test("관리자 목록도 입력 중 자동 검색과 0건 문구를 보여 준다", async ({
    page,
  }) => {
    await openBlog(page, "/admin/blog");
    const input = page.getByRole("searchbox", { name: "블로그 글 검색" });
    await input.fill("두 번째");
    await expect(page).toHaveURL(/q=/);
    await expect(page.getByRole("link", { name: second.title })).toBeVisible();
    await expect(page.getByRole("link", { name: first.title })).toHaveCount(0);
    await input.fill("zzzz-no-match");
    await expect(
      page.getByRole("paragraph").filter({
        hasText: '"zzzz-no-match"에 대한 검색 결과가 없습니다.',
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "새 글" })).toBeVisible();
  });

  test("인증된 관리자 검색 API는 검색 조건이 적용된 결과를 반환한다", async ({
    context,
  }) => {
    const response = await context.request.get(
      "/api/admin/posts?q=%EB%91%90%20%EB%B2%88%EC%A7%B8",
    );
    expect(response.status()).toBe(200);
    expect((await response.json()).data.total).toBe(1);
  });
});
