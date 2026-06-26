import { mkdirSync } from "node:fs";
import pino from "pino";

const isTest = process.env["NODE_ENV"] === "test" || process.env["VITEST"] !== undefined;
const isProd = process.env["NODE_ENV"] === "production";

/** Test logs go here (gitignored) — inspect after a run; e2e reads it across processes. */
export const TEST_LOG_FILE = "logs/test.jsonl";

const base: pino.LoggerOptions = {
  level: process.env["LOG_LEVEL"] ?? "info",
  serializers: { err: pino.stdSerializers.err },
};

function build(): pino.Logger {
  if (isTest) {
    mkdirSync("logs", { recursive: true });
    return pino(base, pino.destination({ dest: TEST_LOG_FILE, sync: true, mkdir: true }));
  }
  // Prod: plain JSON to stdout (captured by Render). Dev: pretty-printed to stdout.
  return isProd ? pino(base) : pino({ ...base, transport: { target: "pino-pretty" } });
}

export const logger = build();
