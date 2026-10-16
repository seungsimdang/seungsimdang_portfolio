import {
  fixtureThumbnailUrl,
  fixtureThumbnailUrls,
} from "./fixtures/portfolio";
import { expect, test } from "./fixtures/test";

const projectUrl = "/work/fixture-alpha";
const imageName = "Fixture Alpha 프로젝트 썸네일";

async function currentThumbnail(page: import("@playwright/test").Page) {
  const source = await page
    .locator(`main a[href='${projectUrl}'] img[alt='${imageName}']:visible`)
    .getAttribute("src");
  return source ? new URL(source, page.url()).searchParams.get("url") : null;
}

async function openCard(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const card = page.locator(`main a[href='${projectUrl}']`);
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(`img[alt='${imageName}']:visible`)).toBeVisible();
  return card;
}

test("화면 폭 768px 경계에서 PC와 모바일 썸네일 세트를 바꾼다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCard(page);
  await expect.poll(() => currentThumbnail(page)).toBe(fixtureThumbnailUrl);

  await page.setViewportSize({ width: 767, height: 900 });
  await expect
    .poll(() => currentThumbnail(page), { timeout: 3_000 })
    .toBe(fixtureThumbnailUrls.mobileFirst);

  await page.setViewportSize({ width: 768, height: 900 });
  await expect
    .poll(() => currentThumbnail(page), { timeout: 3_000 })
    .toBe(fixtureThumbnailUrl);
});

test("썸네일 세트가 hydration 경고 없이 현재 이미지 하나만 alt를 노출한다", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const card = await openCard(page);
  await expect(card.locator(`img[alt='${imageName}']:visible`)).toHaveCount(1);
  expect(hydrationErrors).toEqual([]);
});

test("모바일에서는 PC 전용 이미지 요청을 보내지 않는다", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/_next/image") {
      const source = url.searchParams.get("url");
      if (source) requested.push(source);
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openCard(page);
  await expect
    .poll(() => currentThumbnail(page))
    .toBe(fixtureThumbnailUrls.mobileFirst);
  await expect
    .poll(() => requested)
    .toContain(fixtureThumbnailUrls.mobileFirst);
  expect(requested).not.toContain(fixtureThumbnailUrl);
  expect(requested).not.toContain(fixtureThumbnailUrls.desktopSecond);
  expect(requested).not.toContain(fixtureThumbnailUrls.desktopThird);
});

test("화면에 보이는 카드는 4초마다 순환하고 마지막 뒤 첫 장으로 돌아온다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCard(page);
  await expect.poll(() => currentThumbnail(page)).toBe(fixtureThumbnailUrl);
  await expect
    .poll(() => currentThumbnail(page), { timeout: 6_000 })
    .toBe(fixtureThumbnailUrls.desktopSecond);
  await expect
    .poll(() => currentThumbnail(page), { timeout: 6_000 })
    .toBe(fixtureThumbnailUrls.desktopThird);
  await expect
    .poll(() => currentThumbnail(page), { timeout: 6_000 })
    .toBe(fixtureThumbnailUrl);
});

test("다음 이미지가 늦게 로드되면 준비될 때까지 현재 프레임을 유지한다", async ({
  page,
}) => {
  await page.route("**/_next/image**", async (route) => {
    const requested = new URL(route.request().url()).searchParams.get("url");
    if (requested === fixtureThumbnailUrls.desktopSecond) {
      await page.waitForTimeout(5_500);
    }
    await route.fallback();
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCard(page);
  await page.waitForTimeout(4_500);
  await expect.poll(() => currentThumbnail(page)).toBe(fixtureThumbnailUrl);
  await expect
    .poll(() => currentThumbnail(page), { timeout: 4_000 })
    .toBe(fixtureThumbnailUrls.desktopSecond);
});

test("실패한 다음 이미지를 건너뛰고 로드 가능한 프레임으로 전환한다", async ({
  page,
}) => {
  await page.route("**/_next/image**", async (route) => {
    const requested = new URL(route.request().url()).searchParams.get("url");
    if (requested === fixtureThumbnailUrls.desktopSecond) {
      await route.abort();
      return;
    }
    await route.fallback();
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCard(page);
  await expect
    .poll(() => currentThumbnail(page), { timeout: 7_000 })
    .toBe(fixtureThumbnailUrls.desktopThird);
});

test("호버와 키보드 포커스 중에는 자동 전환하지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const card = await openCard(page);
  await card.hover();
  await page.waitForTimeout(4_300);
  await expect.poll(() => currentThumbnail(page)).toBe(fixtureThumbnailUrl);

  await page.mouse.move(0, 0);
  await card.focus();
  await page.waitForTimeout(4_300);
  await expect.poll(() => currentThumbnail(page)).toBe(fixtureThumbnailUrl);
});

test("reduced motion을 사용하면 첫 이미지를 고정한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCard(page);
  await page.waitForTimeout(4_300);
  await expect.poll(() => currentThumbnail(page)).toBe(fixtureThumbnailUrl);
  await expect(
    page.locator(
      `main a[href='${projectUrl}'] img[alt='${imageName}']:visible`,
    ),
  ).toHaveCount(1);
});

test("탭이 숨겨진 동안 전환 횟수를 누적하지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCard(page);
  const setVisibility = (state: "hidden" | "visible") =>
    page.evaluate((visibilityState) => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: visibilityState,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    }, state);
  await setVisibility("hidden");
  await page.waitForTimeout(8_500);
  await expect.poll(() => currentThumbnail(page)).toBe(fixtureThumbnailUrl);
  await setVisibility("visible");
  await expect
    .poll(() => currentThumbnail(page), { timeout: 6_000 })
    .toBe(fixtureThumbnailUrls.desktopSecond);
});
