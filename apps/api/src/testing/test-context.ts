import { AdminService } from "../admin/admin.service.js";
import { AuditService } from "../audit/audit.service.js";
import { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { loadEnvironment, type Environment } from "../config/environment.js";
import { RoundingDataService } from "../data/rounding-data.service.js";
import type { Database } from "../database/database.js";
import { openDatabase } from "../database/database.provider.js";
import { ProviderService } from "../provider/provider.service.js";

export type TestContext = Readonly<{
  environment: Environment;
  db: Database;
  audit: AuditService;
  auth: AuthService;
  data: RoundingDataService;
  provider: ProviderService;
  admin: AdminService;
  close(): Promise<void>;
}>;

/** A fresh in-memory database, migrated and seeded, with every service wired. */
export async function createTestContext(
  overrides: Record<string, string> = {},
): Promise<TestContext> {
  const environment = loadEnvironment({
    DATA_MODE: "synthetic",
    AUTH_MODE: "local",
    PGLITE_DATA_DIR: "memory",
    ...overrides,
  });
  const db = await openDatabase(environment);
  const audit = new AuditService(db);
  const auth = new AuthService(db, environment, audit);
  const data = new RoundingDataService(db, environment);
  return {
    environment,
    db,
    audit,
    auth,
    data,
    provider: new ProviderService(environment, db, data, audit),
    admin: new AdminService(environment, db, data, audit, auth),
    close: () => db.close(),
  };
}

const PRINCIPALS: Record<string, AuthenticatedPrincipal> = {
  physician: {
    subject: "user-001",
    displayName: "Dr. Taylor Bennett",
    role: "PHYSICIAN",
    providerId: "provider-001",
  },
  np: {
    subject: "user-002",
    displayName: "Casey Holt",
    role: "NURSE_PRACTITIONER",
    providerId: "provider-002",
  },
  admin: {
    subject: "user-003",
    displayName: "Alex Reyes",
    role: "ADMIN",
    providerId: null,
  },
};

export const principal = (who: "physician" | "np" | "admin") =>
  PRINCIPALS[who]!;
