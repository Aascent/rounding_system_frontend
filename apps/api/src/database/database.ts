import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Environment } from "../config/environment.js";

/** Values a parameterised query may bind. */
export type SqlValue = string | number | boolean | null | Date;

/**
 * The narrow database surface the services use: parameterised queries only
 * (`$1`, `$2`, …), so nothing is ever interpolated into SQL.
 */
export interface Database {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<T[]>;
  /** Run several statements (migrations); no parameters. */
  exec(sql: string): Promise<void>;
  /** Run `work` in one transaction; it rolls back if `work` throws. */
  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  readonly engine: "postgres" | "pglite";
}

export const DATABASE = Symbol("DATABASE");

type Queryable = {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
};

function wrap(
  client: Queryable,
  engine: Database["engine"],
  transaction: Database["transaction"],
  close: () => Promise<void>,
): Database {
  return {
    engine,
    async query<T>(sql: string, params: readonly SqlValue[] = []) {
      const result = await client.query(sql, [...params]);
      return result.rows as T[];
    },
    async exec(sql: string) {
      await client.query(sql);
    },
    transaction,
    close,
  };
}

async function connectPostgres(url: string): Promise<Database> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 10 });
  const db: Database = wrap(
    pool,
    "postgres",
    async (work) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const tx = wrap(
          client,
          "postgres",
          (inner) => inner(tx),
          () => Promise.resolve(),
        );
        const result = await work(tx);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    () => pool.end(),
  );
  return db;
}

async function connectPglite(dataDir: string): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  // PGlite creates only the last folder of its data path.
  if (dataDir !== "memory") mkdirSync(dirname(dataDir), { recursive: true });
  const pg = dataDir === "memory" ? new PGlite() : new PGlite(dataDir);
  await pg.waitReady;
  // PGlite runs one connection, so a transaction is the same client with
  // BEGIN/COMMIT around it; calls inside it are already serialised.
  const client: Queryable = {
    query: async (sql, params) =>
      params && params.length
        ? pg.query(sql, params)
        : ((await pg.exec(sql)).at(-1) ?? { rows: [] }),
  };
  let depth = 0;
  const db: Database = wrap(
    client,
    "pglite",
    async (work) => {
      if (depth > 0) return work(db);
      depth += 1;
      await pg.exec("BEGIN");
      try {
        const result = await work(db);
        await pg.exec("COMMIT");
        return result;
      } catch (error) {
        await pg.exec("ROLLBACK");
        throw error;
      } finally {
        depth -= 1;
      }
    },
    () => pg.close(),
  );
  return db;
}

/** Connect to PostgreSQL when `DATABASE_URL` is set, else an embedded PGlite. */
export function connectDatabase(environment: Environment): Promise<Database> {
  return environment.DATABASE_URL
    ? connectPostgres(environment.DATABASE_URL)
    : connectPglite(environment.PGLITE_DATA_DIR);
}
