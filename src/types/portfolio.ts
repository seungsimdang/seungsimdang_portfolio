import type { ResumeKind } from "@/constants/resume";

export interface Profile {
  name: string;
  title: string;
  tagline: string;
  description: string;
  email: string;
  // DB 컬럼은 필수이나 읽기 시 http/https가 아닌 값은 제외되어 없을 수 있음
  github?: string;
  skills: string[];
  tools: string[];
}

export interface ResumeEntry {
  // DB uuid, 렌더 key와 API 경로 식별자
  id: string;
  kind: ResumeKind;
  // 입력 원문 그대로, 없으면 ""
  period: string;
  title: string;
  // 없으면 ""
  subtitle: string;
  // 없으면 []
  details: string[];
}

// 모든 kind 키가 항상 존재하며 각 배열은 sort_order, created_at, id 순
export type ResumeByKind = Record<ResumeKind, ResumeEntry[]>;

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
  // 기본(PC) 이미지 목록, 순서가 전환 순서이며 없으면 빈 배열
  thumbnails: string[];
  // 모바일 전용 목록, 비면 표시 계층이 thumbnails를 대신 사용하고 없으면 빈 배열
  mobileThumbnails: string[];
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
