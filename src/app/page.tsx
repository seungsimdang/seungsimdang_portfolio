import { AboutSection } from "@/components/common/about-section";
import { BlogPreview } from "@/components/common/blog-preview";
import { HeroSection } from "@/components/common/hero-section";
import { ProjectCard } from "@/components/common/project-card";
import { Button } from "@/components/ui/button";
import { projects, techTalks } from "@/constants/portfolio-data";
import { projectCardTheme } from "@/constants/project-card-theme";

export default function Home() {
  return (
    <main className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <HeroSection />

      {/* Projects Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="flex flex-col gap-48 md:gap-96 lg:gap-144">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              title={project.title}
              role={project.role}
              period={project.period}
              thumbnail={project.thumbnail}
              href={`/work/${project.id}`}
              {...projectCardTheme[project.id]}
            />
          ))}
        </div>
      </section>

      {/* About Section */}
      <AboutSection />

      {/* Talks Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="flex flex-col gap-48 md:gap-64 lg:gap-80">
          <div className="flex items-center gap-10">
            <h2 className="text-small whitespace-nowrap">.talks</h2>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="space-y-24 md:space-y-32">
            {techTalks.map((talk) => (
              <BlogPreview key={talk.id} {...talk} />
            ))}
          </div>

          {/* Button Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 items-center">
            <div className="hidden lg:block lg:col-span-5" />
            <div className="lg:col-span-3 flex justify-center md:justify-end">
              <Button href="/blog">visit talks</Button>
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
