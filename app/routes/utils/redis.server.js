// app/utils/redis.server.js
import { createClient } from "redis";
import { log } from "../logger/logger.server";

let redis;

/**
 * Returns singleton Redis client
 */
export function getRedis() {
  if (!redis) {
    log.info("Initializing Redis client", {
      event: "redis.client.init",
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    });
    redis = createClient({
      username: "default",
      password: process.env.REDIS_PASSWORD, // 🔐 move secrets to env
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    });

    redis.on("connect", () => {
      log.info("Redis socket connected", {
        event: "redis.socket.connected",
      });
    });

    redis.on("ready", () => {
      log.info("Redis client ready", {
        event: "redis.client.ready",
      });
    });

    redis.on("connect", () => {
      log.info("Redis socket connected", {
        event: "redis.socket.connected",
      });
    });

    redis.on("ready", () => {
      log.info("Redis client ready", {
        event: "redis.client.ready",
      });
    });

    redis.on("end", () => {
      log.warn("Redis connection closed", {
        event: "redis.client.disconnected",
      });
    });
  }

  return redis;
}

/**
 * Ensures Redis is connected before use
 */
export async function ensureRedisConnected() {
  const client = getRedis();

  if (!client.isOpen) {
    log.info("Connecting to Redis", {
      event: "redis.connect.start",
    });

    await client.connect();

    log.info("Redis connection established", {
      event: "redis.connect.success",
    });
  }

  return client;
}
