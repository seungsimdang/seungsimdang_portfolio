import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ProjectCard } from "@/components/common/project-card";
import { getProjectCardTheme } from "@/constants/project-card-theme";
import { listProjects } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: "projects",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="projects" />

      {/* Projects Section */}
      <section className="w-full max-w-content mx-auto container-padding py-40 md:py-48 lg:py-64">
        <div className="space-y-128 md:space-y-160 lg:space-y-192">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-32 items-start"
            >
              <div className="lg:col-span-7">
                <ProjectCard
                  title={project.title}
                  role={project.role}
                  period={project.period}
                  thumbnail={project.thumbnail}
                  href={`/work/${project.slug}`}
                  eager={index === 0}
                  {...getProjectCardTheme(index)}
                  className="h-card lg:h-card-tall"
                />
              </div>
              <div className="lg:col-span-1" />
              <div className="lg:col-span-4 flex flex-col justify-between min-h-project-info">
                <div className="sticky top-128">
                  <p className="text-h3 break-keep mb-32">{project.summary}</p>
                  <div className="flex justify-end">
                    <div className="w-36 h-36 opacity-50">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 36 36"
                        fill="none"
                        className="w-full h-full"
                      >
                        <circle cx="18" cy="18" r="18" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
