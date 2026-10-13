"use client";

import { WordCycler } from "@/components/common/word-cycler";
import type { Profile } from "@/types/portfolio";

interface HeroSectionProps {
  profile: Pick<Profile, "name" | "title" | "tagline" | "skills">;
}

export function HeroSection({ profile }: HeroSectionProps) {
  const skills = profile.skills.join(", ");
  return (
    <section className="w-full max-w-content mx-auto container-padding section-spacing">
      <div className="flex flex-col gap-48 md:gap-80 lg:gap-160">
        {/* Top Meta */}
        <div className="flex items-center justify-center md:justify-start gap-4 md:gap-8">
          <span className="text-small">{profile.name}</span>
          <span aria-hidden="true" className="text-small">
            ·
          </span>
          <span className="text-small">{profile.title}</span>
        </div>

        {/* Heading with Word Cycler */}
        <div className="relative">
          <div className="w-full">
            <h1 className="text-h1 text-center md:text-left">
              <span className="sr-only">
                {profile.title}: {skills}
              </span>
              <span aria-hidden="true" className="block motion-reduce:hidden">
                <WordCycler
                  words={profile.skills}
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
              {profile.tagline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
