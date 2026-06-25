import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "@/db/index.js";
import * as schema from "@/db/schema.js";

/**
 * An in-memory Postgres (PGlite) with migrations applied. No Docker needed.
 * The runtime API matches the node-postgres `Db`, so we cast for typing.
 */
export async function createTestDb(): Promise<Db> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "db/migrations" });
  return db as unknown as Db;
}
