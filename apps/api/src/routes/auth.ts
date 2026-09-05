import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { newSecretToken } from "../lib/ids.ts";
import type { Env } from "../config/env.ts";
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchDiscordUser,
} from "../services/discordOAuthService.ts";
import {
  createSessionToken,
  SESSION_COOKIE,
} from "../services/sessionService.ts";

const OAUTH_STATE_COOKIE = "openmiq_oauth_state";

export function createAuthApp(env: Env) {
  const app = new Hono();

  app.get("/api/auth/discord", (c) => {
    const state = newSecretToken();
    setCookie(c, OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 600,
      path: "/",
    });
    return c.redirect(buildAuthorizationUrl(env, state));
  });

  app.get("/api/auth/discord/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const expectedState = getCookie(c, OAUTH_STATE_COOKIE);
    deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });

    if (!code || !state || !expectedState || state !== expectedState) {
      return c.text("Invalid OAuth state", 400);
    }

    const accessToken = await exchangeCodeForToken(env, code);
    const discordUser = await fetchDiscordUser(accessToken);

    const session = await createSessionToken(env, {
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      email: discordUser.email,
    });
    setCookie(c, SESSION_COOKIE, session, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return c.redirect(env.APP_BASE_URL);
  });

  return app;
}
