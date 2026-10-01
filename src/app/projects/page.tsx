"use client";

import { PageHeader } from "@/components/common/page-header";
import { ProjectCard } from "@/components/common/project-card";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const projects = [
    {
      title: "bizz buzz",
      category: "Personal Project",
      year: "2023",
      bgColor: "rgb(255, 98, 0)",
      textColor: "rgb(0, 0, 0)",
      href: "/work/bizz-buzz",
      description:
        "A social media platform for entrepreneurs to network and collaborate",
    },
    {
      title: "aquaflow",
      category: "Branding and Identity",
      year: "2023",
      bgColor: "rgb(255, 255, 255)",
      textColor: "rgb(31, 0, 255)",
      href: "/work/aquaflow",
      description: "Complete branding solution for a sustainable water company",
    },
    {
      title: "snackify",
      category: "UI/UX",
      year: "2023",
      bgColor: "rgb(46, 53, 56)",
      textColor: "rgb(179, 255, 203)",
      href: "/work/snackify",
      description: "Food delivery app with focus on healthy snacking options",
    },
    {
      title: "zengo",
      category: "Personal Project",
      year: "2023",
      bgColor: "rgb(255, 221, 0)",
      textColor: "rgb(61, 59, 84)",
      href: "/work/zengo",
      description: "Meditation and wellness tracking application",
    },
    {
      title: "roverride",
      category: "Branding and Identity",
      year: "2023",
      bgColor: "rgb(51, 51, 51)",
      textColor: "rgb(148, 148, 148)",
      href: "/work/roverride",
      description: "Premium car service brand identity and digital experience",
    },
  ];

  const clients = [
    "Google",
    "Meta",
    "Apple",
    "Amazon",
    "Microsoft",
    "Netflix",
    "Spotify",
    "Uber",
  ];

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="projects" />

      {/* Description */}
      <section className="w-full max-w-content mx-auto container-padding">
        <div className="flex justify-center">
          <p className="text-h2 text-center w-3/4">
            I help startups and series A-D teams to establish a strong
            connection between their product and customers
          </p>
        </div>
      </section>

      {/* Clients Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-48 md:space-y-64">
          <div className="flex items-center gap-10">
            <span className="text-small whitespace-nowrap">.clients</span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-32 md:gap-48">
            {clients.map((client) => (
              <div
                key={client}
                className="flex items-center justify-center h-64 md:h-80 opacity-50 hover:opacity-100 transition-opacity"
              >
                <span className="text-lg md:text-xl font-medium">{client}</span>
              </div>
            ))}
          </div>

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
      </section>

      {/* Projects Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-128 md:space-y-160 lg:space-y-192">
          {projects.map((project) => (
            <div
              key={project.href}
              className="grid grid-cols-1 lg:grid-cols-12 gap-32 items-start"
            >
              <div className="lg:col-span-7">
                <ProjectCard {...project} className="h-[60vh] lg:h-[75vh]" />
              </div>
              <div className="lg:col-span-1" />
              <div className="lg:col-span-4 flex flex-col justify-between min-h-project-info">
                <div className="sticky top-128">
                  <p className="text-small opacity-70 mb-32">
                    {project.description}
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
