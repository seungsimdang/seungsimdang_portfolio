import { isServer, QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // hydrate 직후 재요청을 막으려면 0보다 커야 함
        staleTime: 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// 서버는 요청 간 캐시 공유를 피하려고 호출마다 새로 만들고, 브라우저는 하나를 재사용함
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
