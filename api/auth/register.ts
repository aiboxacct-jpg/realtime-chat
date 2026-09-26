import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { json, readJsonBody, requireMethod } from "../../lib/http";
import { hashPassword } from "../../lib/password";
import { createSession } from "../../lib/session";
import { users } from "../../lib/schema";
import {
  normalizeUsernameKey,
  validPassword,
  validUsername,
} from "../../lib/validation";

// POST /api/auth/register  { username, password }
// -> { ok: true, token, user } | { ok: false, code, message }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (requireMethod(req, res, "POST")) return;
  try {
    const body = (await readJsonBody(req)) as
      | { username?: unknown; password?: unknown }
      | undefined;
    if (!body || !validUsername(body.username) || !validPassword(body.password)) {
      json(res, 400, {
        ok: false,
        code: "invalid_input",
        message: "Use 3–20 letters, numbers, or underscores and a password of 8+ characters.",
      });
      return;
    }

    const username = (body.username as string).trim();
    const usernameKey = normalizeUsernameKey(username);
    const db = getDb();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.usernameKey, usernameKey))
      .limit(1);
    if (existing.length > 0) {
      json(res, 200, {
        ok: false,
        code: "username_taken",
        message: "That username is already in the room. Try another.",
      });
      return;
    }

    const passwordHash = await hashPassword(body.password as string);
    try {
      const inserted = await db
        .insert(users)
        .values({ username, usernameKey, passwordHash })
        .returning({ id: users.id, username: users.username });
      const user = inserted[0];
      if (!user) {
        json(res, 200, {
          ok: false,
          code: "invalid_input",
          message: "We couldn’t create that account. Please try again.",
        });
        return;
      }
      const token = await createSession(user.id);
      json(res, 200, { ok: true, token, user });
    } catch {
      // Unique-constraint race on username_key.
      json(res, 200, {
        ok: false,
        code: "username_taken",
        message: "That username is already in the room. Try another.",
      });
    }
  } catch (error) {
    console.error("register failed", error);
    json(res, 500, { ok: false, code: "invalid_input", message: "Please try again." });
  }
}
