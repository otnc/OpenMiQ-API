import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  email: text("email").notNull(),
  status: text("status", {
    enum: ["pending", "approved", "denied", "revoked", "banned"],
  })
    .notNull()
    .default("pending"),
  maxApiKeys: integer("max_api_keys"),
  agreedTermsVersion: text("agreed_terms_version"),
  agreedPrivacyVersion: text("agreed_privacy_version"),
  agreedAt: integer("agreed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  message: text("message").notNull(),
  ip: text("ip").notNull(),
  fingerprint: text("fingerprint").notNull(),
  status: text("status", { enum: ["pending", "approved", "denied"] })
    .notNull()
    .default("pending"),
  discordMessageId: text("discord_message_id"),
  discordChannelId: text("discord_channel_id"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  agreedTermsVersion: text("agreed_terms_version").notNull(),
  agreedPrivacyVersion: text("agreed_privacy_version").notNull(),
  agreedAt: integer("agreed_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  revokedBy: text("revoked_by"),
  requestCount: integer("request_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const bans = sqliteTable("bans", {
  id: text("id").primaryKey(),
  discordId: text("discord_id"),
  email: text("email"),
  ip: text("ip"),
  reason: text("reason").notNull(),
  bannedBy: text("banned_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const adminActions = sqliteTable("admin_actions", {
  id: text("id").primaryKey(),
  actorDiscordId: text("actor_discord_id").notNull(),
  action: text("action", {
    enum: ["approve", "deny", "revoke", "ban", "unban"],
  }).notNull(),
  targetUserId: text("target_user_id").notNull(),
  reason: text("reason"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Fixed-window counter backing hono-rate-limiter, kept in SQLite so counts
// survive a restart without adding an external store (DESIGN.md §5.4).
export const rateLimitCounters = sqliteTable("rate_limit_counters", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
  count: integer("count").notNull().default(0),
});

// Tracks hosted: true image uploads so GET /api/images/:id can answer 404
// without a round trip to R2; actual deletion is left to the bucket's
// lifecycle rule (DESIGN.md §8.6).
export const hostedImages = sqliteTable("hosted_images", {
  id: text("id").primaryKey(),
  storedAt: integer("stored_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});
