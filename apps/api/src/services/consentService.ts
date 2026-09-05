import { eq } from "drizzle-orm";
import { users, type Db } from "@openmiq/db";
import type { Env } from "../config/env.ts";

export function needsReconsent(
  env: Pick<Env, "TERMS_VERSION" | "PRIVACY_VERSION">,
  user: {
    agreedTermsVersion: string | null;
    agreedPrivacyVersion: string | null;
  },
): boolean {
  return (
    user.agreedTermsVersion !== env.TERMS_VERSION ||
    user.agreedPrivacyVersion !== env.PRIVACY_VERSION
  );
}

// Re-agreeing just updates the "live" agreement on USER — it never touches
// status, never requires an admin, and (unlike denied/revoked) carries no
// cooldown: the API-key freeze it lifts was never a status change to begin
// with (DESIGN.md §16.4).
export async function recordConsent(
  db: Db,
  userId: string,
  agreedTermsVersion: string,
  agreedPrivacyVersion: string,
): Promise<void> {
  await db
    .update(users)
    .set({ agreedTermsVersion, agreedPrivacyVersion, agreedAt: new Date() })
    .where(eq(users.id, userId));
}
