import axios from "axios";

// 브라우저 전용 인스턴스, 서버 컴포넌트는 상대 baseURL이 동작하지 않아 서비스를 직접 호출함
export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 10_000,
  headers: { Accept: "application/json" },
});
