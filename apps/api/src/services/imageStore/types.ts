export interface ImageStore {
  put(id: string, buffer: Buffer): Promise<void>;
  get(id: string): Promise<Buffer | null>;
  delete(id: string): Promise<void>;
}
