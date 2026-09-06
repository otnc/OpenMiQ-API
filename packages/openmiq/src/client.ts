import { errorMessage, ValidationError } from "@makeitaquote/utils/errors";
import {
  createClient,
  HTTPError,
  type HttpClient,
  TimeoutError,
} from "@makeitaquote/utils/http";
import { UPLOAD_PATH, USAGE_PATH } from "./endpoints.ts";
import { OpenMiQApiError } from "./errors.ts";
import { fromNote } from "./note.ts";
import {
  buildPayload,
  parseHostedResult,
  parseUsageResult,
  pathFor,
} from "./payload.ts";
import {
  applyInput,
  assertRenderable,
  emptyQuote,
  normalizeAuthorAvatar,
  normalizeAuthorName,
  normalizeAuthorUsername,
  normalizeFlag,
  normalizeFont,
  normalizeLayout,
  normalizeText,
  normalizeTheme,
  normalizeWatermarkValue,
} from "./quote.ts";
import { fromMessage } from "./source.ts";
import { fromTweet } from "./tweet.ts";
import type {
  MessageLike,
  MessageSourceOptions,
  NoteLike,
  NoteSourceOptions,
  OpenMiQOptions,
  QuoteData,
  QuoteInput,
  TweetLike,
  TweetSourceOptions,
  UsageResult,
} from "./types.ts";

/**
 * Builds a "Make it a Quote" image through an OpenMiQ-API instance.
 *
 * ```ts
 * const image = await new OpenMiQ({
 *   apiKey: "openmiq_...",
 *   baseUrl: "https://miq.example.com",
 * })
 *   .setText("hello world")
 *   .setUsername("otoneko.")
 *   .setAvatar("https://example.com/avatar.png")
 *   .setTheme("sunset")
 *   .toBuffer();
 * ```
 *
 * `baseUrl` is required — OpenMiQ-API is meant to be self-hosted, so there is
 * no single official instance this package could default to.
 */
export class OpenMiQ {
  #data: QuoteData = emptyQuote();
  #http: HttpClient;
  #apiKey: string;
  #baseUrl: string;
  #signal?: AbortSignal;

  constructor(options: OpenMiQOptions) {
    if (typeof options?.apiKey !== "string" || options.apiKey.trim() === "") {
      throw new ValidationError("apiKey is required", { field: "apiKey" });
    }
    if (typeof options?.baseUrl !== "string" || options.baseUrl.trim() === "") {
      throw new ValidationError("baseUrl is required", { field: "baseUrl" });
    }
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#signal = options.signal;
    this.#http = createClient({
      timeout: options.timeout ?? 15_000,
      retry: options.retry ?? 2,
      headers: {
        "X-API-Key": this.#apiKey,
        ...options.headers,
      },
    });
  }

  setText(text: string): this {
    this.#data.text = normalizeText(text);
    return this;
  }

  /** Sets the bold display-name line. Despite the method's name this is authorName on the wire, not the smaller "@username" line below it — see setAuthorUsername() for that one. */
  setUsername(authorName: string): this {
    this.#data.authorName = normalizeAuthorName(authorName);
    return this;
  }

  /** Sets the smaller "@username" line drawn under the display name. `null` (the default): draw the same text as setUsername() on both lines. */
  setAuthorUsername(username: string | null): this {
    this.#data.authorUsername = normalizeAuthorUsername(username);
    return this;
  }

  /** A string/URL sets an avatar by address; raw image bytes (Uint8Array/Buffer) are staged for upload instead — actually sent (POST /api/uploads, then that URL used as authorAvatarUrl) the next time toBuffer()/toURL() runs, not here. Either way, clears whichever form was set before. */
  setAvatar(avatar: string | URL | Uint8Array | null): this {
    const normalized = normalizeAuthorAvatar(avatar);
    this.#data.authorAvatarUrl = normalized.url;
    this.#data.authorAvatarRaw = normalized.raw;
    return this;
  }

  setTheme(theme: string | null): this {
    this.#data.theme = normalizeTheme(theme);
    return this;
  }

  setFont(font: string | null): this {
    this.#data.font = normalizeFont(font);
    return this;
  }

  setColor(color = true): this {
    this.#data.color = normalizeFlag(color, "color");
    return this;
  }

  setBold(bold = true): this {
    this.#data.bold = normalizeFlag(bold, "bold");
    return this;
  }

  setLayout(layout: "side" | "new" | null): this {
    this.#data.layout = normalizeLayout(layout);
    return this;
  }

  /**
   * Overrides the server's default watermark for this quote. `null` (the default): let the server decide — its LOGO_PATH image, if configured.
   * A string is drawn as text (pass `""` to explicitly ask for no watermark); a URL is drawn as an image instead; raw image bytes (Uint8Array/Buffer) are staged for upload and drawn as an image too, the same rule makeitaquote's own `setWatermark()` follows for the string/URL/bytes split — but actually sent (POST /api/uploads, then that URL used as watermarkUrl) the next time toBuffer()/toURL() runs, not here.
   * Either way, clears whichever form was set before.
   */
  setWatermark(watermark: string | URL | Uint8Array | null): this {
    const normalized = normalizeWatermarkValue(watermark);
    this.#data.watermark = normalized.text;
    this.#data.watermarkUrl = normalized.url;
    this.#data.watermarkRaw = normalized.raw;
    return this;
  }

  /** Targets `/api/fakequote` instead of `/api/quote` for this quote — marks it as fabricated. */
  setFake(fake = true): this {
    this.#data.fake = normalizeFlag(fake, "fake") ?? false;
    return this;
  }

  setFromMessage(message: MessageLike, options?: MessageSourceOptions): this {
    const {
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
      watermarkUrl,
      watermarkRaw,
      fake,
    } = this.#data;
    this.#data = {
      ...fromMessage(message, options),
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
      watermarkUrl,
      watermarkRaw,
      fake,
    };
    return this;
  }

  /**
   * Reads a Misskey note the way `setFromMessage()` reads a Discord message.
   * MFM is stripped by default — see `NoteSourceOptions`.
   */
  setFromNote(note: NoteLike, options?: NoteSourceOptions): this {
    const {
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
      watermarkUrl,
      watermarkRaw,
      fake,
    } = this.#data;
    this.#data = {
      ...fromNote(note, options),
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
      watermarkUrl,
      watermarkRaw,
      fake,
    };
    return this;
  }

  /**
   * Reads a tweet/post the way `setFromMessage()` reads a Discord message.
   * `TweetLike` has no adapter this package fetches through directly — see
   * `fromTwitterApiV2Tweet()`/`fromFxTwitterStatus()` in `./tweetAdapters.ts`.
   */
  setFromTweet(tweet: TweetLike, options?: TweetSourceOptions): this {
    const {
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
      watermarkUrl,
      watermarkRaw,
      fake,
    } = this.#data;
    this.#data = {
      ...fromTweet(tweet, options),
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
      watermarkUrl,
      watermarkRaw,
      fake,
    };
    return this;
  }

  setFromObject(input: QuoteInput): this {
    this.#data = applyInput(this.#data, input);
    return this;
  }

  /** A snapshot of the quote built so far. Mutating the result does not affect this builder. */
  getData(): Readonly<QuoteData> {
    return { ...this.#data };
  }

  /**
   * Branches this builder: the quote data (`setText()`, `setTheme()`, etc.) is copied, so the clone and the original can diverge from here on and each `.toBuffer()`/`.toURL()` independently.
   *
   * The underlying HTTP client and `signal` are shared, not copied — an `AbortController` passed as `signal` to the original's constructor still aborts requests made through the clone too.
   */
  clone(): OpenMiQ {
    const copy = new OpenMiQ({ apiKey: this.#apiKey, baseUrl: this.#baseUrl });
    copy.#data = { ...this.#data };
    copy.#http = this.#http;
    copy.#signal = this.#signal;
    return copy;
  }

  /**
   * Renders the quote and returns the image bytes.
   *
   * One round trip by default. Pass `{ hosted: true }` to go through the
   * hosted path instead — the image is uploaded to the API's storage first,
   * then downloaded back, matching what `toURL()` does. Either way, a raw
   * `setAvatar()`/`setWatermark()` adds one more round trip each, to POST
   * /api/uploads first — see those methods.
   */
  async toBuffer(options: { hosted?: boolean } = {}): Promise<Buffer> {
    assertRenderable(this.#data);
    const path = pathFor(this.#data);
    if (options.hosted) {
      const { url } = await this.#postForHosted(path);
      try {
        return await this.#http.getBuffer(url, this.#signal);
      } catch (cause) {
        throw toApiError(cause, path, "Failed to download the hosted image");
      }
    }
    const data = await this.#resolveUploads();
    let response: Response;
    try {
      response = await this.#http.post(`${this.#baseUrl}${path}`, {
        json: buildPayload(data, false),
        ...this.#requestOptions(),
      });
    } catch (cause) {
      throw toApiError(cause, path, "Failed to generate quote");
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Renders the quote and returns the URL the API hosts it at.
   *
   * Forces the hosted path for this one call — it does not change what a
   * later `toBuffer()` does.
   */
  async toURL(): Promise<string> {
    assertRenderable(this.#data);
    const path = pathFor(this.#data);
    const { url } = await this.#postForHosted(path);
    return url;
  }

  /** Fetches the current rate-limit window for this API key, without consuming a request. */
  async getUsage(): Promise<UsageResult> {
    let response: Response;
    try {
      response = await this.#http.get(
        `${this.#baseUrl}${USAGE_PATH}`,
        this.#requestOptions(),
      );
    } catch (cause) {
      throw toApiError(cause, USAGE_PATH, "Failed to fetch usage");
    }
    const parsed = await this.#parseJson(response, USAGE_PATH);
    return parseUsageResult(parsed, USAGE_PATH);
  }

  async #postForHosted(path: string): Promise<{ url: string }> {
    const data = await this.#resolveUploads();
    let response: Response;
    try {
      response = await this.#http.post(`${this.#baseUrl}${path}`, {
        json: buildPayload(data, true),
        ...this.#requestOptions(),
      });
    } catch (cause) {
      throw toApiError(cause, path, "Failed to generate quote");
    }
    const parsed = await this.#parseJson(response, path);
    return parseHostedResult(parsed, path);
  }

  /**
   * Uploads any pending raw avatar/watermark bytes (POST /api/uploads) and returns a copy of `#data` with authorAvatarRaw/watermarkRaw resolved into authorAvatarUrl/watermarkUrl — `#data` itself is untouched, so a raw `setAvatar()`/`setWatermark()` survives a `clone()` and gets re-uploaded (not reused) on each subsequent `toBuffer()`/`toURL()` call.
   */
  async #resolveUploads(): Promise<QuoteData> {
    let data = this.#data;
    if (data.authorAvatarRaw) {
      const url = await this.#upload(data.authorAvatarRaw);
      data = { ...data, authorAvatarUrl: url, authorAvatarRaw: null };
    }
    if (data.watermarkRaw) {
      const url = await this.#upload(data.watermarkRaw);
      data = { ...data, watermarkUrl: url, watermarkRaw: null };
    }
    return data;
  }

  async #upload(bytes: Uint8Array): Promise<string> {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(bytes)]), "upload");
    let response: Response;
    try {
      response = await this.#http.post(`${this.#baseUrl}${UPLOAD_PATH}`, {
        json: form,
        ...this.#requestOptions(),
      });
    } catch (cause) {
      throw toApiError(cause, UPLOAD_PATH, "Failed to upload image");
    }
    const parsed = await this.#parseJson(response, UPLOAD_PATH);
    return parseHostedResult(parsed, UPLOAD_PATH).url;
  }

  async #parseJson(response: Response, endpoint: string): Promise<unknown> {
    try {
      return await response.json();
    } catch (cause) {
      throw new OpenMiQApiError("The API did not return JSON", {
        endpoint,
        cause,
      });
    }
  }

  #requestOptions(): { signal?: AbortSignal } {
    return this.#signal ? { signal: this.#signal } : {};
  }
}

function toApiError(
  cause: unknown,
  endpoint: string,
  prefix: string,
): OpenMiQApiError {
  if (cause instanceof HTTPError) {
    const parsedBody = safeJsonParse(cause.body);
    return new OpenMiQApiError(`${prefix}: HTTP ${cause.response.status}`, {
      endpoint,
      status: cause.response.status,
      body: parsedBody ?? cause.body,
      cause,
    });
  }
  if (cause instanceof TimeoutError) {
    return new OpenMiQApiError(`${prefix}: request timed out`, {
      endpoint,
      cause,
    });
  }
  return new OpenMiQApiError(`${prefix}: ${errorMessage(cause)}`, {
    endpoint,
    cause,
  });
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
