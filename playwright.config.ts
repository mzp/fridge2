import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env["CI"];
const port = process.env["PORT"] ? Number(process.env["PORT"]) : 3001;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  // No pixel tolerance: e2e always runs in the same Playwright Docker image, so
  // rendering is deterministic and even small UI changes should fail the snapshot.
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start:e2e",
    url: `${baseURL}/health`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
