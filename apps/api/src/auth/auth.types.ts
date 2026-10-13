import type { UserRole } from "@smart-rounding/contracts";
import type { Request } from "express";

export type AuthenticatedPrincipal = Readonly<{
  subject: string;
  displayName: string;
  role: UserRole;
  providerId: string | null;
}>;

export type AuthenticatedRequest = Request & {
  principal?: AuthenticatedPrincipal;
};
