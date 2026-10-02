export interface Experience {
  title: string;
  problem: string;
  solution: string;
  tradeoff: {
    advantages: string;
    disadvantages: string;
    rationale: string;
  };
  result: string;
  learning: string;
  links?: {
    label: string;
    url: string;
  }[];
}

export type ProjectId =
  | "globber"
  | "dpm-core"
  | "semt"
  | "endo-admin"
  | "endo-report";

export interface Project {
  id: ProjectId;
  title: string;
  period: string;
  role: string;
  techStack: string[];
  summary: string;
  link?: string;
  thumbnail?: string;
  experiences: Experience[];
}

export interface TechTalk {
  id: string;
  title: string;
  date: string;
  venue: string;
  description: string;
  impact: string;
  link: string;
}
