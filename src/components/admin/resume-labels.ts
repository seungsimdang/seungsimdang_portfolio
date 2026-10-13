import type { ResumeKind } from "@/constants/resume";

// admin 화면 섹션 순서와 한국어 명사
export const RESUME_ADMIN_SECTIONS: { kind: ResumeKind; noun: string }[] = [
  { kind: "work", noun: "경력" },
  { kind: "education", noun: "학력" },
  { kind: "activity", noun: "활동" },
  { kind: "award", noun: "수상" },
  { kind: "certification", noun: "자격" },
  { kind: "language", noun: "어학" },
];

// kind별 제목과 부제 입력 힌트
export const RESUME_FIELD_HINTS: Record<
  ResumeKind,
  { title: string; subtitle: string }
> = {
  work: { title: "직함", subtitle: "회사명" },
  education: { title: "학교와 학위", subtitle: "학과" },
  activity: { title: "항목명", subtitle: "" },
  award: { title: "항목명", subtitle: "주최 기관" },
  certification: { title: "항목명", subtitle: "" },
  language: { title: "항목명", subtitle: "" },
};
