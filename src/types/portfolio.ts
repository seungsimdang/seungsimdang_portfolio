export interface Profile {
  name: string;
  title: string;
  tagline: string;
  description: string;
  email: string;
  github?: string;
  skills: string[];
}

export interface ExperienceLink {
  label: string;
  url: string;
}

export interface Experience {
  // DB uuid, 렌더 key
  id: string;
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
  // 빈 배열은 undefined로 매핑
  links?: ExperienceLink[];
}

export interface Project {
  // DB uuid, 렌더 key
  id: string;
  // 공개 URL 식별자
  slug: string;
  title: string;
  period: string;
  role: string;
  techStack: string[];
  summary: string;
  // DB null은 undefined로 매핑
  link?: string;
  // DB null은 undefined로 매핑
  thumbnail?: string;
  // sort_order 오름차순
  experiences: Experience[];
}

export interface TechTalk {
  // DB uuid, 렌더 key
  id: string;
  slug: string;
  title: string;
  // "YYYY.MM"
  date: string;
  venue: string;
  description: string;
  impact: string;
  link?: string;
}
