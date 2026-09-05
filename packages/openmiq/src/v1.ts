/**
 * The `/api/quote`, `/api/fakequote` and `/api/usage` endpoints — see the
 * OpenMiQ-API repo's docs/DESIGN.md §8. Everything in this file is specific
 * to this contract: the request shape (JSON body with these exact field
 * names) and the two response shapes (raw PNG bytes, or `{ url }` JSON when
 * `options.hosted` was set). `client.ts` only relies on this module
 * exporting `pathFor()`, `buildPayload()`, `parseHostedResult()` and
 * `parseUsageResult()`.
 */
import { OpenMiQApiError } from "./errors.ts";
import type { QuoteData, UsageResult } from "./types.ts";

export const QUOTE_PATH = "/api/quote";
export const FAKEQUOTE_PATH = "/api/fakequote";
export const USAGE_PATH = "/api/usage";

/** `fake` picks the endpoint — it is not a body field the server understands. */
export function pathFor(data: QuoteData): string {
  return data.fake ? FAKEQUOTE_PATH : QUOTE_PATH;
}

export function buildPayload(
  data: QuoteData,
  hosted: boolean,
): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  if (data.color !== null) options.color = data.color;
  if (data.bold !== null) options.bold = data.bold;
  if (data.layout !== null) options.layout = data.layout;
  if (hosted) options.hosted = true;

  const payload: Record<string, unknown> = {
    authorName: data.authorName,
    text: data.text,
  };
  if (data.authorAvatarUrl !== null) {
    payload.authorAvatarUrl = data.authorAvatarUrl;
  }
  if (data.theme !== null) payload.theme = data.theme;
  if (data.font !== null) payload.font = data.font;
  if (Object.keys(options).length > 0) payload.options = options;
  return payload;
}

export interface HostedResult {
  url: string;
}

export function parseHostedResult(
  parsed: unknown,
  endpoint: string,
): HostedResult {
  const body = parsed as { url?: unknown } | null;
  if (typeof body?.url !== "string" || body.url.length === 0) {
    throw new OpenMiQApiError("The API response did not contain a url", {
      endpoint,
      body: parsed,
    });
  }
  return { url: body.url };
}

export function parseUsageResult(
  parsed: unknown,
  endpoint: string,
): UsageResult {
  const body = parsed as Partial<UsageResult> | null;
  if (
    typeof body?.limit !== "number" ||
    typeof body?.remaining !== "number" ||
    typeof body?.resetAt !== "string" ||
    typeof body?.requestCount !== "number"
  ) {
    throw new OpenMiQApiError("The API response was not a usage summary", {
      endpoint,
      body: parsed,
    });
  }
  return {
    limit: body.limit,
    remaining: body.remaining,
    resetAt: body.resetAt,
    requestCount: body.requestCount,
    lastUsedAt: typeof body.lastUsedAt === "string" ? body.lastUsedAt : null,
  };
}
