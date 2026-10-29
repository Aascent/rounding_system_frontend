import type { Provider } from "@nestjs/common";
import type { Environment } from "../config/environment.js";
import { connectDatabase, DATABASE, type Database } from "./database.js";
import { migrate } from "./migrations.js";
import { seedDemoData } from "./seed.js";

/** Open the database, apply migrations, and seed demo data on first start. */
export async function openDatabase(
  environment: Environment,
): Promise<Database> {
  const db = await connectDatabase(environment);
  await migrate(db);
  if (environment.DATA_MODE === "synthetic")
    await seedDemoData(db, environment.SEED_DEMO_PASSWORD);
  return db;
}

export const databaseProvider: Provider = {
  provide: DATABASE,
  inject: ["ENVIRONMENT"],
  useFactory: (environment: Environment) => openDatabase(environment),
};
