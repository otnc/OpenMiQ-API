// Wipes every user record (and their applications/API keys) for a clean
// re-test of the whole signup flow. Deliberately narrow: bans and the
// admin_actions audit log are left alone, since those aren't "user" rows —
// a ban can exist for an identity that never had one, and the audit log is
// a historical record, not app state that blocks testing.
//
// Run from apps/api (matches DATABASE_URL's own relative-path convention,
// see packages/db/src/client.ts): `pnpm run reset-users -- --yes`
import { createDb, users, applications, apiKeys } from "@openmiq/db";

if (!process.argv.includes("--yes")) {
  console.error(
    "This deletes every user, application, and API key. Re-run with --yes to confirm:\n" +
      "  pnpm run reset-users -- --yes",
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/db.sqlite";
const db = createDb(databaseUrl);

// Children before parent — apiKeys/applications both reference users.id.
const deletedApiKeys = await db.delete(apiKeys).returning({ id: apiKeys.id });
const deletedApplications = await db
  .delete(applications)
  .returning({ id: applications.id });
const deletedUsers = await db.delete(users).returning({ id: users.id });

console.log(
  `Deleted ${deletedUsers.length} user(s), ${deletedApplications.length} application(s), ${deletedApiKeys.length} API key(s).`,
);
console.log(
  "Bans and the audit log were left untouched — clear those separately if you need to.",
);
