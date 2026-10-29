import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  SERVICE_VERSION: z.string().min(1).default("development"),
  ALLOWED_ORIGINS: z.string().min(1).default("http://localhost:3000"),
  DATA_MODE: z.enum(["disabled", "synthetic"]).default("disabled"),
  /** `local`: individual accounts stored in the database (until Keycloak). */
  AUTH_MODE: z.enum(["disabled", "local"]).default("disabled"),
  /** PostgreSQL connection string; when unset an embedded PostgreSQL (PGlite) is used. */
  DATABASE_URL: z.string().min(1).optional(),
  /** Where the embedded database keeps its files; "memory" keeps it in RAM. */
  PGLITE_DATA_DIR: z.string().min(1).default("memory"),
  /**
   * Session policy. These are placeholders until the practice decides the
   * session policy (see DEVELOPMENT_TRACKER.md); they are configuration, not
   * code, so changing them needs no release.
   */
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(1).max(720).default(30),
  SESSION_MAX_HOURS: z.coerce.number().int().min(1).max(72).default(12),
  SESSION_REMEMBER_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  /** Lock an account for LOGIN_LOCK_MINUTES after this many failed sign-ins in a row (placeholder policy). */
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  /** Mark the session cookie Secure (on by default outside development). */
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  /**
   * Demo-only credentials for the seeded accounts and the stand-in MFA code.
   * Real MFA comes from Keycloak; the code is accepted only with AUTH_MODE=local.
   */
  SEED_DEMO_PASSWORD: z.string().min(8).default("Demo123!"),
  DEV_MFA_CODE: z
    .string()
    .regex(/^\d{6}$/)
    .default("123456"),
});

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): Environment {
  const result = environmentSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid application configuration: ${fields}`);
  }
  return result.data;
}
