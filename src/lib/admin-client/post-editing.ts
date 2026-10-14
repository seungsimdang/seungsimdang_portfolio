// 서버 시간대와 무관하게 서울 기준 오늘 날짜 YYYY-MM-DD
export function todayInSeoul(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

// 마크다운 이미지 문법을 깨는 문자를 이스케이프
function escapeAlt(alt: string) {
  return alt.replace(/[\\[\]]/g, (char) => `\\${char}`);
}

function escapeUrl(url: string) {
  return url.replace(/[\s()]/g, (char) => encodeURIComponent(char));
}

// position 위치에 이미지 마크다운을 넣고, 줄 중간이면 앞뒤에 줄바꿈을 보강
export function insertImageMarkdown(
  text: string,
  position: number,
  alt: string,
  url: string,
): { text: string; cursor: number } {
  const at = Math.min(Math.max(position, 0), text.length);
  const before = text.slice(0, at);
  const after = text.slice(at);
  const lead = before !== "" && !before.endsWith("\n") ? "\n" : "";
  const tail = after !== "" && !after.startsWith("\n") ? "\n" : "";
  const image = `${lead}![${escapeAlt(alt)}](${escapeUrl(url)})${tail}`;
  return { text: before + image + after, cursor: before.length + image.length };
}
