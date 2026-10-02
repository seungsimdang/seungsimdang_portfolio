"use client";

import { WordCycler } from "@/components/common/word-cycler";
import { profileData } from "@/constants/portfolio-data";

const skills = profileData.skills.join(", ");

export function HeroSection() {
  return (
    <section className="w-full max-w-content mx-auto container-padding section-spacing">
      <div className="flex flex-col gap-48 md:gap-80 lg:gap-160">
        {/* Top Meta */}
        <div className="flex items-center justify-center md:justify-start gap-4 md:gap-8">
          <span className="text-small">{profileData.name}</span>
          <span aria-hidden="true" className="text-small">
            ·
          </span>
          <span className="text-small">{profileData.title}</span>
        </div>

        {/* Heading with Word Cycler */}
        <div className="relative">
          <div className="w-full">
            <h1 className="text-h1 text-center md:text-left">
              <span className="sr-only">
                {profileData.title}: {skills}
              </span>
              <span aria-hidden="true" className="block motion-reduce:hidden">
                <WordCycler
                  words={profileData.skills}
                  interval={2}
                  animationDuration={0.3}
                  className="text-h1 block"
                />
              </span>
              <span
                aria-hidden="true"
                className="hidden motion-reduce:block break-keep"
              >
                {skills}
              </span>
            </h1>
            <p className="text-h3 mt-48 md:mt-64 text-center md:text-left whitespace-pre-line break-keep md:max-w-heading">
              {profileData.tagline}
            </p>
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
