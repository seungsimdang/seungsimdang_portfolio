import { PageHeader } from "@/components/common/page-header";
import { TalkPreview } from "@/components/common/talk-preview";
import { Button } from "@/components/ui/button";
import { techTalks } from "@/constants/portfolio-data";

export default function TalkPage() {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="talks" />

      {/* Talks Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-32 md:space-y-40">
          <div className="flex items-center gap-10">
            <h2 className="text-small whitespace-nowrap">.talks</h2>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <div className="space-y-24 md:space-y-32">
            {techTalks.map((talk) => (
              <TalkPreview key={talk.id} {...talk} detailed />
            ))}
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
    </div>
  );
}
