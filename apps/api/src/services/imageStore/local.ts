import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import type { ImageStore } from "./types.ts";

export function createLocalImageStore(dir: string): ImageStore {
  const pathFor = (id: string) => join(dir, `${id}.png`);

  return {
    async put(id, buffer) {
      await mkdir(dir, { recursive: true });
      await writeFile(pathFor(id), buffer);
    },
    async get(id) {
      try {
        return await readFile(pathFor(id));
      } catch {
        return null;
      }
    },
    async delete(id) {
      await rm(pathFor(id), { force: true });
    },
  };
}
