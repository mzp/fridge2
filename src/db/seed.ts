import type { Db } from "@/db/index.js";
import { users } from "@/db/schema.js";
import { hashPassword } from "@/lib/password.js";

/**
 * Provision the admin user from SEED_ADMIN_* env vars. There is no signup flow,
 * so this is how accounts come into existence.
 *
 * Idempotent (upsert on name), so it is safe to run on every startup — which is
 * how the account is bootstrapped on hosts without a shell or one-off jobs. The
 * name and password come from the environment and the password is hashed before
 * storage, so no user data or hash is ever committed.
 *
 * Runs in production too (see src/index.ts). Dev/test-only seed data lives in
 * src/db/seed-dev.ts.
 *
 * Returns the seeded name, or null when the env vars are not set.
 */
export async function seedAdmin(db: Db): Promise<string | null> {
  const name = process.env["SEED_ADMIN_NAME"];
  const password = process.env["SEED_ADMIN_PASSWORD"];
  if (!name || !password) {
    return null;
  }

  const passwordHash = await hashPassword(password);
  await db
    .insert(users)
    .values({ name, passwordHash })
    .onConflictDoUpdate({ target: users.name, set: { passwordHash } });

  return name;
}
