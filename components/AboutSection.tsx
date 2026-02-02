"use client";

import { Button } from "./Button";

export function AboutSection() {
  return (
    <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
      <div className="flex flex-col gap-12 md:gap-16 lg:gap-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 md:gap-12 items-end">
          {/* Text Content */}
          <div className="md:col-span-1 lg:col-span-5 flex flex-col gap-4 md:gap-6">
            <div className="flex items-center gap-2.5">
              <span className="text-small whitespace-nowrap">.about</span>
              <div className="flex-1 h-px bg-white/25" />
            </div>
            <p className="text-h3">
              my craft is building experiences that bring value to people and
              celebrate function over form. let&apos;s hide the ego and give
              some freedom to creativity and make the first small step changing
              the world to a better place
            </p>
          </div>

          {/* Spacer for desktop */}
          <div className="hidden lg:block lg:col-span-2" />

          {/* Image */}
          <div className="md:col-span-1 lg:col-span-5 relative">
            <div className="relative aspect-[3/4] rounded overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
              {/* Placeholder for image */}
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
                Profile Image
              </div>
            </div>
          </div>
        </div>

        {/* Button Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
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
