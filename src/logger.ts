import pino from "pino";

const isTest = process.env["NODE_ENV"] === "test" || process.env["VITEST"] !== undefined;
const isProd = process.env["NODE_ENV"] === "production";

const options: pino.LoggerOptions = {
  level: isTest ? "silent" : (process.env["LOG_LEVEL"] ?? "info"),
  serializers: { err: pino.stdSerializers.err },
};

// Pretty, human-readable logs in local dev. Production logs plain JSON to stdout,
// which Render captures (there is no persistent log file — no disk).
if (!isProd && !isTest) {
  options.transport = { target: "pino-pretty" };
}

export const logger = pino(options);
