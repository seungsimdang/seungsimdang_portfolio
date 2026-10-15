import { isServer, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

// 서버 오류(5xx)는 같은 느린 쿼리를 다시 실행시키므로 재시도하지 않음
// 응답이 없는 네트워크 오류와 시간 초과 등 일시적 실패만 1회 재시도함
function shouldRetry(failureCount: number, error: unknown) {
  if (isAxiosError(error) && (error.response?.status ?? 0) >= 500) return false;
  return failureCount < 1;
}

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // hydrate 직후 재요청을 막으려면 0보다 커야 함
        staleTime: 60_000,
        retry: shouldRetry,
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
