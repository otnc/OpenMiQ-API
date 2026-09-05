import type { Env } from "../../config/env.ts";
import type { ImageStore } from "./types.ts";
import { createLocalImageStore } from "./local.ts";
import { createR2ImageStore } from "./r2.ts";

export type { ImageStore };

export function createImageStore(env: Env): ImageStore {
  if (env.STORAGE_DRIVER === "r2") {
    return createR2ImageStore({
      accountId: env.R2_ACCOUNT_ID!,
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      bucket: env.R2_BUCKET!,
    });
  }
  return createLocalImageStore(env.STORAGE_LOCAL_DIR);
}
