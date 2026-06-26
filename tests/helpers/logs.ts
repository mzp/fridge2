import { readFileSync } from "node:fs";
import { TEST_LOG_FILE } from "@/logger.js";

export interface LogEntry {
  msg?: string;
  method?: string;
  path?: string;
  status?: number;
  tool?: string;
  args?: { message?: string };
}

/** Read the structured log lines the app under test wrote to the test log file. */
export function readLogs(): LogEntry[] {
  return readFileSync(TEST_LOG_FILE, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LogEntry);
}
