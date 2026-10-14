const OWNER_REPOS = new Set([
  "222SeungHyun/222SeungHyun.github.io",
  "seungsimdang/seungsimdang.github.io",
]);

// 자기 저장소 URL이면 저장소 상대 경로(NFC, 퍼센트 디코딩)를 반환하고 아니면 null 반환
// github.com의 blob·raw 경로와 raw.githubusercontent.com을 같은 방식으로 처리함
export function resolveLegacyImage(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  const [owner, repo] = segments;
  if (!owner || !repo || !OWNER_REPOS.has(`${owner}/${repo}`)) return null;

  let pathSegments: string[];
  if (parsed.hostname === "raw.githubusercontent.com") {
    pathSegments = segments.slice(3);
  } else if (
    parsed.hostname === "github.com" &&
    (segments[2] === "blob" || segments[2] === "raw")
  ) {
    pathSegments = segments.slice(4);
  } else {
    return null;
  }
  if (pathSegments.length === 0) return null;

  try {
    const decoded = pathSegments
      .map((segment) => decodeURIComponent(segment).normalize("NFC"))
      .join("/");
    return decoded.split("/").includes("..") ? null : decoded;
  } catch {
    return null;
  }
}
