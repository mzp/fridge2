import { db } from "@/db/index.js";
import { seedAdmin } from "@/db/seed.js";
import { seedPantry } from "@/db/seed-dev.js";

// Manual dev seed. Production seeds on startup instead (see src/index.ts).
const name = await seedAdmin(db);
const pantry = await seedPantry(db);
// biome-ignore lint/suspicious/noConsole: dev script output
console.log(name ? `seeded ${name} (+${pantry} pantry items)` : "skipped: SEED_ADMIN_* not set");
process.exit(0);
