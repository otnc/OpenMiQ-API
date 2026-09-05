import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { generateCodeVerifier } from "@badgateway/oauth2-client";
import { newSecretToken } from "../lib/ids.ts";
import type { Env } from "../config/env.ts";
import {
  createDiscordOAuthClient,
  redirectUriFor,
  fetchDiscordUser,
} from "../services/discordOAuthService.ts";
import {
  createSessionToken,
  SESSION_COOKIE,
} from "../services/sessionService.ts";

const OAUTH_STATE_COOKIE = "openmiq_oauth_state";
const OAUTH_VERIFIER_COOKIE = "openmiq_oauth_verifier";

export function createAuthApp(env: Env) {
  const app = new Hono();
  const client = createDiscordOAuthClient(env);

  app.get("/api/auth/discord", async (c) => {
    const state = newSecretToken();
    const codeVerifier = await generateCodeVerifier();

    setCookie(c, OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 600,
      path: "/",
    });
    setCookie(c, OAUTH_VERIFIER_COOKIE, codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: 600,
      path: "/",
    });

    const authorizeUri = await client.authorizationCode.getAuthorizeUri({
      redirectUri: redirectUriFor(env),
      state,
      codeVerifier,
      scope: ["identify", "email"],
    });
    return c.redirect(authorizeUri);
  });

  app.get("/api/auth/discord/callback", async (c) => {
    const state = getCookie(c, OAUTH_STATE_COOKIE);
    const codeVerifier = getCookie(c, OAUTH_VERIFIER_COOKIE);
    deleteCookie(c, OAUTH_STATE_COOKIE, { path: "/" });
    deleteCookie(c, OAUTH_VERIFIER_COOKIE, { path: "/" });

    if (!state || !codeVerifier) {
      return c.text("Invalid OAuth state", 400);
    }

    const token = await client.authorizationCode.getTokenFromCodeRedirect(
      c.req.url,
      { redirectUri: redirectUriFor(env), state, codeVerifier },
    );
    const discordUser = await fetchDiscordUser(token.accessToken);

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
