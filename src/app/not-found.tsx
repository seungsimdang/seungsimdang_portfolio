import { PageHeader } from "@/components/common/page-header";
import { PublicShell } from "@/components/layout/public-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="w-full bg-black text-white">
        {/* Hero Section */}
        <PageHeader title="oops…" />

        {/* 404 Display */}
        <section className="w-full max-w-content mx-auto container-padding section-spacing">
          <div className="flex items-center justify-center gap-16 md:gap-32">
            <span className="text-h1">4</span>
            <span className="text-h1">0</span>
            <span className="text-h1">4</span>
          </div>
        </section>

        {/* Message */}
        <section className="w-full max-w-content mx-auto container-padding">
          <div className="flex justify-center">
            <p className="text-h3 text-center max-w-2xl opacity-70">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
          </div>
        </section>

        {/* Button Section */}
        <section className="w-full max-w-content mx-auto container-padding section-spacing">
          <div className="flex justify-center">
            <Button href="/">back to homepage</Button>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
