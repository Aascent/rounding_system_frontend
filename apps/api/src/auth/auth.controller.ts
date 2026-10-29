import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  loginRequestSchema,
  type SessionResponse,
} from "@smart-rounding/contracts";
import type { Response } from "express";
import type { Environment } from "../config/environment.js";
import { Public } from "./auth.decorators.js";
import { AuthService, SESSION_COOKIE } from "./auth.service.js";
import type { AuthenticatedRequest } from "./auth.types.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject("ENVIRONMENT") private readonly environment: Environment,
  ) {}

  private cookieOptions(maxAgeMs: number | null) {
    return {
      httpOnly: true,
      sameSite: "lax" as const,
      secure:
        this.environment.COOKIE_SECURE ??
        this.environment.NODE_ENV === "production",
      path: "/",
      // "Remember me" keeps the cookie across browser restarts; otherwise it
      // is a session cookie that ends when the browser closes.
      ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
    };
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionResponse> {
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        "Enter your email, password, and 6-digit MFA code.",
      );
    const result = await this.auth.login(parsed.data, {
      ip: request.ip ?? null,
      userAgent: request.header("user-agent") ?? null,
    });
    response.cookie(
      SESSION_COOKIE,
      result.token,
      this.cookieOptions(result.maxAgeMs),
    );
    return result.session;
  }

  /** The current session; calling it counts as activity. */
  @Get("session")
  session(@Req() request: AuthenticatedRequest): SessionResponse {
    if (!request.session) throw new Error("Authenticated session missing");
    return request.session;
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    if (request.principal)
      await this.auth.logout(request.principal, { ip: request.ip ?? null });
    response.clearCookie(SESSION_COOKIE, { path: "/" });
  }
}
