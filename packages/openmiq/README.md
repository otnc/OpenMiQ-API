# @makeitaquote/openmiq

Generate "Make it a Quote" images through the [OpenMiQ-API](https://github.com/otnc/OpenMiQ-API).

[![npm](https://img.shields.io/npm/v/@makeitaquote/openmiq)](https://www.npmjs.com/package/@makeitaquote/openmiq) [![License](https://img.shields.io/npm/l/@makeitaquote/openmiq)](LICENSE) [![Node](https://img.shields.io/node/v/@makeitaquote/openmiq)](https://www.npmjs.com/package/@makeitaquote/openmiq)

A thin, type-safe client for OpenMiQ-API's `/api/quote`, `/api/fakequote` and `/api/usage` endpoints — a fluent builder in the same style as its sibling packages [`@makeitaquote/voids`](https://www.npmjs.com/package/@makeitaquote/voids) and [`@makeitaquote/miqx`](https://www.npmjs.com/package/@makeitaquote/miqx).

```ts
import { OpenMiQ } from "@makeitaquote/openmiq";

const image = await new OpenMiQ({
  apiKey: "openmiq_...",
  baseUrl: "https://miq.example.com", // the OpenMiQ-API instance to talk to
})
  .setText("hello world")
  .setUsername("otoneko.")
  .setAvatar("https://example.com/avatar.png")
  .setTheme("sunset")
  .toBuffer();
```

Both `apiKey` and `baseUrl` are required. OpenMiQ-API is meant to be self-hosted — there's no single official instance this package could default to — so `baseUrl` always has to point at the instance you're actually using, and an API key is issued from that instance's own Web Console (see the [main repo's README](https://github.com/otnc/OpenMiQ-API#readme) for how to get one, or to self-host your own instance).

## Install

```bash
npm install @makeitaquote/openmiq
```

## Usage

### Output

```ts
await miq.toBuffer();              // PNG bytes, one round trip
await miq.toBuffer({ hosted: true }); // uploads, then downloads the bytes back
await miq.toURL();                 // uploads, returns the hosted URL only
await miq.getUsage();              // { limit, remaining, resetAt, requestCount, lastUsedAt }
```

### Building a quote

```ts
new OpenMiQ({ apiKey, baseUrl })
  .setText("...")
  .setUsername("...")         // the bold display-name line
  .setAuthorUsername("...")   // the smaller "@username" line underneath — defaults to the same text as setUsername() when unset
  .setAvatar("https://...")  // a URL/URL object, or raw image bytes (Uint8Array/Buffer) to upload directly
  .setTheme("sunset")        // any CSS color the renderer accepts
  .setFont("pop")
  .setColor()                // keep the avatar in color
  .setBold()
  .setLayout("side")         // "side" | "new"
  .setWatermark("...")       // a string is drawn as text (overrides the server's default watermark — its LOGO_PATH image, if set; "" for none); a URL or raw bytes are drawn as an image instead
  .setFake();                 // targets /api/fakequote instead of /api/quote
```

`setFromObject()` accepts the same fields as a plain object, and `getData()`/`clone()` are available for inspecting or branching a builder in progress.

Raw avatar/watermark bytes aren't embedded in the `/api/quote` request itself — the request stays a small JSON body no matter the image size, and a reverse proxy in front of a self-hosted instance never has to be reconfigured to accept a bigger one. Each `toBuffer()`/`toURL()` call `POST`s them to `/api/uploads` first (one extra round trip per raw image) and sends the URL it gets back as `authorAvatarUrl`/`watermarkUrl` instead.

### From a Discord message, Misskey note, or tweet

```ts
miq.setFromMessage(message); // anything shaped like a discord.js Message
miq.setFromNote(note);       // a Misskey note, e.g. from misskey-js
miq.setFromTweet(tweet);     // see fromTwitterApiV2Tweet()/fromFxTwitterStatus() below
```

Each of these sets `authorUsername` too — the account's own handle (Discord's `author.username`, a Misskey note's `user.username`/`user.host`, or the tweet author's `username`) — regardless of which display name option was picked, so the display-name and username lines never end up showing the same text by accident.

These read structurally — no dependency on `discord.js`, `misskey-js`, or a Twitter/X client is required. For a tweet, adapt a real API response first:

```ts
import { fromTwitterApiV2Tweet, fromFxTwitterStatus } from "@makeitaquote/openmiq";

miq.setFromTweet(fromTwitterApiV2Tweet(tweet, includes));
miq.setFromTweet(fromFxTwitterStatus(status));
```

## Errors

- `ValidationError` — an input failed a type, range or presence check, before any request was sent.
- `OpenMiQApiError` — the API rejected or failed a request. Carries `status`, `body` and `endpoint`.
- Both extend `MiQError`, shared with `@makeitaquote/voids`/`@makeitaquote/miqx` — `catch (e) { if (e instanceof MiQError) ... }` catches any of the three.

## Author

otoneko. https://github.com/otnc

## License

MIT — see [LICENSE](./LICENSE). This is a thin HTTP client and contains no code from OpenMiQ itself; whatever OpenMiQ-API instance you point `baseUrl` at is a separate deployment, licensed under AGPL-3.0-or-later with additional terms (see the [main repo](https://github.com/otnc/OpenMiQ-API)).
