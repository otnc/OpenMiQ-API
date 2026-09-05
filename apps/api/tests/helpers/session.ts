import type { Env } from "../../src/config/env.ts";
import {
  createSessionToken,
  SESSION_COOKIE,
  type SessionIdentity,
} from "../../src/services/sessionService.ts";

export async function sessionCookieHeader(
  env: Env,
  identity: SessionIdentity,
): Promise<string> {
  const token = await createSessionToken(env, identity);
  return `${SESSION_COOKIE}=${token}`;
}
