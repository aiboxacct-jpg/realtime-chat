// Typed fetch client for the same-origin /api/* endpoints.
// Response shapes mirror the original server actions exactly.

export type ChatUser = { id: number; username: string };

export type AuthResponse =
  | { ok: true; token: string; user: ChatUser }
  | { ok: false; code: "username_taken" | "invalid_credentials" | "invalid_input"; message: string };

export type SessionResponse =
  | { authenticated: true; user: ChatUser }
  | { authenticated: false };

export type ChatMessage = {
  id: number;
  body: string;
  created_at: string;
  user: ChatUser;
};

export type MessagesResponse =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; message: string };

export type PostResponse =
  | { ok: true; id: number }
  | { ok: false; message: string };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const api = {
  register: (args: { username: string; password: string }): Promise<AuthResponse> =>
    post("/api/auth/register", args),
  login: (args: { username: string; password: string }): Promise<AuthResponse> =>
    post("/api/auth/login", args),
  getSession: (args: { token: string }): Promise<SessionResponse> =>
    get("/api/auth/session", args.token),
  logout: (args: { token: string }): Promise<{ ok: true }> =>
    post("/api/auth/logout", args),
  listMessages: (args: { token: string }): Promise<MessagesResponse> =>
    get("/api/messages", args.token),
  postMessage: (args: { token: string; body: string }): Promise<PostResponse> =>
    post("/api/messages", args),
};
