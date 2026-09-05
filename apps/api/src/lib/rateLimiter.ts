import { eq } from "drizzle-orm";
import { rateLimitCounters, type Db } from "@openmiq/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

// Fixed-window counter persisted in SQLite so counts survive a restart
// without an external store like Redis (DESIGN.md §5.4).
export function checkAndIncrement(
  db: Db,
  key: string,
  windowMs: number,
  max: number,
): RateLimitResult {
  const now = Date.now();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(windowStartMs + windowMs);

  const existing = db
    .select()
    .from(rateLimitCounters)
    .where(eq(rateLimitCounters.key, key))
    .get();

  let count: number;
  if (existing && existing.windowStart.getTime() === windowStartMs) {
    count = existing.count + 1;
    db.update(rateLimitCounters)
      .set({ count })
      .where(eq(rateLimitCounters.key, key))
      .run();
  } else {
    count = 1;
    db.insert(rateLimitCounters)
      .values({ key, windowStart, count })
      .onConflictDoUpdate({
        target: rateLimitCounters.key,
        set: { windowStart, count },
      })
      .run();
  }

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt,
    limit: max,
  };
}

// Read-only view of the current window, for usage-reporting endpoints that
// must not themselves count as a consumed request (DESIGN.md §5.4).
export function peek(
  db: Db,
  key: string,
  windowMs: number,
  max: number,
): RateLimitResult {
  const now = Date.now();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const resetAt = new Date(windowStartMs + windowMs);

  const existing = db
    .select()
    .from(rateLimitCounters)
    .where(eq(rateLimitCounters.key, key))
    .get();

  const count =
    existing && existing.windowStart.getTime() === windowStartMs
      ? existing.count
      : 0;

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt,
    limit: max,
  };
}
