import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types.ts";
import { apiFetch } from "$lib/server/api.ts";

export interface PlaygroundResult {
  requestJson: string;
  status: number;
  imageDataUrl?: string;
  error?: unknown;
}

// Forwards the body the client already built and showed as the "request JSON" preview to POST /api/quote or /api/fakequote, then relays back the image bytes as a data: URL (form actions can only return serializable data, not a raw Response) or an error body untouched.
//
// `options.hosted` is always stripped before forwarding, no matter what the client sent — the playground exists for people to freely experiment, including with API keys that aren't rate-limited the way a stranger's would be, so letting it write to R2/local storage would make it a trivial way to fill that storage with spam images. Forcing every playground request through the one-round-trip path (no server-side copy ever made, so there's never anything to fetch a `hosted: true` response's URL back down as image bytes for) closes that off entirely, not just in the UI.
function stripHosted(requestJson: string): string {
  let body: unknown;
  try {
    body = JSON.parse(requestJson);
  } catch {
    return requestJson;
  }
  if (body && typeof body === "object" && "options" in body) {
    const options = (body as { options?: unknown }).options;
    if (options && typeof options === "object" && "hosted" in options) {
      delete (options as { hosted?: unknown }).hosted;
    }
  }
  return JSON.stringify(body);
}

export const actions: Actions = {
  send: async (event) => {
    const form = await event.request.formData();
    const apiKey = String(form.get("apiKey") ?? "");
    const fake = form.get("fake") === "true";
    const requestJson = stripHosted(String(form.get("requestJson") ?? ""));

    if (!apiKey) {
      return fail(400, {
        requestJson,
        status: 400,
        error: { error: "api_key_required" },
      } satisfies PlaygroundResult);
    }

    const path = fake ? "/api/fakequote" : "/api/quote";
    const response = await apiFetch(event, path, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: requestJson,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "unknown_error" }));
      const result: PlaygroundResult = {
        requestJson,
        status: response.status,
        error,
      };
      return result;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const result: PlaygroundResult = {
      requestJson,
      status: response.status,
      imageDataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    };
    return result;
  },
};
