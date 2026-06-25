import { db } from "@/db/index.js";
import { runMigrations } from "@/db/migrate.js";
import { users } from "@/db/schema.js";
import { hashPassword } from "@/lib/password.js";

/**
 * Seed the admin user. There is no signup flow — the account is provisioned here.
 *
 * Name and password both come from the environment (see .env.example), so nothing
 * user-specific is committed. The password is hashed at seed time and only the
 * hash is stored.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in the environment`);
  }
  return value;
}

async function seed() {
  await runMigrations();

  const name = required("SEED_ADMIN_NAME");
  const passwordHash = await hashPassword(required("SEED_ADMIN_PASSWORD"));

  await db
    .insert(users)
    .values({ name, passwordHash })
    .onConflictDoUpdate({ target: users.name, set: { passwordHash } });

  // biome-ignore lint/suspicious/noConsole: seed script output
  console.log(`seeded ${name}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    // biome-ignore lint/suspicious/noConsole: seed script error output
    console.error(err);
    process.exit(1);
  });
