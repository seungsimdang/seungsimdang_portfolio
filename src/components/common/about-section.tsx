"use client";

import { Button } from "@/components/ui/button";
import { profileData } from "@/constants/portfolio-data";

export function AboutSection() {
  return (
    <section className="w-full max-w-content mx-auto container-padding section-spacing">
      <div className="flex flex-col gap-48 md:gap-64 lg:gap-96">
        <div className="flex flex-col gap-16 md:gap-24 lg:w-2/3">
          <div className="flex items-center gap-10">
            <h2 className="text-small whitespace-nowrap">.about</h2>
            <div className="flex-1 h-px bg-white/25" />
          </div>
          <p className="text-h3 break-keep">{profileData.description}</p>
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

        {/* Button Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 items-center">
          <div className="hidden lg:block lg:col-span-5" />
          <div className="lg:col-span-3 flex justify-center md:justify-end">
            <Button href="/about">about me</Button>
          </div>
          <div className="hidden lg:block lg:col-span-4" />
        </div>
      </div>
    </section>
  );
}
