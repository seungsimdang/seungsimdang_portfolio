import type { Metadata } from "next";
import { HeroSection } from "@/components/common/hero-section";
import { ProjectCard } from "@/components/common/project-card";
import { TalkPreview } from "@/components/common/talk-preview";
import { getProjectCardTheme } from "@/constants/project-card-theme";
import {
  getProfile,
  listProjects,
  listTechTalks,
} from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [profile, projects, techTalks] = await Promise.all([
    getProfile(),
    listProjects(),
    listTechTalks(),
  ]);
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <HeroSection profile={profile} />

      {/* Projects Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="flex flex-col gap-48 md:gap-96 lg:gap-144">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              title={project.title}
              role={project.role}
              period={project.period}
              thumbnail={project.thumbnail}
              href={`/work/${project.slug}`}
              eager={index === 0}
              {...getProjectCardTheme(index)}
            />
          ))}
        </div>
      </section>

      {/* Talks Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="flex flex-col gap-48 md:gap-64 lg:gap-80">
          <div className="flex items-center gap-10">
            <h2 className="text-small whitespace-nowrap">.talks</h2>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="space-y-24 md:space-y-32">
            {techTalks.map((talk) => (
              <TalkPreview key={talk.id} {...talk} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
