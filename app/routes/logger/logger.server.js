import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { getContext } from "./requestContext.server";

const isProd = process.env.NODE_ENV === "production";

const transports = [];

if (!isProd && process.env.ENABLE_CONSOLE_LOGS === "true") {
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || "info",
    }),
  );
}

// ⛔ DO NOT use file logs in production on Render
if (!isProd) {
  transports.push(
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "debug",
      maxFiles: "14d",
    }),
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxFiles: "30d",
    }),
  );
}

const baseLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports,
});

export function logger(level, message, meta = {}) {
  const ctx = getContext() || {};
  baseLogger.log(level, message, {
    requestId: ctx.requestId,
    shop: ctx.shop,
    ...meta,
  });
}

export const log = {
  info: (m, meta) => logger("info", m, meta),
  warn: (m, meta) => logger("warn", m, meta),
  error: (m, meta) => logger("error", m, meta),
  debug: (m, meta) => logger("debug", m, meta),
};
