import { Hono } from "hono";
import { consentSchema } from "@openmiq/shared";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { requireSession } from "../middleware/session.ts";
import {
  findUserByDiscordId,
  resolveConsoleStatus,
} from "../services/userService.ts";
import { needsReconsent, recordConsent } from "../services/consentService.ts";
import { fetchDiscordUserById } from "../services/discordBotService.ts";
import type { SessionIdentity } from "../services/sessionService.ts";

type Variables = { identity: SessionIdentity | null };

export function createConsoleApp(env: Env) {
  const app = new Hono<{ Variables: Variables }>();
  const db = getDb(env);

  app.get("/api/console/me", requireSession(), async (c) => {
    const identity = c.get("identity");
    if (!identity) return c.json({ error: "unauthorized" }, 401);

    const status = await resolveConsoleStatus(db, identity);
    const user = await findUserByDiscordId(db, identity.discordId);
    const avatarUrl = await fetchDiscordUserById(
      env.DISCORD_BOT_TOKEN,
      identity.discordId,
    )
      .then((discordUser) => discordUser.avatarUrl)
      .catch(() => null);

    return c.json({
      discordId: identity.discordId,
      discordUsername: identity.discordUsername,
      email: identity.email,
      avatarUrl,
      status,
      isAdmin: env.ADMIN_DISCORD_IDS.includes(identity.discordId),
      reconsentRequired: user ? needsReconsent(env, user) : false,
      termsVersion: env.TERMS_VERSION,
      privacyVersion: env.PRIVACY_VERSION,
      agreedTermsVersion: user?.agreedTermsVersion ?? null,
      agreedPrivacyVersion: user?.agreedPrivacyVersion ?? null,
    });
  });

  app.post("/api/console/consent", requireSession(), async (c) => {
    const identity = c.get("identity");
    if (!identity) return c.json({ error: "unauthorized" }, 401);

    const body = await c.req.json().catch(() => null);
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "invalid_request", issues: parsed.error.issues },
        400,
      );
    }
    const { agree, termsVersion, privacyVersion } = parsed.data;

    if (
      !agree ||
      termsVersion !== env.TERMS_VERSION ||
      privacyVersion !== env.PRIVACY_VERSION
    ) {
      return c.json({ status: "not_recorded" });
    }

    const user = await findUserByDiscordId(db, identity.discordId);
    if (!user) return c.json({ error: "not_found" }, 404);

    await recordConsent(db, user.id, termsVersion, privacyVersion);
    return c.json({ status: "recorded" });
  });

  return app;
}
