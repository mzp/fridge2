import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    env: {
      SESSION_SECRET: "test-secret",
    },
    globalSetup: ["./tests/helpers/reset-logs.ts"],
    // `tests/e2e/` is Playwright's (different runner). `fridge/` holds the previous
    // implementation (its own repo); never run either under vitest.
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**", "fridge/**"],
  },
});
