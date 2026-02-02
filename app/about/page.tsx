"use client";

import { Button } from "@/components/Button";

export default function AboutPage() {
  const experience = [
    {
      period: "2021 — Now",
      company: "LMN Technologies",
      position: "Principal Product Designer",
      description: "Spearhead the design direction and strategy for a range of cutting-edge products.",
    },
    {
      period: "2019 — 2021",
      company: "EFG Solutions",
      position: "Product Design Manager",
      description: "Managed a team of designers and coordinated design projects across multiple products.",
    },
    {
      period: "2017 — 2019",
      company: "PQR Innovations",
      position: "Lead Product Designer",
      description: "Oversaw the entire product design lifecycle from concept to production.",
    },
    {
      period: "2015 — 2017",
      company: "XYZ Design Studio",
      position: "Senior Product Designer",
      description: "Led a team of designers in creating visually appealing and functional product designs.",
    },
    {
      period: "2012 — 2015",
      company: "ABC Corporation",
      position: "Product Designer",
      description: "Collaborated with cross-functional teams to design and develop innovative products.",
    },
  ];

  const tools = [
    { name: "Framer", category: "web design" },
    { name: "Procreate", category: "illustration" },
    { name: "Figma", category: "product design" },
    { name: "Notion", category: "productivity" },
    { name: "PSN", category: "fun" },
    { name: "Zapier", category: "automation" },
    { name: "SoundCloud", category: "podcasting" },
    { name: "Swift", category: "math" },
    { name: "Mailchimp", category: "email marketing" },
  ];

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="flex items-end justify-between">
          <h1 className="text-h1 max-w-[1200px]">about</h1>
          <div className="w-9 h-9 opacity-50">
            <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
              <circle cx="18" cy="18" r="18" fill="currentColor" />
            </svg>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="w-full max-w-[1920px] mx-auto container-padding">
        <div className="flex justify-center">
          <p className="text-h2 text-center w-3/4">
            i&apos;m a designer, maker, nomad, and coffee lover obsessed with the
            world of digital
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="text-small whitespace-nowrap">.experience</span>
              <div className="flex-1 h-px bg-white/25" />
            </div>
            <p className="text-h3">12 years</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="text-small whitespace-nowrap">.location</span>
              <div className="flex-1 h-px bg-white/25" />
            </div>
            <p className="text-h3">Palo Alto (PST)</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="text-small whitespace-nowrap">.freelance</span>
              <div className="flex-1 h-px bg-white/25" />
            </div>
            <p className="text-h3">Available</p>
          </div>
        </div>
      </section>

      {/* About Content Section */}
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-end">
          {/* Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[3/4] rounded overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                Profile Image
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="hidden lg:block lg:col-span-1" />

          {/* Text Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="text-small whitespace-nowrap">.hello</span>
              <div className="flex-1 h-px bg-white/25" />
            </div>
            <p className="text-h3">
              my craft is building experiences that bring value to people and
              celebrate function over form. let&apos;s hide the ego and give some
              freedom to creativity and make the first small step changing the
              world to a better place
            </p>
            <div className="flex justify-end pt-8">
              <div className="w-9 h-9 opacity-50">
                <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
                  <circle cx="18" cy="18" r="18" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Work Experience Section */}
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="space-y-12 md:space-y-16">
          <div className="flex items-center gap-2.5">
            <span className="text-small whitespace-nowrap">.work experience</span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="space-y-8 md:space-y-12">
            {experience.map((job, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 pb-8 border-b border-white/10"
              >
                <div className="md:col-span-3">
                  <p className="text-small opacity-50">{job.period}</p>
                </div>
                <div className="md:col-span-9 space-y-2">
                  <h3 className="text-xl md:text-2xl font-medium">{job.company}</h3>
                  <p className="text-lg opacity-70">{job.position}</p>
                  <p className="text-small opacity-50">{job.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools/Stack Section */}
      <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
        <div className="space-y-12 md:space-y-16">
          <div className="flex items-center gap-2.5">
            <span className="text-small whitespace-nowrap">.stack</span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {tools.map((tool, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center p-8 border border-white/10 rounded-lg hover:border-white/30 transition-colors"
              >
                <h4 className="text-xl font-medium mb-2">{tool.name}</h4>
                <p className="text-small opacity-50">{tool.category}</p>
              </div>
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
