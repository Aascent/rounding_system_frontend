import type { SessionResponse, UserRole } from "@smart-rounding/contracts";
import type { Request } from "express";

export type AuthenticatedPrincipal = Readonly<{
  subject: string;
  displayName: string;
  role: UserRole;
  providerId: string | null;
  /** Hash of the session token (never the token itself). */
  sessionId?: string;
}>;

export type AuthenticatedRequest = Request & {
  principal?: AuthenticatedPrincipal;
  session?: SessionResponse;
};
