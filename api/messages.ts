import type { VercelRequest, VercelResponse } from "@vercel/node";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { bearerToken, json, readJsonBody } from "../lib/http";
import { getUserForToken } from "../lib/session";
import { messages, users } from "../lib/schema";
import { validMessageBody } from "../lib/validation";

// GET  /api/messages            (Authorization: Bearer <token>)
//   -> { ok: true, messages: [{ id, body, created_at, user }] } | { ok: false, message }
// POST /api/messages  { token, body }
//   -> { ok: true, id } | { ok: false, message }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const token = bearerToken(req);
      const currentUser = token ? await getUserForToken(token) : null;
      if (!currentUser) {
        json(res, 200, { ok: false, message: "Your session has ended. Sign in again." });
        return;
      }
      const rows = await getDb()
        .select({
          id: messages.id,
          body: messages.body,
          createdAt: messages.createdAt,
          userId: users.id,
          username: users.username,
        })
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .orderBy(desc(messages.id))
        .limit(100);
      json(res, 200, {
        ok: true,
        messages: rows.reverse().map((row) => ({
          id: row.id,
          body: row.body,
          created_at: row.createdAt.toISOString(),
          user: { id: row.userId, username: row.username },
        })),
      });
      return;
    }

    if (req.method === "POST") {
      const body = (await readJsonBody(req)) as
        | { token?: unknown; body?: unknown }
        | undefined;
      const token = typeof body?.token === "string" ? body.token : "";
      const user = await getUserForToken(token);
      if (!user) {
        json(res, 200, { ok: false, message: "Your session has ended. Sign in again." });
        return;
      }
      if (!validMessageBody(body?.body)) {
        json(res, 400, { ok: false, message: "Write something first (500 characters max)." });
        return;
      }
      const inserted = await getDb()
        .insert(messages)
        .values({ userId: user.id, body: (body!.body as string).trim() })
        .returning({ id: messages.id });
      const row = inserted[0];
      if (!row) {
        json(res, 200, { ok: false, message: "Message wasn’t sent. Try again." });
        return;
      }
      json(res, 200, { ok: true, id: row.id });
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("messages handler failed", error);
    json(res, 500, { ok: false, message: "Please try again." });
  }
}
