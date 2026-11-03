import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@smart-rounding/contracts";

export const IS_PUBLIC = "isPublic";
export const REQUIRED_ROLES = "requiredRoles";
export const ALLOWED_BEFORE_PASSWORD_CHANGE = "allowedBeforePasswordChange";
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Reachable while the user still has to replace a temporary password. */
export const AllowedBeforePasswordChange = () =>
  SetMetadata(ALLOWED_BEFORE_PASSWORD_CHANGE, true);
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES, roles);
export const PASSWORD_ATTEMPT = "passwordAttempt";
/** A password is checked here: rate-limited per client and account (see rate-limit.ts). */
export const PasswordAttempt = () => SetMetadata(PASSWORD_ATTEMPT, true);
