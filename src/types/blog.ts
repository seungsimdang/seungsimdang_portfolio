export interface PostSummary {
  slug: string;
  title: string;
  publishedAt: string; // "YYYY-MM-DD"
  categories: string[];
  tags: string[];
}

export interface Post extends PostSummary {
  content: string; // 마크다운 원문
}

export interface PostPage {
  items: PostSummary[]; // content 제외
  total: number; // 필터 적용 후 전체 개수
  page: number; // 보정된 현재 페이지 (1 이상)
  pageSize: number;
  totalPages: number; // 최소 1
}

export interface PostCategory {
  name: string;
  count: number; // 전체 글 기준
}

interface PostLink {
  slug: string;
  title: string;
}

export interface PostNeighbors {
  older: PostLink | null; // 더 오래된 글, 목록에서 뒤쪽
  newer: PostLink | null; // 더 최신 글, 목록에서 앞쪽
}
