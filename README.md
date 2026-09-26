# Real-time Chat (Vercel port)

A small shared chat room with username/password register & login, persistent
sessions, and near-real-time messages (the client polls every 1.5s).

This is a port of a React + server-actions app to a Vercel-native shape:

- **Frontend** — static Vite + React 19 SPA in `src/`, served from `/`.
- **Backend** — five Node serverless functions in `api/` (no SDK, plain
  `req`/`res` handlers) behind same-origin JSON endpoints.
- **Database** — Turso (SQLite in the cloud) via `@libsql/client` +
  `drizzle-orm`, schema in `lib/schema.ts`, migrations in `drizzle/`.

## Environment variables

| Variable             | Required | What it is                                              |
| -------------------- | -------- | ------------------------------------------------------- |
| `TURSO_DATABASE_URL` | yes      | Turso database URL, e.g. `libsql://my-chat.turso.io`    |
| `TURSO_AUTH_TOKEN`   | yes      | Auth token for the database (not needed for `file:` DBs) |

Copy `.env.example` to `.env` for local migration runs. Never commit real
values — set them in the Vercel dashboard (Project → Settings →
Environment Variables) instead.

## Create a free Turso database

1. Sign up at [turso.tech](https://turso.tech) (the free tier is plenty for
   this app).
2. Install the CLI (`curl -sSfL https://get.tur.so/install.sh | bash`) and
   log in with `turso auth login`.
3. Create a database: `turso db create realtime-chat`
4. Get the URL: `turso db show realtime-chat --url`
5. Mint a token: `turso db tokens create realtime-chat`
6. Put the URL and token in your `.env`, then run the migration:

```sh
npm install
npm run db:migrate
```

(The migration SQL in `drizzle/` was generated from `lib/schema.ts` with
`drizzle-kit generate`. If you change the schema, re-run
`npm run db:generate` and then `npm run db:migrate`.)

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In the [Vercel dashboard](https://vercel.com), **Add New → Project** and
   import the repo. Framework preset: **Vite** (auto-detected). No
   `vercel.json` is needed — the static client builds to `dist/` and the
   `api/` functions are picked up automatically.
3. Add the two environment variables (`TURSO_DATABASE_URL`,
   `TURSO_AUTH_TOKEN`) under Project → Settings → Environment Variables.
4. Hit **Deploy**. The app is live at your `*.vercel.app` URL — register an
   account and start chatting.

## API endpoints

| Method | Path                 | Body / auth                     | Returns                                      |
| ------ | -------------------- | ------------------------------- | -------------------------------------------- |
| POST   | `/api/auth/register` | `{ username, password }`        | `{ ok, token?, user? }`                      |
| POST   | `/api/auth/login`    | `{ username, password }`        | `{ ok, token?, user? }`                      |
| GET    | `/api/auth/session`  | `Authorization: Bearer <token>` | `{ authenticated, user? }`                   |
| POST   | `/api/auth/logout`   | `{ token }`                     | `{ ok: true }`                               |
| GET    | `/api/messages`      | `Authorization: Bearer <token>` | `{ ok, messages: [{ id, body, created_at, user }] }` |
| POST   | `/api/messages`      | `{ token, body }`               | `{ ok, id? }`                                |

Usernames: 3–20 chars, letters/numbers/underscores. Passwords: 8–72 chars
(hashed with PBKDF2-SHA256, 210k iterations). Sessions last 30 days.
Messages: 1–500 chars, latest 100 returned.

## Local development

```sh
npm run dev        # Vite dev server for the client
npm run typecheck  # tsc --noEmit over client + functions
npm run build      # production client build
```

For end-to-end local work (client + functions), use `vercel dev` from the
Vercel CLI instead of `npm run dev`.
