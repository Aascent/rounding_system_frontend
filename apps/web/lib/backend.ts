/**
 * Which data source the web app runs on, fixed at build time from
 * API_BASE_URL (see next.config.ts): "api" talks to the NestJS backend and its
 * database; "demo" uses the built-in demo dataset with no server.
 */
export const usesBackend = process.env.NEXT_PUBLIC_BACKEND === "api";
