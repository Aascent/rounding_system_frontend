import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { syntheticUsers } from "@smart-rounding/contracts";
import type { Environment } from "../config/environment.js";
import { IS_PUBLIC } from "./auth.decorators.js";
import type { AuthenticatedRequest } from "./auth.types.js";
import type { AuthenticatedPrincipal } from "./auth.types.js";

export function resolveSyntheticPrincipal(
  id: string | undefined,
  environment: Environment,
): AuthenticatedPrincipal {
  if (
    environment.AUTH_MODE !== "synthetic" ||
    environment.DATA_MODE !== "synthetic"
  )
    throw new ServiceUnavailableException(
      "Identity provider is not configured",
    );
  if (!id) throw new UnauthorizedException("Authentication is required");
  const user = syntheticUsers.find(
    (candidate) => candidate.id === id && candidate.status === "ACTIVE",
  );
  if (!user) throw new UnauthorizedException("Authentication is invalid");
  return {
    subject: user.id,
    displayName: user.name,
    role: user.role,
    providerId: user.providerId,
  };
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject("ENVIRONMENT") private readonly environment: Environment,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const id = request.header("x-synthetic-user-id");
    request.principal = resolveSyntheticPrincipal(id, this.environment);
    return true;
  }
}
