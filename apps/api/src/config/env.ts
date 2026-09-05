import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./data/db.sqlite"),
  SESSION_JWT_SECRET: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_PUBLIC_KEY: z.string().min(1),
  DISCORD_REVIEW_WEBHOOK_URL: z.url(),
  // Optional — only used to fetch an arbitrary Discord user's profile (the
  // first ADMIN_DISCORD_IDS entry's avatar, for the homepage sample quote)
  // without requiring that user to have logged in first. Everything else in
  // this app avoids a bot on purpose (HTTP Interactions instead of a
  // Gateway connection); this is the one feature that genuinely needs one.
  DISCORD_BOT_TOKEN: z.string().optional(),
  ADMIN_DISCORD_IDS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  APP_BASE_URL: z.url(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  ICON_PATH: z.string().optional(),
  LOGO_PATH: z.string().optional(),
  REAPPLY_COOLDOWN_DAYS: z.coerce.number().int().nonnegative().default(1),
  MAX_API_KEYS_PER_USER: z.coerce.number().int().positive().default(10),
  STORAGE_DRIVER: z.enum(["r2", "local"]).default("r2"),
  STORAGE_LOCAL_DIR: z.string().default("./data/images"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  HOSTED_IMAGE_TTL_HOURS: z.coerce.number().int().positive().optional(),
  TERMS_VERSION: z.string().default("1"),
  PRIVACY_VERSION: z.string().default("1"),
  DEFAULT_LOCALE: z.enum(["en", "ja"]).default("en"),
  // Named API_PORT/API_HOST, not PORT/HOST, because this env file is shared
  // with apps/web (README.md "Configuration") and @sveltejs/adapter-node
  // reads plain PORT/HOST itself — reusing those names here would make the
  // two apps fight over one value.
  API_PORT: z.coerce.number().int().positive().default(9413),
  API_HOST: z.string().default("0.0.0.0"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // A key present in .env but left blank (e.g. `HOSTED_IMAGE_TTL_HOURS=`)
  // means "unset", not the empty string — without this, z.coerce.number()
  // would turn "" into 0 and fail validation instead of falling through to
  // the field's own default/optional handling.
  const normalized = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ""),
  );
  const parsed = envSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  if (parsed.data.STORAGE_DRIVER === "r2") {
    const missing = (
      [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET",
      ] as const
    ).filter((key) => !parsed.data[key]);
    if (missing.length > 0) {
      throw new Error(
        `STORAGE_DRIVER=r2 requires ${missing.join(", ")} to be set`,
      );
    }
  }
  return parsed.data;
}
