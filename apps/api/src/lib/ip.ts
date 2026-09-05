import type { Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";

// Only trusts X-Forwarded-For because this app is always deployed behind
// its own nginx reverse proxy (DESIGN.md §14.3), which sets that header.
export function getClientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return getConnInfo(c).remote.address ?? "unknown";
}
