import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { profileData } from "@/constants/portfolio-data";

export default function AboutPage() {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="about" />

      {/* Description */}
      <section className="w-full max-w-content mx-auto container-padding">
        <div className="flex justify-center">
          <p className="text-h2 text-center w-full md:w-3/4 whitespace-pre-line break-keep">
            {profileData.tagline}
          </p>
        </div>
      </section>

      {/* About Content Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="lg:w-2/3 space-y-24">
          <div className="flex items-center gap-10">
            <h2 className="text-small whitespace-nowrap">.hello</h2>
            <div className="flex-1 h-px bg-white/25" />
          </div>
          <p className="text-h3 break-keep">{profileData.description}</p>
          <div className="flex justify-end pt-32">
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

      {/* Tools/Stack Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-48 md:space-y-64">
          <div className="flex items-center gap-10">
            <h2 className="text-small whitespace-nowrap">.stack</h2>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-32 md:gap-48">
            {profileData.skills.map((skill) => (
              <li
                key={skill}
                className="flex items-center justify-center p-32 border border-white/10 rounded-lg hover:border-white/30 transition-colors"
              >
                <span className="text-xl font-medium">{skill}</span>
              </li>
            ))}
          </ul>
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
