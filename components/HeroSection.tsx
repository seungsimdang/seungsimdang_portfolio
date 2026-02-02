"use client";

import { WordCycler } from "./WordCycler";

export function HeroSection() {
  return (
    <section className="w-full max-w-[1920px] mx-auto container-padding section-spacing">
      <div className="flex flex-col gap-12 md:gap-20 lg:gap-40">
        {/* Top Meta */}
        <div className="flex items-center justify-center md:justify-start gap-1 md:gap-2">
          <span className="text-small">Hey, I&apos;m Nick</span>
          <div className="relative w-3.5 h-3.5 flex-shrink-0">
            <div
              className="absolute w-1.5 h-1.5 rounded-full bottom-0.5 left-1/2 -translate-x-1/2"
              style={{ backgroundColor: "var(--green)" }}
            />
          </div>
          <span className="text-small">available for new projects</span>
        </div>

        {/* Heading with Word Cycler */}
        <div className="relative">
          <div className="w-full">
            <h1 className="text-h1 text-center md:text-left">
              <span className="block mb-2 md:mb-4">
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
          <div className="hidden md:block absolute -right-2 md:-right-4 -bottom-2 md:-bottom-4 w-6 h-6 md:w-9 md:h-9 opacity-50">
            <svg
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
