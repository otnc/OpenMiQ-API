import { createRoute, z, OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../config/env.ts";

const aboutResponseSchema = z.object({
  name: z.string(),
  version: z.string(),
  basedOn: z.object({
    name: z.string(),
    author: z.string(),
    url: z.url(),
  }),
  sourceUrl: z.url(),
  /** This instance's own Discord community server, if the deployment set one. */
  discordInviteUrl: z.url().nullable(),
});

const aboutRoute = createRoute({
  method: "get",
  path: "/api/about",
  summary: "Attribution and source information",
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: aboutResponseSchema } },
    },
  },
});

export function createAboutApp(env: Env) {
  return new OpenAPIHono().openapi(aboutRoute, (c) => {
    return c.json({
      name: "OpenMiQ-API",
      version: "0.1.0",
      basedOn: {
        name: "OpenMiQ",
        author: "otoneko.",
        url: "https://github.com/otnc/OpenMiQ",
      },
      sourceUrl: "https://github.com/otnc/OpenMiQ-API",
      discordInviteUrl: env.DISCORD_INVITE_URL ?? null,
    });
  });
}
