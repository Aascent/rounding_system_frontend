import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC } from "./auth.decorators.js";
import { AuthService, SESSION_COOKIE } from "./auth.service.js";
import type { AuthenticatedRequest } from "./auth.types.js";
import { readCookie } from "./cookies.js";

/**
 * Every route is authenticated unless marked `@Public()`. The session comes
 * from the HttpOnly session cookie and is checked against the database on
 * each request (expiry, idle timeout, revocation, account status).
 */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const resolved = await this.auth.resolve(
      readCookie(request.headers.cookie, SESSION_COOKIE),
    );
    request.principal = resolved.principal;
    request.session = resolved.session;
    return true;
  }
}
