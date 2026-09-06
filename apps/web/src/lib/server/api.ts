import { env } from "$env/dynamic/private";
import type { RequestEvent } from "@sveltejs/kit";

function baseUrl(): string {
  return env.API_BASE_URL ?? "http://localhost:9413";
}

// Server-side calls to apps/api forward the browser's own Cookie header, since in production nginx puts both apps on the same origin (DESIGN.md §14.3) and the session cookie set by apps/api is otherwise invisible to SvelteKit's own fetch.
// Also forwards the browser's real IP the same way — this call is apps/web's own server talking to apps/api over loopback, so without this apps/api's getClientIp() would see 127.0.0.1 (apps/web's own address) for every application submitted through it, never the applicant's.
export async function apiFetch(
  event: Pick<RequestEvent, "locals" | "fetch">,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (event.locals.cookie) headers.set("cookie", event.locals.cookie);
  if (event.locals.clientIp) {
    headers.set("x-forwarded-for", event.locals.clientIp);
  }
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return event.fetch(`${baseUrl()}${path}`, { ...init, headers });
}

export async function apiJson<T>(
  event: Pick<RequestEvent, "locals" | "fetch">,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; data: T }> {
  const response = await apiFetch(event, path, init);
  const data = (await response.json().catch(() => null)) as T;
  return { status: response.status, data };
}
