import type { Env } from "../../src/config/env.ts";

// A fully-populated Env for tests, so each test only has to override the
// fields it actually cares about instead of restating every required key.
export function buildTestEnv(overrides: Partial<Env> = {}): Env {
  return {
    DATABASE_URL: "file::memory:",
    SESSION_JWT_SECRET: "test-session-secret",
    DISCORD_CLIENT_ID: "test-client-id",
    DISCORD_CLIENT_SECRET: "test-client-secret",
    DISCORD_PUBLIC_KEY: "0".repeat(64),
    DISCORD_REVIEW_WEBHOOK_URL: "https://discord.test/webhook",
    DISCORD_BOT_TOKEN: "test-bot-token",
    ADMIN_DISCORD_IDS: ["admin-1"],
    APP_BASE_URL: "http://localhost:9413",
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX: 60,
    REAPPLY_COOLDOWN_DAYS: 1,
    MAX_API_KEYS_PER_USER: 10,
    STORAGE_DRIVER: "local",
    STORAGE_LOCAL_DIR: "./data/images",
    TERMS_VERSION: "1",
    PRIVACY_VERSION: "1",
    DEFAULT_LOCALE: "en",
    API_PORT: 9413,
    API_HOST: "0.0.0.0",
    ...overrides,
  };
}
