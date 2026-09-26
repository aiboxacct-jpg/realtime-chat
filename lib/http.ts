import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Send a JSON response. */
export function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

/** Read a JSON body. Vercel parses JSON automatically when the content type
 *  is application/json; fall back to manual parsing for anything else. */
export async function readJsonBody(req: VercelRequest): Promise<unknown> {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return undefined;
    }
  }
  // Raw stream fallback (shouldn't normally be needed on Vercel).
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Pull a Bearer token from the Authorization header. */
export function bearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

/** Guard the HTTP method; returns true when handled (wrong method). */
export function requireMethod(
  req: VercelRequest,
  res: VercelResponse,
  method: string,
): boolean {
  if (req.method === method) return false;
  json(res, 405, { error: "Method not allowed" });
  return true;
}
