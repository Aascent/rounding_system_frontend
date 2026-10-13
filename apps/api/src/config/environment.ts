import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  SERVICE_VERSION: z.string().min(1).default("development"),
  ALLOWED_ORIGINS: z.string().min(1).default("http://localhost:3000"),
  DATA_MODE: z.enum(["disabled", "synthetic"]).default("disabled"),
  AUTH_MODE: z.enum(["disabled", "synthetic"]).default("disabled"),
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
