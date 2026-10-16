import { resolve } from "node:path";
import { test as base, expect } from "@playwright/test";
import { fixtureThumbnailUrl, fixtureThumbnailUrls } from "./portfolio";

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    const thumbnails = new Set([
      fixtureThumbnailUrl,
      ...Object.values(fixtureThumbnailUrls),
    ]);
    await page.route(
      (url) =>
        url.pathname === "/_next/image" &&
        thumbnails.has(url.searchParams.get("url") ?? ""),
      (route) =>
        route.fulfill({
          path: resolve("tests/e2e/fixtures/thumbnail.png"),
        }),
    );
    await use(page);
  },
});
