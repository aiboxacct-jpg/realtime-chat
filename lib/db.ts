import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | undefined;

/**
 * Lazily creates (and caches across warm invocations) the Drizzle client
 * for Turso. Configured only through env vars:
 *   TURSO_DATABASE_URL  - e.g. libsql://your-db.turso.io (or file:./local.db)
 *   TURSO_AUTH_TOKEN    - Turso auth token (not needed for file: URLs)
 */
export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Missing TURSO_DATABASE_URL environment variable. " +
        "Set it to your Turso database URL (and TURSO_AUTH_TOKEN).",
    );
  }
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = authToken ? createClient({ url, authToken }) : createClient({ url });
  cached = drizzle(client, { schema });
  return cached;
}
