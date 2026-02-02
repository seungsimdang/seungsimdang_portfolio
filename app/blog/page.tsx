"use client";

import { BlogPreview } from "@/components/BlogPreview";
import { Button } from "@/components/Button";

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
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="flex items-end justify-between">
          <h1 className="text-h1 max-w-[1200px]">notes</h1>
          <div className="w-9 h-9 opacity-50">
            <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
              <circle cx="18" cy="18" r="18" fill="currentColor" />
            </svg>
          </div>
        </div>
      </section>

      {/* Latest Post Section */}
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="space-y-8 md:space-y-10">
          <div className="flex items-center gap-2.5">
            <span className="text-small whitespace-nowrap">.latest</span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <BlogPreview
            {...latestPost}
            className="border-b-2 border-white/20 pb-12"
          />
        </div>
      </section>

      {/* All Posts Section */}
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="space-y-8 md:space-y-10">
          <div className="flex items-center gap-2.5">
            <span className="text-small whitespace-nowrap">.all posts</span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="space-y-6 md:space-y-8">
            {allPosts.map((post, index) => (
              <BlogPreview key={index} {...post} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="text-center py-16 md:py-24 lg:py-32">
          <h2 className="text-h2 mb-6 md:mb-8">Let&apos;s work together</h2>
          <Button href="/contact" variant="primary">
            Get in touch
          </Button>
        </div>
      </section>
    </div>
  );
}
