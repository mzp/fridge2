import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    env: {
      SESSION_SECRET: "test-secret",
    },
    // `fridge/` holds the previous implementation (its own repo); never test it.
    exclude: ["**/node_modules/**", "**/dist/**", "fridge/**"],
  },
});
