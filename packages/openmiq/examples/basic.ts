import { writeFile } from "node:fs/promises";
import { OpenMiQ } from "../src/index.ts";

const apiKey = process.env.OPENMIQ_API_KEY;
if (!apiKey) {
  throw new Error("Set OPENMIQ_API_KEY to an API key from your Web Console");
}

const miq = new OpenMiQ({ apiKey });

// One round trip, no image ever stored server-side.
const buffer = await miq
  .setText("Hello, world!")
  .setUsername("otoneko.")
  .setAvatar("https://github.com/otnc.png")
  .setTheme("sunset")
  .toBuffer();

await writeFile("quote.png", buffer);
console.log("Saved quote.png");

// Or get a hosted URL instead — the image is uploaded and a link comes back.
const url = await miq.toURL();
console.log("Hosted at:", url);

// Check how much of the rate-limit window is left for this key.
const usage = await miq.getUsage();
console.log(
  `Usage: ${usage.remaining}/${usage.limit}, resets ${usage.resetAt}`,
);
