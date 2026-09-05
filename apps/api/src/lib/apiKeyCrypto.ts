import { createHash } from "node:crypto";
import { newSecretToken } from "./ids.ts";

const KEY_PREFIX = "openmiq_";

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKeySecret(): {
  plaintext: string;
  displayPrefix: string;
} {
  const plaintext = `${KEY_PREFIX}${newSecretToken()}`;
  return { plaintext, displayPrefix: plaintext.slice(0, 12) };
}
