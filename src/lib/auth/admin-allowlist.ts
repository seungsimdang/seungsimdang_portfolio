import "server-only";

// ADMIN_GITHUB_ID는 쉼표 구분 숫자 id, 숫자가 아닌 토큰은 버리고 비어 있으면 전원 거부
function getAdminGithubIds(): readonly string[] {
  return (process.env.ADMIN_GITHUB_ID ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token) => /^\d+$/.test(token));
}

export function isAllowedGithubId(id: string | undefined): boolean {
  if (!id) return false;
  return getAdminGithubIds().includes(id);
}
