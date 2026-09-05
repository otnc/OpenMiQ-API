import { errorMessage, ValidationError } from "@makeitaquote/utils/errors";
import {
  createClient,
  HTTPError,
  type HttpClient,
  TimeoutError,
} from "@makeitaquote/utils/http";
import { USAGE_PATH } from "./endpoints.ts";
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
  normalizeAuthorAvatarUrl,
  normalizeAuthorName,
  normalizeFlag,
  normalizeFont,
  normalizeLayout,
  normalizeText,
  normalizeTheme,
  normalizeWatermark,
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

  setUsername(authorName: string): this {
    this.#data.authorName = normalizeAuthorName(authorName);
    return this;
  }

  /** The API only takes a URL, so raw image bytes are rejected here. */
  setAvatar(avatar: string | URL | null): this {
    this.#data.authorAvatarUrl = normalizeAuthorAvatarUrl(avatar);
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
   * Overrides the server's default watermark for this quote. `null` (the
   * default): let the server decide — its LOGO_PATH image, if configured.
   * Pass `""` to explicitly ask for no watermark.
   */
  setWatermark(watermark: string | null): this {
    this.#data.watermark = normalizeWatermark(watermark);
    return this;
  }

  /** Targets `/api/fakequote` instead of `/api/quote` for this quote — marks it as fabricated. */
  setFake(fake = true): this {
    this.#data.fake = normalizeFlag(fake, "fake") ?? false;
    return this;
  }

  setFromMessage(message: MessageLike, options?: MessageSourceOptions): this {
    const { theme, font, color, bold, layout, watermark, fake } = this.#data;
    this.#data = {
      ...fromMessage(message, options),
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
      fake,
    };
    return this;
  }

  /**
   * Reads a Misskey note the way `setFromMessage()` reads a Discord message.
   * MFM is stripped by default — see `NoteSourceOptions`.
   */
  setFromNote(note: NoteLike, options?: NoteSourceOptions): this {
    const { theme, font, color, bold, layout, watermark, fake } = this.#data;
    this.#data = {
      ...fromNote(note, options),
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
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
    const { theme, font, color, bold, layout, watermark, fake } = this.#data;
    this.#data = {
      ...fromTweet(tweet, options),
      theme,
      font,
      color,
      bold,
      layout,
      watermark,
      fake,
    };
    return this;
  }

  setFromObject(input: QuoteInput): this {
    this.#data = applyInput(this.#data, input);
    return this;
  }

  getData(): Readonly<QuoteData> {
    return { ...this.#data };
  }

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
   * then downloaded back, matching what `toURL()` does.
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
    let response: Response;
    try {
      response = await this.#http.post(`${this.#baseUrl}${path}`, {
        json: buildPayload(this.#data, false),
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
    let response: Response;
    try {
      response = await this.#http.post(`${this.#baseUrl}${path}`, {
        json: buildPayload(this.#data, true),
        ...this.#requestOptions(),
      });
    } catch (cause) {
      throw toApiError(cause, path, "Failed to generate quote");
    }
    const parsed = await this.#parseJson(response, path);
    return parseHostedResult(parsed, path);
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
