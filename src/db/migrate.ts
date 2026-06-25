import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db/index.js";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "db/migrations" });
}
