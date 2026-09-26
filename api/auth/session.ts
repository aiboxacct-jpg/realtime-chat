import type { VercelRequest, VercelResponse } from "@vercel/node";
import { bearerToken, json, requireMethod } from "../../lib/http";
import { getUserForToken } from "../../lib/session";

// GET /api/auth/session  (Authorization: Bearer <token>)
// -> { authenticated: true, user } | { authenticated: false }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (requireMethod(req, res, "GET")) return;
  try {
    const token = bearerToken(req);
    const user = token ? await getUserForToken(token) : null;
    json(res, 200, user ? { authenticated: true, user } : { authenticated: false });
  } catch (error) {
    console.error("session check failed", error);
    json(res, 200, { authenticated: false });
  }
}
