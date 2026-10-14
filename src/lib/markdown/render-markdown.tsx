import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import Image from "next/image";
import type { ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const schema: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "width", "height"],
    code: [["className", /^language-[A-Za-z0-9_+-]+$/]],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
    href: ["http", "https", "mailto"],
  },
};

// 페이지 h1은 글 제목 하나이므로 본문 제목은 한 단계 낮춤
function heading(level: 2 | 3 | 4 | 5 | 6) {
  const Tag = `h${level}` as const;
  return function Heading({ node: _node, ...props }: Record<string, unknown>) {
    return <Tag {...props} />;
  };
}

const components = {
  pre({ node: _node, ...props }: Record<string, unknown>) {
    // 가로 스크롤 영역은 키보드로 포커스해 스크롤할 수 있어야 함
    // biome-ignore lint/a11y/noNoninteractiveTabindex: 키보드 스크롤을 위한 포커스
    return <pre {...props} tabIndex={0} />;
  },
  table({ node: _node, ...props }: Record<string, unknown>) {
    return (
      <section
        className="table-scroll"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: 키보드 스크롤을 위한 포커스
        tabIndex={0}
        aria-label="표, 가로로 스크롤 가능"
      >
        <table {...props} />
      </section>
    );
  },
  h1: heading(2),
  h2: heading(3),
  h3: heading(4),
  h4: heading(5),
  h5: heading(6),
  a({ node: _node, href, children, ...props }: Record<string, unknown>) {
    const url = typeof href === "string" ? href : undefined;
    const external = url ? /^https?:/i.test(url) : false;
    return (
      <a
        {...props}
        href={url}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children as ReactNode}
      </a>
    );
  },
  img({ node: _node, src, alt }: Record<string, unknown>) {
    const text = typeof alt === "string" ? alt : "";
    if (typeof src !== "string" || !src.startsWith("https://")) {
      return <span>{text}</span>;
    }
    return (
      <Image
        src={src}
        alt={text}
        width={0}
        height={0}
        sizes="100vw"
        unoptimized
      />
    );
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, schema)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true });

// 순서가 보안 경계이므로 rehypeSanitize 뒤에 다른 HTML 삽입 단계를 두지 않음
export function renderMarkdown(source: string): ReactNode {
  try {
    const tree = processor.runSync(processor.parse(source));
    return toJsxRuntime(tree, { Fragment, jsx, jsxs, components });
  } catch {
    return <pre>{source}</pre>;
  }
}
