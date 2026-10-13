interface ProjectCardTheme {
  bgColor: string;
  textColor: string;
}

// 인접 카드 명도가 번갈아 구분되도록 배치한 팔레트
const PALETTE: readonly ProjectCardTheme[] = [
  { bgColor: "rgb(17, 17, 17)", textColor: "rgb(255, 255, 255)" },
  { bgColor: "rgb(255, 255, 255)", textColor: "rgb(0, 0, 0)" },
  { bgColor: "rgb(179, 255, 203)", textColor: "rgb(0, 0, 0)" },
  { bgColor: "rgb(46, 53, 56)", textColor: "rgb(255, 255, 255)" },
  { bgColor: "rgb(255, 221, 0)", textColor: "rgb(0, 0, 0)" },
];

// 목록 순번(0부터)으로 순환 선택, 팔레트보다 많으면 처음부터 반복
export function getProjectCardTheme(index: number): ProjectCardTheme {
  return PALETTE[index % PALETTE.length];
}
