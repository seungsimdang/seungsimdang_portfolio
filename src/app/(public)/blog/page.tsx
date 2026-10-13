import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { TalkPreview } from "@/components/common/talk-preview";
import { listTechTalks } from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: "talks",
  alternates: { canonical: "/blog" },
};

export default async function TalkPage() {
  const techTalks = await listTechTalks();
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
    </div>
  );
}
