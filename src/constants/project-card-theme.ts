import type { ProjectId } from "@/types/portfolio";

interface ProjectCardTheme {
  bgColor: string;
  textColor: string;
}

// 프로젝트 id별 카드 배경과 글자색 (인접 카드 명도가 번갈아 구분되도록 배치)
export const projectCardTheme: Record<ProjectId, ProjectCardTheme> = {
  globber: { bgColor: "rgb(17, 17, 17)", textColor: "rgb(255, 255, 255)" },
  "dpm-core": { bgColor: "rgb(255, 255, 255)", textColor: "rgb(0, 0, 0)" },
  semt: { bgColor: "rgb(179, 255, 203)", textColor: "rgb(0, 0, 0)" },
  "endo-admin": { bgColor: "rgb(46, 53, 56)", textColor: "rgb(255, 255, 255)" },
  "endo-report": { bgColor: "rgb(255, 221, 0)", textColor: "rgb(0, 0, 0)" },
};
