"use client";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="oops…" />

      {/* 404 Display */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="relative flex items-center justify-center">
          <div className="flex items-center justify-center gap-16 md:gap-32">
            <span className="text-h1">4</span>
            <span className="text-h1">0</span>
            <span className="text-h1">4</span>
          </div>
          <div className="absolute -bottom-32 -right-32 w-36 h-36 opacity-50">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="hidden lg:block lg:col-span-5" />
          <div className="lg:col-span-3 flex justify-center lg:justify-end">
            <Button href="/">back to homepage</Button>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
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
    </div>
  );
}
