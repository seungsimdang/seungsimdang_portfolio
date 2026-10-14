import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// nonce 없이 정적 생성을 유지하는 정책이며 인라인 스크립트는 'unsafe-inline'으로 허용함
// 분석 스크립트는 운영에서 같은 출처(/_vercel/*)로 로드되며 폰트와 iframe은 쓰지 않음
// 본문 외부 https 이미지는 img-src https:로 허용함
function buildCsp(formAction: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action ${formAction}`,
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_BLOB_HOSTNAME ?? "",
        port: "",
        pathname: "/**",
        search: "",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
      {
        // admin은 아래 규칙이 담당하므로 같은 경로에 CSP가 중복되지 않게 제외함
        source: "/((?!admin(?:/|$)).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildCsp("'self'"),
          },
        ],
      },
      {
        // GitHub OAuth 로그인 폼 전송을 위해 form-action에 github.com을 추가함
        source: "/admin/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildCsp("'self' https://github.com"),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
