import { webcrypto } from "node:crypto";

const { subtle } = webcrypto;

// Mirrors discord-interactions' own verifyKey(): a raw Ed25519 keypair,
// signing over `timestamp + body` bytes with the private half so tests can
// produce requests the real verifier accepts using only the public key hex
// (the DISCORD_PUBLIC_KEY value).
export async function generateDiscordKeyPair(): Promise<{
  publicKeyHex: string;
  privateKey: CryptoKey;
}> {
  const { publicKey, privateKey } = (await subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const rawPublicKey = await subtle.exportKey("raw", publicKey);
  const publicKeyHex = Buffer.from(rawPublicKey).toString("hex");
  return { publicKeyHex, privateKey };
}

export async function signInteraction(
  privateKey: CryptoKey,
  timestamp: string,
  body: string,
): Promise<string> {
  const message = Buffer.concat([
    Buffer.from(timestamp, "utf-8"),
    Buffer.from(body, "utf-8"),
  ]);
  const signature = await subtle.sign({ name: "Ed25519" }, privateKey, message);
  return Buffer.from(signature).toString("hex");
}
