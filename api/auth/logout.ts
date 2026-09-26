import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readJsonBody, requireMethod } from "../../lib/http.js";
import { deleteSession } from "../../lib/session.js";

// POST /api/auth/logout  { token } -> { ok: true }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (requireMethod(req, res, "POST")) return;
  try {
    const body = (await readJsonBody(req)) as { token?: unknown } | undefined;
    if (body && typeof body.token === "string") {
      await deleteSession(body.token);
    }
    json(res, 200, { ok: true });
  } catch (error) {
    console.error("logout failed", error);
    json(res, 200, { ok: true });
  }
}
