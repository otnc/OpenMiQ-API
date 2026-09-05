import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { loadEnv } from "./config/env.ts";
import { aboutApp } from "./routes/about.ts";
import { createAuthApp } from "./routes/auth.ts";
import { createConsoleApp } from "./routes/console.ts";
import { sessionMiddleware } from "./middleware/session.ts";

const env = loadEnv();

const app = new OpenAPIHono();

app.use("*", sessionMiddleware(env));

app.route("/", aboutApp);
app.route("/", createAuthApp(env));
app.route("/", createConsoleApp(env));

app.doc("/api/docs/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "OpenMiQ-API",
    version: "0.1.0",
    description:
      "Based on OpenMiQ (https://github.com/otnc/OpenMiQ) by otoneko., with modifications for a Web API. Source: https://github.com/otnc/OpenMiQ-API",
  },
});
app.get("/api/docs", swaggerUI({ url: "/api/docs/openapi.json" }));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`OpenMiQ-API listening on http://localhost:${info.port}`);
});
