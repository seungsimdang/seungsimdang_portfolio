// 날짜 표시용 YYYY-MM-DD -> YYYY.MM.DD
export function formatPostDate(date: string) {
  return date.replaceAll("-", ".");
}
