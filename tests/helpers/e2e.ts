const PORT = process.env["PORT"] ?? "3001";
const RESET_URL = `http://localhost:${PORT}/__test__/reset`;

/** Clear app data and re-seed the admin, for isolation between E2E tests. */
export async function resetDb(): Promise<void> {
  const res = await fetch(RESET_URL, { method: "POST" });
  if (!res.ok) {
    throw new Error(`reset failed: HTTP ${res.status}`);
  }
}

// Matches the seed values in .env.test.
export const ADMIN_NAME = "admin";
export const ADMIN_PASSWORD = "e2e-password";
