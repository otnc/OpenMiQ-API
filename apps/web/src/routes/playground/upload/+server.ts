import type { RequestHandler } from "./$types.ts";
import { apiFetch } from "$lib/server/api.ts";

// A plain proxy for the playground's avatar/watermark file inputs to POST /api/uploads (or, with no apiKey field, the anonymous /api/playground/uploads) through — the browser's multipart body is forwarded byte-for-byte, and the response (the { url } JSON, or an error) is relayed back untouched. Exists so the playground page can call this from plain fetch() outside its main <form>, independently for either image field, rather than folding file uploads into the same form action that sends the actual quote.
export const POST: RequestHandler = async (event) => {
  const incoming = await event.request.formData().catch(() => null);
  const file = incoming?.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "invalid_request", issues: [{ message: "file is required" }] },
      { status: 400 },
    );
  }
  const apiKey = String(incoming?.get("apiKey") ?? "");

  const outgoing = new FormData();
  outgoing.append("file", file, file.name);

  const path = apiKey ? "/api/uploads" : "/api/playground/uploads";
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-API-Key"] = apiKey;

  const response = await apiFetch(event, path, {
    method: "POST",
    headers,
    body: outgoing,
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
};
