import type { NextConfig } from "next";

/**
 * When API_BASE_URL is set the web app talks to the NestJS backend: the
 * browser calls same-origin /api/v1/* (so the HttpOnly session cookie is
 * first-party) and Next.js proxies it. Without it the app runs on its
 * built-in demo data, as the static Vercel preview does.
 */
const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BACKEND: apiBaseUrl ? "api" : "demo" },
  async rewrites() {
    return apiBaseUrl
      ? [
          {
            source: "/api/v1/:path*",
            destination: `${apiBaseUrl}/api/v1/:path*`,
          },
        ]
      : [];
  },
  // Standalone output feeds the Cloud Run Dockerfile. Vercel packages the app
  // itself and its build adapter fails on standalone output, so skip it there.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
