"use client";

import { AboutSection } from "@/components/common/about-section";
import { BlogPreview } from "@/components/common/blog-preview";
import { HeroSection } from "@/components/common/hero-section";
import { ProjectCard } from "@/components/common/project-card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const projects = [
    {
      title: "bizz buzz",
      category: "Personal Project",
      year: "2023",
      bgColor: "rgb(255, 98, 0)",
      textColor: "rgb(0, 0, 0)",
      href: "/work/bizz-buzz",
    },
    {
      title: "aquaflow",
      category: "Branding and Identity",
      year: "2023",
      bgColor: "rgb(255, 255, 255)",
      textColor: "rgb(31, 0, 255)",
      href: "/work/aquaflow",
    },
    {
      title: "snackify",
      category: "UI/UX",
      year: "2023",
      bgColor: "rgb(46, 53, 56)",
      textColor: "rgb(179, 255, 203)",
      href: "/work/snackify",
    },
    {
      title: "zengo",
      category: "Personal Project",
      year: "2023",
      bgColor: "rgb(255, 221, 0)",
      textColor: "rgb(61, 59, 84)",
      href: "/work/zengo",
    },
    {
      title: "roverride",
      category: "Branding and Identity",
      year: "2023",
      bgColor: "rgb(51, 51, 51)",
      textColor: "rgb(148, 148, 148)",
      href: "/work/roverride",
    },
  ];

  return (
    <main className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <HeroSection />

      {/* Projects Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="flex flex-col gap-48 md:gap-96 lg:gap-144">
          {projects.map((project) => (
            <ProjectCard key={project.href} {...project} />
          ))}
        </div>
      </section>

      {/* About Section */}
      <AboutSection />

      {/* Blog Posts Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="flex flex-col gap-48 md:gap-64 lg:gap-80">
          <div className="flex items-center gap-10">
            <span className="text-small whitespace-nowrap">
              .three latest notes
            </span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="space-y-24 md:space-y-32">
            <BlogPreview
              title="Starting and Growing a Career in Web Design"
              date="Apr 8, 2022"
              href="/blog/starting-career-web-design"
            />
          </div>

          {/* Button Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 items-center">
            <div className="hidden lg:block lg:col-span-5" />
            <div className="lg:col-span-3 flex justify-center md:justify-end">
              <Button href="/blog">visit blog</Button>
            </div>
            <div className="hidden lg:block lg:col-span-4" />
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
    </main>
  );
}
