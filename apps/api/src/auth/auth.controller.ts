import { Controller, Get, Req } from "@nestjs/common";
import type {
  AuthenticatedPrincipal,
  AuthenticatedRequest,
} from "./auth.types.js";

@Controller("auth")
export class AuthController {
  @Get("session") session(
    @Req() request: AuthenticatedRequest,
  ): AuthenticatedPrincipal {
    if (!request.principal) throw new Error("Authenticated principal missing");
    return request.principal;
  }
}
