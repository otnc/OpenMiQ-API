# @makeitaquote/openmiq

Generate "Make it a Quote" images through the [OpenMiQ-API](https://github.com/otnc/OpenMiQ-API).

[![npm](https://img.shields.io/npm/v/@makeitaquote/openmiq)](https://www.npmjs.com/package/@makeitaquote/openmiq) [![License](https://img.shields.io/npm/l/@makeitaquote/openmiq)](LICENSE) [![Node](https://img.shields.io/node/v/@makeitaquote/openmiq)](https://www.npmjs.com/package/@makeitaquote/openmiq)

A thin, type-safe client for OpenMiQ-API's `/api/quote`, `/api/fakequote` and `/api/usage` endpoints — a fluent builder in the same style as its sibling packages [`@makeitaquote/voids`](https://www.npmjs.com/package/@makeitaquote/voids) and [`@makeitaquote/miqx`](https://www.npmjs.com/package/@makeitaquote/miqx).

```ts
import { OpenMiQ } from "@makeitaquote/openmiq";

const image = await new OpenMiQ({ apiKey: "sk_live_..." })
  .setText("hello world")
  .setUsername("otoneko.")
  .setAvatar("https://example.com/avatar.png")
  .setTheme("sunset")
  .toBuffer();
```

An API key is issued from an OpenMiQ-API instance's Web Console (see the [main repo's README](https://github.com/otnc/OpenMiQ-API#readme) for how to get one, or to self-host your own instance). By default this package talks to the copyright holder's own deployment at `https://miq.otnc.dev`; pass `baseUrl` to point it at a self-hosted instance instead.

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
new OpenMiQ({ apiKey })
  .setText("...")
  .setUsername("...")
  .setAvatar("https://...") // a URL only — the API doesn't accept raw image bytes
  .setTheme("sunset")       // any CSS color the renderer accepts
  .setFont("pop")
  .setColor()               // keep the avatar in color
  .setBold()
  .setLayout("side")        // "side" | "new"
  .setFake();                // targets /api/fakequote instead of /api/quote
```

`setFromObject()` accepts the same fields as a plain object, and `getData()`/`clone()` are available for inspecting or branching a builder in progress.

### From a Discord message, Misskey note, or tweet

```ts
miq.setFromMessage(message); // anything shaped like a discord.js Message
miq.setFromNote(note);       // a Misskey note, e.g. from misskey-js
miq.setFromTweet(tweet);     // see fromTwitterApiV2Tweet()/fromFxTwitterStatus() below
```

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

MIT — see [LICENSE](./LICENSE). This is a thin HTTP client and contains no code from OpenMiQ itself; the server it talks to by default (`https://miq.otnc.dev`) is a separate OpenMiQ-API deployment, licensed under AGPL-3.0-or-later with additional terms (see the [main repo](https://github.com/otnc/OpenMiQ-API)).
