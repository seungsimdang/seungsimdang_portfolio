import { expect, test } from "@playwright/test";
import {
  profileData,
  projects,
  techTalks,
} from "../../src/constants/portfolio-data";

const siteSuffix = profileData.name;

for (const project of projects) {
  test(`/work/${project.id} 상세가 200이고 h1이 프로젝트 이름이다`, async ({
    page,
  }) => {
    const response = await page.goto(`/work/${project.id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      project.title,
    );
    for (const experience of project.experiences) {
      await expect(
        page.getByRole("heading", { level: 2, name: experience.title }),
      ).toBeVisible();
    }
    // 경험 제목 h2 전체와 하단 CTA h2 1개
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(
      project.experiences.length + 1,
    );
    await expect(page).toHaveTitle(`${project.title} | ${siteSuffix}`);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      new RegExp(`/work/${project.id}$`),
    );
  });
}

for (const path of ["/work/unknown", "/work/kbhc"]) {
  test(`${path} 는 404 화면을 표시한다`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "oops…" })).toBeVisible();
  });
}

for (const path of ["/", "/projects"]) {
  test(`${path} 의 카드 전체가 각 상세 페이지로 연결된다`, async ({ page }) => {
    await page.goto(path);
    const hrefs = await page
      .locator("main a[href^='/work/']")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual(projects.map((project) => `/work/${project.id}`));
  });
}

test("카드를 눌러 상세 페이지로 이동한다", async ({ page }) => {
  await page.goto("/projects");
  const first = projects[0];
  await page.locator(`main a[href='/work/${first.id}']`).click();
  await expect(page).toHaveURL(`/work/${first.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.title);
});

for (const path of ["/work/globber", "/blog", "/contact", "/"]) {
  test(`${path} 의 외부 링크는 새 탭과 noopener noreferrer를 사용한다`, async ({
    page,
  }) => {
    await page.goto(path);
    const rels = await page
      .locator("a[href^='http']")
      .evaluateAll((links) =>
        links.map((a) => [a.getAttribute("target"), a.getAttribute("rel")]),
      );
    expect(rels.length).toBeGreaterThan(0);
    for (const [target, rel] of rels) {
      expect(target).toBe("_blank");
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    }
  });
}

test("/blog 에 talks 항목이 데이터 수만큼 표시되고 링크가 맞다", async ({
  page,
}) => {
  await page.goto("/blog");
  await expect(page.locator("article")).toHaveCount(techTalks.length);
  expect(techTalks).toHaveLength(2);
  for (const talk of techTalks) {
    await expect(
      page.getByRole("heading", { level: 3, name: talk.title }),
    ).toBeVisible();
    await expect(page.locator(`a[href='${talk.link}']`)).toHaveCount(1);
  }
});

test("홈에도 talks 항목이 데이터 수만큼 표시된다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("article")).toHaveCount(techTalks.length);
});

for (const [path, title] of [
  ["/", `${profileData.name} - ${profileData.title}`],
  ["/projects", `projects | ${siteSuffix}`],
  ["/about", `about | ${siteSuffix}`],
  ["/blog", `talks | ${siteSuffix}`],
  ["/contact", `contact | ${siteSuffix}`],
]) {
  test(`${path} 의 title과 canonical이 페이지별로 설정된다`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    const canonical = page.locator("link[rel=canonical]");
    await expect(canonical).toHaveCount(1);
    const href = (await canonical.getAttribute("href")) ?? "";
    expect(new URL(href).pathname).toBe(path);
  });
}
