import type { Profile } from "@/types/portfolio";

interface AboutSectionProps {
  profile: Pick<Profile, "description">;
}

export function AboutSection({ profile }: AboutSectionProps) {
  return (
    <section className="w-full max-w-content mx-auto container-padding section-spacing">
      <div className="flex flex-col gap-16 md:gap-24 lg:w-2/3">
        <div className="flex items-center gap-10">
          <h2 className="text-small whitespace-nowrap">.about</h2>
          <div className="flex-1 h-px bg-white/25" />
        </div>
        <p className="text-h3 break-keep">{profile.description}</p>
      </div>
    </section>
  );
}
