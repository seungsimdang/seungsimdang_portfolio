import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import {
  ResumeEntryList,
  ResumeSection,
  TagList,
} from "@/components/common/resume-section";
import type { ResumeKind } from "@/constants/resume";
import {
  getProfile,
  getResumeByKind,
} from "@/services/portfolio/portfolio-service";

export const metadata: Metadata = {
  title: "about",
  alternates: { canonical: "/about" },
};

// 화면 순서: 경력, 스킬, 툴, 이후 학력부터 어학까지
const BEFORE_TAGS: [ResumeKind, string][] = [["work", ".experience"]];
const AFTER_TAGS: [ResumeKind, string][] = [
  ["education", ".education"],
  ["activity", ".activities"],
  ["award", ".award"],
  ["certification", ".certification"],
  ["language", ".language"],
];

export default async function AboutPage() {
  const [profile, resume] = await Promise.all([
    getProfile(),
    getResumeByKind(),
  ]);
  const renderEntries = ([kind, label]: [ResumeKind, string]) =>
    resume[kind].length > 0 && (
      <ResumeSection key={kind} label={label}>
        <ResumeEntryList entries={resume[kind]} />
      </ResumeSection>
    );
  return (
    <div className="w-full min-h-screen bg-black text-white">
      <PageHeader title="about" />

      {BEFORE_TAGS.map(renderEntries)}

      {profile.skills.length > 0 && (
        <ResumeSection label=".stack">
          <TagList tags={profile.skills} />
        </ResumeSection>
      )}

      {profile.tools.length > 0 && (
        <ResumeSection label=".tools">
          <TagList tags={profile.tools} />
        </ResumeSection>
      )}

      {AFTER_TAGS.map(renderEntries)}
    </div>
  );
}
