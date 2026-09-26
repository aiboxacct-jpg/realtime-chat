import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { json, readJsonBody, requireMethod } from "../../lib/http";
import { verifyPassword } from "../../lib/password";
import { createSession } from "../../lib/session";
import { users } from "../../lib/schema";
import {
  normalizeUsernameKey,
  validPassword,
  validUsername,
} from "../../lib/validation";

// POST /api/auth/login  { username, password }
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

    const usernameKey = normalizeUsernameKey(body.username as string);
    const rows = await getDb()
      .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.usernameKey, usernameKey))
      .limit(1);
    const user = rows[0];
    if (!user || !(await verifyPassword(body.password as string, user.passwordHash))) {
      json(res, 200, {
        ok: false,
        code: "invalid_credentials",
        message: "Username or password doesn’t match.",
      });
      return;
    }
    const token = await createSession(user.id);
    json(res, 200, { ok: true, token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error("login failed", error);
    json(res, 500, { ok: false, code: "invalid_input", message: "Please try again." });
  }
}
