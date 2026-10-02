import { PageHeader } from "@/components/common/page-header";
import { ProjectCard } from "@/components/common/project-card";
import { Button } from "@/components/ui/button";
import { profileData, projects } from "@/constants/portfolio-data";
import { projectCardTheme } from "@/constants/project-card-theme";

export default function ProjectsPage() {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="projects" />

      {/* Description */}
      <section className="w-full max-w-content mx-auto container-padding">
        <div className="flex justify-center">
          <p className="text-h2 text-center w-full md:w-3/4 break-keep">
            {profileData.description}
          </p>
        </div>
      </section>

      {/* Projects Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-128 md:space-y-160 lg:space-y-192">
          {projects.map((project) => (
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
                  href={`/work/${project.id}`}
                  {...projectCardTheme[project.id]}
                  className="h-[60vh] lg:h-[75vh]"
                />
              </div>
              <div className="lg:col-span-1" />
              <div className="lg:col-span-4 flex flex-col justify-between min-h-project-info">
                <div className="sticky top-128">
                  <p className="text-small opacity-70 mb-32">
                    {project.summary}
                  </p>
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
