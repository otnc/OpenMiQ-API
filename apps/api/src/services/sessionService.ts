import { sign, verify } from "hono/jwt";
import type { Env } from "../config/env.ts";

const SESSION_COOKIE = "openmiq_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface SessionIdentity {
  discordId: string;
  discordUsername: string;
  email: string;
}

export interface SessionPayload extends SessionIdentity {
  exp: number;
}

export async function createSessionToken(
  env: Env,
  identity: SessionIdentity,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return sign({ ...identity, exp }, env.SESSION_JWT_SECRET);
}

export async function verifySessionToken(
  env: Env,
  token: string,
): Promise<SessionPayload | null> {
  try {
    const payload = await verify(token, env.SESSION_JWT_SECRET, "HS256");
    if (typeof payload.discordId !== "string") return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
