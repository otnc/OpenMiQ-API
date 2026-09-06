import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { applications, adminActions, users, type Db } from "@openmiq/db";
import type { Env } from "../config/env.ts";
import { getDb } from "../db.ts";
import { requireSession } from "../middleware/session.ts";
import { requireAdmin } from "../middleware/admin.ts";
import {
  reviewApplication,
  notifyReviewResult,
} from "../services/applicationService.ts";
import {
  listUsers,
  findUserById,
  revokeUser,
  banUser,
  unbanByBanId,
} from "../services/userService.ts";
import { listBans } from "../services/banService.ts";
import { needsReconsent } from "../services/consentService.ts";
import { fetchDiscordUserById } from "../services/discordBotService.ts";
import type { SessionIdentity } from "../services/sessionService.ts";

type Variables = { identity: SessionIdentity | null };
type ApplicationStatus = (typeof applications.$inferSelect)["status"];
type UserStatus = (typeof users.$inferSelect)["status"];

async function handleReview(
  db: Db,
  env: Env,
  applicationId: string,
  action: "approve" | "deny",
  adminDiscordId: string,
) {
  const result = reviewApplication(db, applicationId, action, adminDiscordId);
  if (!result) return null;
  if (!result.alreadyReviewed) {
    await notifyReviewResult(env, result, action);
  }
  return result;
}

export function createAdminApp(env: Env) {
  const app = new Hono<{ Variables: Variables }>();
  const db = getDb(env);

  app.use("/api/admin/*", requireSession(), requireAdmin(env));

  app.get("/api/admin/applications", async (c) => {
    const status = c.req.query("status") as ApplicationStatus | undefined;
    const rows = status
      ? await db
          .select()
          .from(applications)
          .where(eq(applications.status, status))
      : await db.select().from(applications);
    // Same fields as the Discord review embed (reviewEmbed(), §6.1) — the
    // Web UI shows the same applicant identity there does.
    const withApplicant = await Promise.all(
      rows.map(async (application) => {
        const user = await findUserById(db, application.userId);
        const avatarUrl = user
          ? await fetchDiscordUserById(env.DISCORD_BOT_TOKEN, user.discordId)
              .then((discordUser) => discordUser.avatarUrl)
              .catch(() => null)
          : null;
        return {
          ...application,
          discordId: user?.discordId ?? null,
          discordUsername: user?.discordUsername ?? null,
          email: user?.email ?? null,
          avatarUrl,
        };
      }),
    );
    return c.json(withApplicant);
  });

  app.post("/api/admin/applications/:id/approve", async (c) => {
    const identity = c.get("identity")!;
    const result = await handleReview(
      db,
      env,
      c.req.param("id"),
      "approve",
      identity.discordId,
    );
    if (!result) return c.json({ error: "not_found" }, 404);
    return c.json({ status: result.application.status });
  });

  app.post("/api/admin/applications/:id/deny", async (c) => {
    const identity = c.get("identity")!;
    const result = await handleReview(
      db,
      env,
      c.req.param("id"),
      "deny",
      identity.discordId,
    );
    if (!result) return c.json({ error: "not_found" }, 404);
    return c.json({ status: result.application.status });
  });

  app.get("/api/admin/users", async (c) => {
    const status = c.req.query("status") as UserStatus | undefined;
    const rows = await listUsers(db, status);
    const withAvatars = await Promise.all(
      rows.map(async (user) => {
        const avatarUrl = await fetchDiscordUserById(
          env.DISCORD_BOT_TOKEN,
          user.discordId,
        )
          .then((discordUser) => discordUser.avatarUrl)
          .catch(() => null);
        return {
          ...user,
          avatarUrl,
          reconsentRequired: needsReconsent(env, user),
        };
      }),
    );
    return c.json(withAvatars);
  });

  app.post("/api/admin/users/:id/revoke", async (c) => {
    const identity = c.get("identity")!;
    const body = await c.req.json().catch(() => null);
    const reason =
      typeof body?.reason === "string" && body.reason.length > 0
        ? body.reason
        : undefined;
    const ok = await revokeUser(
      db,
      c.req.param("id"),
      identity.discordId,
      reason,
    );
    if (!ok) return c.json({ error: "not_found" }, 404);
    return c.json({ status: "revoked" });
  });

  app.post("/api/admin/users/:id/ban", async (c) => {
    const identity = c.get("identity")!;
    const body = await c.req.json().catch(() => null);
    const reason = body?.reason;
    if (typeof reason !== "string" || reason.length === 0) {
      return c.json({ error: "reason_required" }, 400);
    }
    const ok = await banUser(db, c.req.param("id"), reason, identity.discordId);
    if (!ok) return c.json({ error: "not_found" }, 404);
    return c.json({ status: "banned" });
  });

  app.get("/api/admin/bans", async (c) => {
    return c.json(await listBans(db));
  });

  app.post("/api/admin/bans/:id/unban", async (c) => {
    const identity = c.get("identity")!;
    const ok = await unbanByBanId(db, c.req.param("id"), identity.discordId);
    if (!ok) return c.json({ error: "not_found" }, 404);
    return c.json({ status: "unbanned" });
  });

  app.get("/api/admin/audit-log", async (c) => {
    return c.json(await db.select().from(adminActions));
  });

  return app;
}
