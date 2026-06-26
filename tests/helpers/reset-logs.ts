import { mkdirSync, writeFileSync } from "node:fs";
import { TEST_LOG_FILE } from "@/logger.js";

/** Vitest globalSetup: start each run with a fresh test log file. */
export default function setup() {
  mkdirSync("logs", { recursive: true });
  writeFileSync(TEST_LOG_FILE, "");
}
