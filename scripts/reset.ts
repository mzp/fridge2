import { sql } from "drizzle-orm";
import { db } from "@/db/index.js";

// Drop everything so `db:reset` can rebuild a clean dev database. The npm script
// runs `db:push` and `db:seed` afterwards. Dev-only — never point this at prod.
if (process.env["NODE_ENV"] === "production") {
  throw new Error("refusing to reset the database in production");
}

await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
await db.execute(sql`CREATE SCHEMA public`);
// drizzle's node-postgres migrator tracks applied migrations in a separate
// `drizzle` schema; drop it too or `db:migrate` would skip on the rebuilt DB.
await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
// biome-ignore lint/suspicious/noConsole: dev script output
console.log("dropped and recreated schema 'public' (and dropped 'drizzle')");
process.exit(0);
