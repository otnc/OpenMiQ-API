import { ValidationError } from "@makeitaquote/utils/errors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenMiQ } from "./client.ts";
import { OpenMiQApiError } from "./errors.ts";

const BASE_URL = "http://localhost:9413";

function pngResponse(): Response {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  return new Response(bytes, {
    status: 200,
    headers: { "Content-Type": "image/png" },
  });
}

describe("OpenMiQ constructor", () => {
  it("requires an apiKey", () => {
    expect(() => new OpenMiQ({ apiKey: "", baseUrl: BASE_URL })).toThrow(
      ValidationError,
    );
    expect(() => new OpenMiQ({ baseUrl: BASE_URL } as never)).toThrow(
      ValidationError,
    );
  });

  it("requires a baseUrl — there is no default instance to fall back to", () => {
    expect(() => new OpenMiQ({ apiKey: "k", baseUrl: "" })).toThrow(
      ValidationError,
    );
    expect(() => new OpenMiQ({ apiKey: "k" } as never)).toThrow(
      ValidationError,
    );
  });
});

describe("OpenMiQ requests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the API key as X-API-Key and hits /api/quote by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(pngResponse());
    vi.stubGlobal("fetch", fetchMock);

    const buffer = await new OpenMiQ({
      apiKey: "openmiq_test123",
      baseUrl: BASE_URL,
    })
      .setText("hi")
      .setUsername("alice")
      .toBuffer();

    expect(buffer).toBeInstanceOf(Buffer);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/api/quote`);
    const headers = new Headers(init.headers);
    expect(headers.get("X-API-Key")).toBe("openmiq_test123");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ authorName: "alice", text: "hi" });
  });

  it("hits /api/fakequote when setFake() is used", async () => {
    const fetchMock = vi.fn().mockResolvedValue(pngResponse());
    vi.stubGlobal("fetch", fetchMock);

    await new OpenMiQ({ apiKey: "k", baseUrl: BASE_URL })
      .setText("hi")
      .setUsername("alice")
      .setFake()
      .toBuffer();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${BASE_URL}/api/fakequote`);
  });

  it("includes options only for the flags actually set", async () => {
    const fetchMock = vi.fn().mockResolvedValue(pngResponse());
    vi.stubGlobal("fetch", fetchMock);

    await new OpenMiQ({ apiKey: "k", baseUrl: BASE_URL })
      .setText("hi")
      .setUsername("alice")
      .setBold()
      .setLayout("side")
      .toBuffer();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.options).toEqual({ bold: true, layout: "side" });
  });

  it("includes watermark in the payload only when set, even as an empty string", async () => {
    const fetchMock = vi.fn().mockResolvedValue(pngResponse());
    vi.stubGlobal("fetch", fetchMock);

    await new OpenMiQ({ apiKey: "k", baseUrl: BASE_URL })
      .setText("hi")
      .setUsername("alice")
      .setWatermark("")
      .toBuffer();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.watermark).toBe("");
  });

  it("strips a trailing slash from baseUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue(pngResponse());
    vi.stubGlobal("fetch", fetchMock);

    await new OpenMiQ({ apiKey: "k", baseUrl: `${BASE_URL}/` })
      .setText("hi")
      .setUsername("alice")
      .toBuffer();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(`${BASE_URL}/api/quote`);
  });

  it("refuses to send before text/authorName are both set", async () => {
    await expect(
      new OpenMiQ({ apiKey: "k", baseUrl: BASE_URL }).toBuffer(),
    ).rejects.toThrow(ValidationError);
  });

  it("toURL() posts with options.hosted and returns the url from the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: `${BASE_URL}/api/images/abc` }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const url = await new OpenMiQ({ apiKey: "k", baseUrl: BASE_URL })
      .setText("hi")
      .setUsername("alice")
      .toURL();

    expect(url).toBe(`${BASE_URL}/api/images/abc`);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.options).toEqual({ hosted: true });
  });

  it("toBuffer({ hosted: true }) uploads then downloads the bytes back", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: `${BASE_URL}/api/images/abc` }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(pngResponse());
    vi.stubGlobal("fetch", fetchMock);

    const buffer = await new OpenMiQ({ apiKey: "k", baseUrl: BASE_URL })
      .setText("hi")
      .setUsername("alice")
      .toBuffer({ hosted: true });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`${BASE_URL}/api/images/abc`);
  });

  it("getUsage() parses the usage summary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          limit: 60,
          remaining: 59,
          resetAt: "2026-01-01T00:00:00.000Z",
          requestCount: 1,
          lastUsedAt: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const usage = await new OpenMiQ({
      apiKey: "k",
      baseUrl: BASE_URL,
    }).getUsage();
    expect(usage).toEqual({
      limit: 60,
      remaining: 59,
      resetAt: "2026-01-01T00:00:00.000Z",
      requestCount: 1,
      lastUsedAt: null,
    });
  });

  it("wraps a non-2xx response in OpenMiQApiError with the status attached", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = new OpenMiQ({ apiKey: "k", baseUrl: BASE_URL })
      .setText("hi")
      .setUsername("alice")
      .toBuffer();

    await expect(promise).rejects.toThrow(OpenMiQApiError);
    await promise.catch((error: OpenMiQApiError) => {
      expect(error.status).toBe(400);
      expect(error.endpoint).toBe("/api/quote");
    });
  });
});
