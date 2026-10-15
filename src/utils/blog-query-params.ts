import { POST_LABEL_MAX, POST_SEARCH_MAX } from "@/constants/blog";

// 서버 페이지, Route Handler, 클라이언트가 같은 해석 규칙을 공유해 prefetch key와 클라이언트 key를 일치시킴
// server-only 모듈을 import하지 않으므로 클라이언트 번들에서도 사용 가능함

// 배열이면 첫 값을 쓰고 1-999999 범위의 정수가 아니면 1페이지로 취급함
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1;
}

// 공개와 admin 페이지가 공유하는 category 쿼리 해석 지점
// 배열이면 첫 값을 쓰고 trim 후 NFC로 정규화함
// 빈 값이나 라벨 길이 상한 초과는 필터 없음으로 취급함
export function normalizeCategoryParam(
  raw: string | string[] | undefined,
): string | undefined {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim().normalize("NFC");
  return value && value.length <= POST_LABEL_MAX ? value : undefined;
}

// 배열이면 첫 값을 쓰고 제어문자와 연속 공백을 공백 1개로 축약함
// NUL은 PostgreSQL text 파라미터에서 오류를 내므로 반드시 제거됨
// NFC를 절단보다 먼저 적용해 분해된 입력이 부풀려진 길이로 잘리지 않게 함
// 절단은 코드포인트 기준이라 서로게이트 쌍이 중간에서 잘리지 않음
// 정규화 후 빈 문자열이면 검색 없음(undefined)으로 취급함
export function normalizeSearchQuery(
  raw: string | string[] | null | undefined,
): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const collapsed = value
    // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL 등 제어문자 제거가 목적
    .replace(/[\s\u0000-\u001F\u007F]+/g, " ")
    .normalize("NFC")
    .trim();
  const truncated = Array.from(collapsed)
    .slice(0, POST_SEARCH_MAX)
    .join("")
    .trimEnd();
  return truncated || undefined;
}

// LIKE 메타문자를 문자 그대로 일치시키기 위한 이스케이프
// 역슬래시를 먼저 치환해야 뒤에 붙는 이스케이프 문자가 다시 치환되지 않음
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export interface BlogListParams {
  page: number;
  category?: string;
  q?: string;
}

// URLSearchParams와 ReadonlyURLSearchParams가 모두 만족하는 구조적 타입
// get()은 같은 이름이 여러 개여도 첫 값을 돌려주므로 배열이면 첫 값 규칙과 일치함
export function parseBlogListParams(searchParams: {
  get(name: string): string | null;
}): BlogListParams {
  const category = normalizeCategoryParam(
    searchParams.get("category") ?? undefined,
  );
  const q = normalizeSearchQuery(searchParams.get("q"));
  return {
    page: parsePageParam(searchParams.get("page") ?? undefined),
    ...(category ? { category } : {}),
    ...(q ? { q } : {}),
  };
}

// 서버 페이지의 searchParams(값이 배열일 수 있음)를 클라이언트와 같은 파서로 해석함
// 같은 규칙을 거쳐야 prefetch queryKey가 클라이언트 queryKey와 키 생략 여부까지 일치함
export function parseBlogListSearchParams(
  raw: Record<string, string | string[] | undefined>,
): BlogListParams {
  return parseBlogListParams({
    get(name) {
      const value = raw[name];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  });
}
