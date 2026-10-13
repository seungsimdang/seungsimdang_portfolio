export const RESUME_KINDS = [
  "work",
  "education",
  "activity",
  "award",
  "certification",
  "language",
] as const;

export type ResumeKind = (typeof RESUME_KINDS)[number];
