import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@smart-rounding/contracts";

export const IS_PUBLIC = "isPublic";
export const REQUIRED_ROLES = "requiredRoles";
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: UserRole[]) =>
  SetMetadata(REQUIRED_ROLES, roles);
