import { db } from "@/db/index.js";
import { seedAdmin } from "@/db/seed.js";

// Manual dev seed. Production seeds on startup instead (see src/index.ts).
const name = await seedAdmin(db);
// biome-ignore lint/suspicious/noConsole: dev script output
console.log(name ? `seeded ${name}` : "skipped: SEED_ADMIN_* not set");
process.exit(0);
