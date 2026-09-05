import { AwsClient } from "aws4fetch";
import type { ImageStore } from "./types.ts";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function createR2ImageStore(config: R2Config): ImageStore {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
  const urlFor = (id: string) => `${endpoint}/${config.bucket}/${id}.png`;

  return {
    async put(id, buffer) {
      const response = await client.fetch(urlFor(id), {
        method: "PUT",
        body: buffer,
        headers: { "Content-Type": "image/png" },
      });
      if (!response.ok) {
        throw new Error(
          `R2 upload failed: HTTP ${response.status} ${await response.text()}`,
        );
      }
    },
    async get(id) {
      const response = await client.fetch(urlFor(id), { method: "GET" });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`R2 download failed: HTTP ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    },
    async delete(id) {
      const response = await client.fetch(urlFor(id), { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error(`R2 delete failed: HTTP ${response.status}`);
      }
    },
  };
}
