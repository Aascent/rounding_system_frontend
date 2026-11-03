import type { ExecutionContext } from "@nestjs/common";
import type { ThrottlerModuleOptions } from "@nestjs/throttler";
import type { Request } from "express";
import { PASSWORD_ATTEMPT } from "../auth/auth.decorators.js";
import { SESSION_COOKIE } from "../auth/auth.service.js";
import { readCookie } from "../auth/cookies.js";
import type { Environment } from "../config/environment.js";

const MINUTE_MS = 60_000;

/**
 * Two in-memory limits (per API instance; a shared store is needed once the
 * API runs on more than one instance):
 * - `default`: every request, per client IP.
 * - `password`: sign-in and password-change attempts, per client IP and
 *   account (the email, or the session for a password change), so guessing
 *   is slowed even before the account lockout kicks in. Only routes marked
 *   `@PasswordAttempt()` count.
 */
export function rateLimitOptions(
  environment: Environment,
): ThrottlerModuleOptions {
  return {
    errorMessage: "Too many requests. Please wait a minute and try again.",
    throttlers: [
      {
        name: "default",
        ttl: MINUTE_MS,
        limit: environment.RATE_LIMIT_PER_MINUTE,
      },
      {
        name: "password",
        ttl: MINUTE_MS,
        limit: environment.PASSWORD_ATTEMPTS_PER_MINUTE,
        skipIf: (context: ExecutionContext) =>
          Reflect.getMetadata(PASSWORD_ATTEMPT, context.getHandler()) !== true,
        getTracker: (request: Record<string, unknown>) => {
          const req = request as unknown as Request;
          const body = req.body as { email?: unknown } | undefined;
          const account =
            typeof body?.email === "string"
              ? body.email.trim().toLowerCase()
              : (readCookie(req.headers.cookie, SESSION_COOKIE) ?? "");
          return `${req.ip ?? ""}|${account}`;
        },
      },
    ],
  };
}
