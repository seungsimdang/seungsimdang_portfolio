import { resolve } from "node:path";
import { test as base, expect } from "@playwright/test";
import { fixtureThumbnailUrl, legacyFixtureThumbnailUrl } from "./portfolio";

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(
      (url) =>
        url.pathname === "/_next/image" &&
        [fixtureThumbnailUrl, legacyFixtureThumbnailUrl].includes(
          url.searchParams.get("url") ?? "",
        ),
      (route) =>
        route.fulfill({
          path: resolve("tests/e2e/fixtures/thumbnail.png"),
        }),
    );
    await use(page);
  },
});
