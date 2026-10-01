"use client";

import { BlogPreview } from "@/components/common/blog-preview";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

export default function BlogPage() {
  const latestPost = {
    title: "Starting and Growing a Career in Web Design",
    date: "Apr 8, 2022",
    href: "/blog/starting-career-web-design",
  };

  const allPosts = [
    {
      title: "Create a Landing Page That Performs Great",
      date: "Mar 15, 2022",
      href: "/blog/landing-page-performance",
    },
    {
      title: "How to Choose the Right Color Palette",
      date: "Feb 28, 2022",
      href: "/blog/color-palette-guide",
    },
    {
      title: "Typography Best Practices for 2022",
      date: "Feb 10, 2022",
      href: "/blog/typography-best-practices",
    },
    {
      title: "The Ultimate Guide to Responsive Design",
      date: "Jan 25, 2022",
      href: "/blog/responsive-design-guide",
    },
    {
      title: "Mastering CSS Grid Layout",
      date: "Jan 12, 2022",
      href: "/blog/css-grid-mastery",
    },
  ];

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="notes" />

      {/* Latest Post Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-32 md:space-y-40">
          <div className="flex items-center gap-10">
            <span className="text-small whitespace-nowrap">.latest</span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <BlogPreview
            {...latestPost}
            className="border-b-2 border-white/20 pb-48"
          />
        </div>
      </section>

      {/* All Posts Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-32 md:space-y-40">
          <div className="flex items-center gap-10">
            <span className="text-small whitespace-nowrap">.all posts</span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="space-y-24 md:space-y-32">
            {allPosts.map((post) => (
              <BlogPreview key={post.href} {...post} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="text-center py-64 md:py-96 lg:py-128">
          <h2 className="text-h2 mb-24 md:mb-32">Let&apos;s work together</h2>
          <Button href="/contact" variant="primary">
            Get in touch
          </Button>
        </div>
      </section>
    </div>
  );
}
