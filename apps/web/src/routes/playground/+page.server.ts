import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types.ts";
import { apiFetch } from "$lib/server/api.ts";

export interface PlaygroundResult {
  requestJson: string;
  status: number;
  imageDataUrl?: string;
  hostedUrl?: string;
  error?: unknown;
}

// A thin, transparent proxy: forwards exactly the body the client already
// built and showed as the "request JSON" preview to POST /api/quote or
// /api/fakequote, then relays back whatever came back — image bytes as a
// data: URL (form actions can only return serializable data, not a raw
// Response), the hosted { url } JSON as-is, or an error body untouched. The
// playground's whole point is showing the real request/response shape, so
// this must never rewrite either one.
export const actions: Actions = {
  send: async (event) => {
    const form = await event.request.formData();
    const apiKey = String(form.get("apiKey") ?? "");
    const fake = form.get("fake") === "true";
    const requestJson = String(form.get("requestJson") ?? "");

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

    const contentType = response.headers.get("content-type") ?? "";
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

    if (contentType.includes("application/json")) {
      const body = (await response.json()) as { url: string };
      const result: PlaygroundResult = {
        requestJson,
        status: response.status,
        hostedUrl: body.url,
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
