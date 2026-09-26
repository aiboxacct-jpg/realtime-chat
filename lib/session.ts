import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { hashToken, newSessionToken } from "./password";
import { sessions, users } from "./schema";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionUser = { id: number; username: string };

export async function createSession(userId: number): Promise<string> {
  const token = newSessionToken();
  const tokenHash = await hashToken(token);
  const now = new Date();
  await getDb().insert(sessions).values({
    tokenHash,
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });
  return token;
}

export async function getUserForToken(token: string): Promise<SessionUser | null> {
  if (token.length < 40) return null;
  const tokenHash = await hashToken(token);
  const rows = await getDb()
    .select({
      id: users.id,
      username: users.username,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return { id: row.id, username: row.username };
}

export async function deleteSession(token: string): Promise<void> {
  if (token.length < 40) return;
  const tokenHash = await hashToken(token);
  await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
