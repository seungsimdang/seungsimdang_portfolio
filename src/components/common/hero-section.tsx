"use client";

import { WordCycler } from "@/components/common/word-cycler";

export function HeroSection() {
  return (
    <section className="w-full max-w-content mx-auto container-padding section-spacing">
      <div className="flex flex-col gap-48 md:gap-80 lg:gap-160">
        {/* Top Meta */}
        <div className="flex items-center justify-center md:justify-start gap-4 md:gap-8">
          <span className="text-small">Hey, I&apos;m Nick</span>
          <div className="relative w-14 h-14 flex-shrink-0">
            <div
              className="absolute w-6 h-6 rounded-full bottom-2 left-1/2 -translate-x-1/2"
              style={{ backgroundColor: "var(--green)" }}
            />
          </div>
          <span className="text-small">available for new projects</span>
        </div>

        {/* Heading with Word Cycler */}
        <div className="relative">
          <div className="w-full">
            <h1 className="text-h1 text-center md:text-left">
              <span className="block mb-8 md:mb-16">
                a product design partner with focus on
              </span>
              <WordCycler
                words={[
                  "no-code websites",
                  "software interfaces",
                  "interactive experiences",
                ]}
                interval={2}
                animationDuration={0.3}
                className="text-h1 block"
              />
            </h1>
          </div>
          <div className="hidden md:block absolute -right-8 md:-right-16 -bottom-8 md:-bottom-16 w-24 h-24 md:w-36 md:h-36 opacity-50">
            <svg
              aria-hidden="true"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <circle cx="18" cy="18" r="18" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
