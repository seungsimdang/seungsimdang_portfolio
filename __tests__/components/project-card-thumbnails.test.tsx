import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProjectCardThumbnails } from "@/components/common/project-card-thumbnails";

describe("ProjectCardThumbnails 서버 렌더링", () => {
  it("첫 프레임과 대체 텍스트만 초기 HTML에 표시한다", () => {
    const markup = renderToStaticMarkup(
      createElement(ProjectCardThumbnails, {
        images: ["/first.png", "/second.png"],
        title: "테스트 프로젝트",
        sizes: "100vw",
        eagerFirst: true,
        objectTop: false,
      }),
    );

    expect(markup).toContain("url=%2Ffirst.png");
    expect(markup).toContain('alt="테스트 프로젝트 프로젝트 썸네일"');
    expect(markup).not.toContain("/second.png");
  });
});
