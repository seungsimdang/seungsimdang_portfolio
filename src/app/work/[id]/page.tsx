import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ExternalLink } from "@/components/common/external-link";
import { Button } from "@/components/ui/button";
import { profileData, projects } from "@/constants/portfolio-data";
import type { Experience } from "@/types/portfolio";

interface WorkPageProps {
  params: Promise<{ id: string }>;
}

const bodyClassName =
  "text-body whitespace-pre-line break-keep break-words min-w-0";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export async function generateMetadata({
  params,
}: WorkPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = projects.find((item) => item.id === id);
  if (!project) return {};
  return {
    title: `${project.title} | ${profileData.name}`,
    description: project.summary,
    alternates: { canonical: `/work/${id}` },
    openGraph: {
      title: `${project.title} | ${profileData.name}`,
      description: project.summary,
      type: "article",
      locale: "ko_KR",
      url: `/work/${id}`,
      ...(project.thumbnail && { images: [project.thumbnail] }),
    },
  };
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-32 border-b border-white/10 pb-32">
      <h3 className="lg:col-span-3 text-small opacity-50">{label}</h3>
      <div className="lg:col-span-9 min-w-0">{children}</div>
    </div>
  );
}

function TextRow({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <Row label={label}>
      <p className={bodyClassName}>{text}</p>
    </Row>
  );
}

function TradeoffRow({ tradeoff }: { tradeoff: Experience["tradeoff"] }) {
  const items = [
    { term: "advantages", text: tradeoff.advantages },
    { term: "disadvantages", text: tradeoff.disadvantages },
    { term: "rationale", text: tradeoff.rationale },
  ].filter((item) => item.text.trim());
  if (items.length === 0) return null;
  return (
    <Row label=".tradeoff">
      <dl className="space-y-16">
        {items.map((item) => (
          <div key={item.term} className="space-y-4">
            <dt className="text-small opacity-50">{item.term}</dt>
            <dd className={bodyClassName}>{item.text}</dd>
          </div>
        ))}
      </dl>
    </Row>
  );
}

function ExperienceSection({ experience }: { experience: Experience }) {
  return (
    <section className="w-full max-w-content mx-auto container-padding section-spacing">
      <div className="space-y-48 md:space-y-64">
        <h2 className="text-h3 break-keep">{experience.title}</h2>
        <div className="space-y-24 md:space-y-32">
          <TextRow label=".problem" text={experience.problem} />
          <TextRow label=".solution" text={experience.solution} />
          <TradeoffRow tradeoff={experience.tradeoff} />
          <TextRow label=".result" text={experience.result} />
          <TextRow label=".learning" text={experience.learning} />
          {experience.links && experience.links.length > 0 && (
            <Row label=".links">
              <ul className="space-y-8">
                {experience.links.map((link) => (
                  <li key={link.url}>
                    <ExternalLink href={link.url}>{link.label}</ExternalLink>
                  </li>
                ))}
              </ul>
            </Row>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function WorkPage({ params }: WorkPageProps) {
  const { id } = await params;
  const project = projects.find((item) => item.id === id);
  if (!project) notFound();

  return (
    <div className="w-full min-h-screen bg-black text-white">
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-32 md:space-y-48">
          <Link
            href="/projects"
            className="text-small opacity-50 hover:opacity-100 transition-opacity focus-visible:outline-2 focus-visible:outline-white"
          >
            <span aria-hidden="true">← </span>projects
          </Link>
          <h1 className="text-h1 max-w-heading break-keep">{project.title}</h1>
          <p className="flex flex-wrap gap-x-16 text-small opacity-70">
            <span>{project.period}</span>
            <span aria-hidden="true">·</span>
            <span>{project.role}</span>
          </p>
          <p className="text-h3 break-keep">{project.summary}</p>
          {project.techStack.length > 0 && (
            <ul className="flex flex-wrap gap-8">
              {project.techStack.map((tech) => (
                <li
                  key={tech}
                  className="border border-white/25 rounded-full px-16 py-4 text-small"
                >
                  {tech}
                </li>
              ))}
            </ul>
          )}
          {project.link && (
            <div>
              <Button href={project.link} variant="secondary" external>
                visit project
              </Button>
            </div>
          )}
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

      {project.experiences.map((experience) => (
        <ExperienceSection key={experience.title} experience={experience} />
      ))}

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
